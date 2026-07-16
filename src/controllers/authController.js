const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

// @desc Register new employee
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, designation, department } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const user = await User.create({ name, email, password, phone, role, designation, department });

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Employee registered successfully',
    data: { user: sanitize(user), accessToken, refreshToken },
  });
});

// @desc Login with email/password
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'Account has been deactivated. Contact HR.');

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: sanitize(user), accessToken, refreshToken },
  });
});

// @desc Refresh access token using refresh token
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, 'Refresh token is required');

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, 'Refresh token does not match or user not found');
  }

  const accessToken = signAccessToken(user._id);
  res.json({ success: true, data: { accessToken } });
});

// @desc Request OTP for 2FA (mock generation - integrate SMS/WhatsApp gateway here)
exports.requestOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'No account found with this email');

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  user.otp = otp;
  user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
  await user.save({ validateBeforeSave: false });

  // TODO: integrate Twilio/MSG91/WhatsApp Business API to actually send the OTP
  res.json({
    success: true,
    message: 'OTP generated. In production this is sent via SMS/WhatsApp, not returned in response.',
    devOnlyOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
  });
});

// @desc Verify OTP
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email }).select('+otp +otpExpires');
  if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }
  user.otp = undefined;
  user.otpExpires = undefined;
  user.mfaEnabled = true;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'OTP verified successfully' });
});

// @desc Get logged-in user profile
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: sanitize(req.user) });
});

// @desc Logout - invalidate refresh token
exports.logout = asyncHandler(async (req, res) => {
  req.user.refreshToken = undefined;
  await req.user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Logged out successfully' });
});

function sanitize(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.refreshToken;
  delete obj.otp;
  delete obj.otpExpires;
  return obj;
}
