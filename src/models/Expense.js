const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ['Food', 'Travel', 'Fuel', 'Accommodation', 'Office', 'Internet', 'Other'],
      default: 'Other',
    },
    date: { type: Date, required: true },
    notes: { type: String, trim: true, default: '' },
    imageUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '' },
  },
  { timestamps: true }
);

expenseSchema.index({ employee: 1, status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);