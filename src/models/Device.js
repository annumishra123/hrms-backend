const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String, // unique device identifier (from app, e.g. expo device id / installationId)
      required: true,
    },
    name: {
      type: String, // "iPhone 14 Pro", "Samsung Galaxy S23"
      required: true,
    },
    type: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: 'android',
    },
    location: {
      type: String, // "Kanpur, India" — IP-based geolocation se fill karna
      default: 'Unknown',
    },
    ip: {
      type: String,
    },
    refreshToken: {
      type: String, // is device ka refresh token, revoke karne ke liye
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

deviceSchema.index({ user: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model('Device', deviceSchema);