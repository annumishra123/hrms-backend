const mongoose = require('mongoose');

const regularizeRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD' format 
      required: true,
    },
    reason: {
      type: String,
      enum: ['forgot_checkin', 'forgot_checkout', 'wrong_time', 'wfh_not_marked', 'other'],
      required: true,
    },
    requestedCheckInTime: { type: String, default: null }, // 'HH:MM'
    requestedCheckOutTime: { type: String, default: null }, // 'HH:MM'
    note: { type: String, required: true },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    managerComment: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true } 
);

// Ek employee same date ke liye baar-baar duplicate PENDING request na daale
regularizeRequestSchema.index({ employee: 1, date: 1, status: 1 });

module.exports = mongoose.model('RegularizeRequest', regularizeRequestSchema);