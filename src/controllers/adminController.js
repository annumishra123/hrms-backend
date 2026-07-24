const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const { Payroll } = require('../models/Payroll');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const todayStr = () => new Date().toISOString().split('T')[0];

// @desc High-level admin dashboard numbers
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const totalEmployees = await User.countDocuments({ isActive: true });

  const presentToday = await Attendance.countDocuments({ date: todayStr(), status: 'present' });
  const onLeaveToday = await Leave.countDocuments({
    status: 'approved',
    fromDate: { $lte: new Date() },
    toDate: { $gte: new Date() },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newHires = await User.countDocuments({ dateOfJoining: { $gte: thirtyDaysAgo } });

  const now = new Date();
  const payrollAgg = await Payroll.aggregate([
    { $match: { month: now.getMonth() + 1, year: now.getFullYear(), status: { $in: ['processed', 'paid'] } } },
    { $group: { _id: null, totalPayout: { $sum: '$netPay' } } },
  ]);

  res.json({
    success: true,
    data: {
      totalEmployees,
      presentToday,
      onLeaveToday,
      newHires,
      monthlyPayrollTotal: payrollAgg[0]?.totalPayout || 0,
    },
  });
});

// @desc Attendance summary trend for last N days (for charts)
exports.getAttendanceTrend = asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 7);
  const results = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const present = await Attendance.countDocuments({ date: dateStr, status: 'present' });
    const absent = await Attendance.countDocuments({ date: dateStr, status: 'absent' });
    results.push({ date: dateStr, present, absent });
  }

  res.json({ success: true, data: results });
});

// @desc Department-wise headcount (for org chart / analytics)
exports.getDepartmentBreakdown = asyncHandler(async (req, res) => {
  const breakdown = await User.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$department', employeeCount: { $sum: 1 } } },
    { $sort: { employeeCount: -1 } },
  ]);
  res.json({ success: true, data: breakdown });
});

// @desc Simple org chart - manager -> direct reports tree
exports.getOrgChart = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true }).select('name employeeId designation department manager profilePhoto');

  const byId = {};
  users.forEach((u) => (byId[u._id] = { ...u.toObject(), directReports: [] }));

  const roots = [];
  users.forEach((u) => {
    if (u.manager && byId[u.manager]) {
      byId[u.manager].directReports.push(byId[u._id]);
    } else {
      roots.push(byId[u._id]);
    }
  });

  res.json({ success: true, data: roots });
});



exports.deactivateUser = asyncHandler(async (req, res) => {
   
  const { userId } = req.params; 
  const { isActive } = req.body; 
  const user = await User.findById(userId).select("+refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.isActive = isActive;
  user.refreshToken = undefined;
  await user.save();
  const io = req.app.get("io");

  
  if (user.socketId) {
    io.to(user.socketId).emit("force_logout", {
      message: "Your account has been deactivated by Admin.",
    });
    user.socketId = null;
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: `User ${isActive ? "activated" : "deactivated"} successfully.`,
  });
});