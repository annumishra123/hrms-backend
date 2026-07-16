const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    leaveType: {
      type: String,
      enum: ['CL', 'EL', 'SL', 'ML', 'PL', 'CO', 'LWP', 'WFH', 'SRA', 'Bereavement', 'Unpaid', 'OptionalHoliday'],
      required: true,
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    numberOfDays: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverComment: { type: String },
    actedAt: { type: Date },
  },
  { timestamps: true }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Leave:
 *       type: object
 *       required: [leaveType, fromDate, toDate, reason]
 *       properties:
 *         _id: { type: string }
 *         employee: { type: string }
 *         leaveType: { type: string, enum: [CL, EL, SL, ML, PL, CO, LWP, WFH, SRA, Bereavement, Unpaid, OptionalHoliday] }
 *         fromDate: { type: string, format: date }
 *         toDate: { type: string, format: date }
 *         numberOfDays: { type: number }
 *         reason: { type: string, example: Family function }
 *         status: { type: string, enum: [pending, approved, rejected, cancelled] }
 *         approverComment: { type: string }
 */
module.exports = mongoose.model('Leave', leaveSchema);
