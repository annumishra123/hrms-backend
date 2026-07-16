const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    earnings: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      otherAllowance: { type: Number, default: 0 },
    },
    deductions: {
      pf: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
    },
    grossSalary: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    paidOn: { type: Date },
    status: { type: String, enum: ['draft', 'processed', 'paid'], default: 'draft' },
  },
  { timestamps: true }
);

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

payrollSchema.pre('save', function (next) {
  const e = this.earnings;
  const d = this.deductions;
  this.grossSalary = (e.basic || 0) + (e.hra || 0) + (e.specialAllowance || 0) + (e.otherAllowance || 0);
  this.netPay = this.grossSalary - ((d.pf || 0) + (d.professionalTax || 0) + (d.tds || 0));
  next();
});

const expenseClaimSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, enum: ['Travel', 'Food', 'Accommodation', 'Office Supplies', 'Other'], default: 'Other' },
    vendor: { type: String },
    amount: { type: Number, required: true },
    expenseDate: { type: Date, required: true },
    receiptUrl: { type: String },
    ocrExtractedText: { type: String }, // raw OCR output for audit
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'reimbursed'], default: 'pending' },
  },
  { timestamps: true }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Payroll:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         employee: { type: string }
 *         month: { type: integer, example: 5 }
 *         year: { type: integer, example: 2026 }
 *         earnings:
 *           type: object
 *           properties:
 *             basic: { type: number }
 *             hra: { type: number }
 *             specialAllowance: { type: number }
 *             otherAllowance: { type: number }
 *         deductions:
 *           type: object
 *           properties:
 *             pf: { type: number }
 *             professionalTax: { type: number }
 *             tds: { type: number }
 *         grossSalary: { type: number }
 *         netPay: { type: number }
 *         status: { type: string, enum: [draft, processed, paid] }
 *     ExpenseClaim:
 *       type: object
 *       required: [amount, expenseDate]
 *       properties:
 *         _id: { type: string }
 *         employee: { type: string }
 *         category: { type: string, enum: [Travel, Food, Accommodation, "Office Supplies", Other] }
 *         vendor: { type: string, example: Amazon }
 *         amount: { type: number, example: 1299 }
 *         expenseDate: { type: string, format: date }
 *         receiptUrl: { type: string }
 *         status: { type: string, enum: [pending, approved, rejected, reimbursed] }
 */
module.exports = {
  Payroll: mongoose.model('Payroll', payrollSchema),
  ExpenseClaim: mongoose.model('ExpenseClaim', expenseClaimSchema),
};
