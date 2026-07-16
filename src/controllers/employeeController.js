const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// @desc Get all employees (HR/Admin) with pagination + search
exports.getEmployees = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', department, role } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }
  if (department) query.department = department;
  if (role) query.role = role;

  const employees = await User.find(query)
    .select('-password -refreshToken -otp -otpExpires')
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort('-createdAt');

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: employees,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  });
});

// @desc Get single employee by id
exports.getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await User.findById(req.params.id).select('-password -refreshToken -otp -otpExpires');
  if (!employee) throw new ApiError(404, 'Employee not found');
  res.json({ success: true, data: employee });
});

// @desc Update own profile / employee record
exports.updateEmployee = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'phone', 'profilePhoto', 'designation', 'department', 'manager'];
  const targetId = req.params.id || req.user._id;

  // Employees can only edit their own basic info; HR/Admin can edit anyone
  if (String(targetId) !== String(req.user._id) && !['hr', 'admin'].includes(req.user.role)) {
    throw new ApiError(403, 'You are not permitted to update this employee record');
  }

  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const employee = await User.findByIdAndUpdate(targetId, updates, { new: true, runValidators: true }).select(
    '-password -refreshToken -otp -otpExpires'
  );
  if (!employee) throw new ApiError(404, 'Employee not found');

  res.json({ success: true, message: 'Profile updated successfully', data: employee });
});

// @desc Activate/deactivate an employee (HR/Admin)
exports.setEmployeeActiveStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const employee = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select(
    '-password -refreshToken'
  );
  if (!employee) throw new ApiError(404, 'Employee not found');
  res.json({ success: true, message: `Employee ${isActive ? 'activated' : 'deactivated'}`, data: employee });
});

// @desc Update salary structure (HR/Admin)
exports.updateSalaryStructure = asyncHandler(async (req, res) => {
  const employee = await User.findByIdAndUpdate(req.params.id, { salary: req.body }, { new: true, runValidators: true }).select(
    '-password -refreshToken'
  );
  if (!employee) throw new ApiError(404, 'Employee not found');
  res.json({ success: true, message: 'Salary structure updated', data: employee });
});
