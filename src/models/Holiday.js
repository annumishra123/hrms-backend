const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['Public', 'Optional', 'Restricted'], default: 'Public' },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

holidaySchema.index({ date: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);