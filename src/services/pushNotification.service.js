const { Expo } = require('expo-server-sdk');
const Device = require('../models/Device');
const Notification = require('../models/Notification'); // niche banayenge

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
  await Notification.create({ user: userId, title, body, data });

  // Step 2: Us user ke saare devices ke push tokens nikalo
  const devices = await Device.find({ user: userId, pushToken: { $ne: null } });
  if (devices.length === 0) return; // koi device registered nahi hai

  const messages = [];
  for (const device of devices) {
    if (!Expo.isExpoPushToken(device.pushToken)) continue; // invalid token skip
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