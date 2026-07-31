const { Expo } = require('expo-server-sdk');
const Device = require('../models/Device');
const Notification = require('../models/Notification'); 

const expo = new Expo();

/**
 * Ek user ke saare devices par notification bhejta hai
 * @param {String} userId
 * @param {String} title
 * @param {String} body
 * @param {Object} data - extra info (jaise { type: 'leave', leaveId: '...' })
 */
async function sendPushToUser(userId, title, body, data = {}) {
  // Step 1: DB mein history save karo (in-app notification list ke liye)
  console.log('🔔 sendPushToUser called for user:', userId);
  await Notification.create({ user: userId, title, body, data });
  console.log('✅ Notification saved to DB');

  // Step 2: Us user ke saare devices ke push tokens nikalo
  const devices = await Device.find({ user: userId, pushToken: { $ne: null } });
  console.log('🔔 Devices found with pushToken:', devices.length);
  console.log('🔔 Device tokens:', devices.map(d => d.pushToken));

  if (devices.length === 0) {
    console.log('❌ No devices with push token found for this user!');
    return;
  }

  const messages = [];
  for (const device of devices) {
    if (!Expo.isExpoPushToken(device.pushToken)) {
      console.log('❌ Invalid Expo push token, skipping:', device.pushToken);
      continue;
    }
    messages.push({
      to: device.pushToken,
      sound: 'default',
      title,
      body,
      data,
    });
  }

  // Step 3: Expo ko batches mein bhejo (Expo max 100 per batch allow karta hai)
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error('Push send error:', err);
    }
  }
}

module.exports = { sendPushToUser };