const Leave = require('../models/Leave');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const typeToBalanceKey = { CL: 'casual', EL: 'earned', SL: 'sick', PL: 'privilege' };

function calcDays(from, to) {
  const ms = new Date(to) - new Date(from);
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

// @desc Apply for leave
exports.applyLeave = asyncHandler(async (req, res) => {
  const { leaveType, fromDate, toDate, reason } = req.body;
  if (!leaveType || !fromDate || !toDate || !reason) {
    throw new ApiError(400, 'leaveType, fromDate, toDate and reason are required');
  }

  const numberOfDays = calcDays(fromDate, toDate);
  if (numberOfDays <= 0) throw new ApiError(400, 'toDate must be on/after fromDate');

  const balanceKey = typeToBalanceKey[leaveType];
  if (balanceKey && req.user.leaveBalance[balanceKey] < numberOfDays) {
    throw new ApiError(400, `Insufficient ${leaveType} balance. Available: ${req.user.leaveBalance[balanceKey]} day(s)`);
  }

  const leave = await Leave.create({
    employee: req.user._id,
    leaveType,
    fromDate,
    toDate,
    numberOfDays,
    reason,
    approver: req.user.manager || undefined,
  });

  res.status(201).json({ success: true, message: 'Leave application submitted', data: leave });
});

// @desc Get my leave applications
exports.getMyLeaves = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = { employee: req.user._id };
  if (status) query.status = status;
  const leaves = await Leave.find(query).sort('-createdAt');
  res.json({ success: true, data: leaves, leaveBalance: req.user.leaveBalance });
});

// @desc Get pending/approved/rejected leave requests for manager's team
exports.getTeamLeaves = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const teamMemberIds = await User.find({ manager: req.user._id }).distinct('_id');

  const query = { employee: { $in: teamMemberIds } };
  if (status !== 'all') query.status = status;

  const leaves = await Leave.find(query).populate('employee', 'name employeeId designation profilePhoto').sort('-createdAt');
  res.json({ success: true, data: leaves });
});

// @desc Approve or reject a leave request (Manager/HR)
exports.actOnLeave = asyncHandler(async (req, res) => {
  const { action, comment } = req.body; // action: 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) throw new ApiError(400, "action must be 'approve' or 'reject'");

  const leave = await Leave.findById(req.params.id);
  if (!leave) throw new ApiError(404, 'Leave request not found');
  if (leave.status !== 'pending') throw new ApiError(409, `Leave already ${leave.status}`);

  leave.status = action === 'approve' ? 'approved' : 'rejected';
  leave.approver = req.user._id;
  leave.approverComment = comment;
  leave.actedAt = new Date();
  await leave.save();

  if (action === 'approve') {
    const balanceKey = typeToBalanceKey[leave.leaveType];
    if (balanceKey) {
      await User.findByIdAndUpdate(leave.employee, {
        $inc: { [`leaveBalance.${balanceKey}`]: -leave.numberOfDays },
      });
    }
  }

  res.json({ success: true, message: `Leave ${leave.status}`, data: leave });
});

// @desc Cancel own pending leave
exports.cancelLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, employee: req.user._id });
  if (!leave) throw new ApiError(404, 'Leave request not found');
  if (leave.status !== 'pending') throw new ApiError(409, 'Only pending leave requests can be cancelled');

  leave.status = 'cancelled';
  await leave.save();
  res.json({ success: true, message: 'Leave request cancelled', data: leave });
});

// @desc Company/team leave calendar for a given month
exports.getLeaveCalendar = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const leaves = await Leave.find({
    status: 'approved',
    fromDate: { $lt: end },
    toDate: { $gte: start },
  }).populate('employee', 'name employeeId department');

  res.json({ success: true, data: leaves });
});
