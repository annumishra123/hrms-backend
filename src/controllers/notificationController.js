const Device = require('../models/Device');
const Notification = require('../models/Notification');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// POST /api/devices/push-token
// App se aata hai jab bhi user login ke baad push permission deta hai
exports.registerPushToken = asyncHandler(async (req, res) => {
  const { pushToken } = req.body;
  const deviceId = req.headers['x-device-id'];

  if (!pushToken || !deviceId) {
    throw new ApiError(400, 'pushToken and x-device-id header are required');
  }

  const device = await Device.findOneAndUpdate(
    { user: req.user._id, deviceId },
    { pushToken },
    { new: true }
  );

  if (!device) throw new ApiError(404, 'Device not found — login again to register it');

  res.json({ success: true, message: 'Push token registered' });
});

// GET /api/notifications
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ success: true, notifications });
});

// PATCH /api/notifications/:id/read
exports.markAsRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true }
  );
  res.json({ success: true });
});