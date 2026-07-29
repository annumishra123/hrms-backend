const Device = require('../models/Device');

// GET /api/user/devices
exports.getDevices = async (req, res) => {
  try {
    const userId = req.user._id; // auth middleware se aata hai
    const currentDeviceId = req.headers['x-device-id']; // app se bhejna hoga

    const devices = await Device.find({ user: userId }).sort({ lastActiveAt: -1 });

    const formatted = devices.map((d) => ({
      id: d._id,
      name: d.name,
      type: d.type,
      location: d.location,
      lastActive: formatLastActive(d.lastActiveAt),
      isCurrent: d.deviceId === currentDeviceId,
    }));

    return res.status(200).json({
      success: true,
      message: 'Devices fetched successfully',
      data: formatted,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'DEVICES_FETCH_FAILED',
      message: 'Failed to fetch devices',
    });
  }
};

// DELETE /api/user/devices/:id
exports.removeDevice = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const currentDeviceId = req.headers['x-device-id'];

    const device = await Device.findOne({ _id: id, user: userId });

    if (!device) {
      return res.status(404).json({
        success: false,
        code: 'DEVICE_NOT_FOUND',
        message: 'Device not found',
      });
    }

    if (device.deviceId === currentDeviceId) {
      return res.status(400).json({
        success: false,
        code: 'CANNOT_REMOVE_CURRENT',
        message: 'Cannot remove the device you are currently using',
      });
    }

    await Device.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: 'Device removed successfully',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'DEVICE_REMOVE_FAILED',
      message: 'Failed to remove device',
    });
  }
};

// POST /api/user/devices/logout-all
exports.logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentDeviceId = req.headers['x-device-id'];

    await Device.deleteMany({
      user: userId,
      deviceId: { $ne: currentDeviceId },
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out from all other devices',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'LOGOUT_ALL_FAILED',
      message: 'Failed to logout other devices',
    });
  }
};

function formatLastActive(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Active now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}