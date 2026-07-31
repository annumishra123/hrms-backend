const { Expo } = require('expo-server-sdk');
const Device = require('../models/Device');
const Notification = require('../models/Notification');
const User = require('../models/User');

const expo = new Expo();

/**
 * Ek user ke saare devices par notification bhejta hai (aapka existing function — waisa hi hai)
 */
async function sendPushToUser(userId, title, body, data = {}) {
  console.log('🔔 sendPushToUser called for user:', userId);
  const notification = await Notification.create({ user: userId, title, body, data });
  console.log('✅ Notification saved to DB');

  const devices = await Device.find({ user: userId, pushToken: { $ne: null } });
  console.log('🔔 Devices found with pushToken:', devices.length);

  if (devices.length === 0) {
    console.log('❌ No devices with push token found for this user!');
  } else {
    const messages = [];
    for (const device of devices) {
      if (!Expo.isExpoPushToken(device.pushToken)) {
        console.log('❌ Invalid Expo push token, skipping:', device.pushToken);
        continue;
      }
      messages.push({ to: device.pushToken, sound: 'default', title, body, data });
    }

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        console.error('Push send error:', err);
      }
    }
  }

  return notification;
}

/**
 * 🆕 Real-time socket emit + push, ek specific user ko
 * @param {Object} io - socket.io instance
 */
async function notifyUser(io, userId, title, body, data = {}) {
  const notification = await sendPushToUser(userId, title, body, data);

  // Real-time socket — user ka current socketId nikaalo
  const user = await User.findById(userId);
  if (user?.socketId) {
    io.to(user.socketId).emit('notification:new', notification);
    console.log('📡 Real-time notification sent via socket to:', userId);
  } else {
    console.log('⚪ User not online (no socketId), only push+DB done');
  }

  return notification;
}

/**
 * 🆕 Saare Admins ko notification bhejo (push + DB + real-time socket)
 */
async function notifyAdmins(io, title, body, data = {}) {
  const admins = await User.find({ role: 'admin' }); // apna exact role field/value confirm kar lo
  console.log('🔔 Notifying admins, count:', admins.length);

  const results = [];
  for (const admin of admins) {
    const notification = await sendPushToUser(admin._id, title, body, data);
    results.push(notification);

    if (admin.socketId) {
      io.to(admin.socketId).emit('notification:new', notification);
      console.log('📡 Real-time sent to admin:', admin._id.toString());
    }
  }

  return results;
}

module.exports = { sendPushToUser, notifyUser, notifyAdmins };