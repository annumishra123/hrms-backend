const mongoose = require("mongoose");

const payslipSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    empId: { type: String, required: true },
    name: { type: String, required: true },
    designation: { type: String },
    avatar: { type: String },

    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },

    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
    // Attendance summary 
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    lopDays: { type: Number, default: 0 },
    payableDays: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["draft", "processed", "paid"],
      default: "processed",
    },

    runId: { type: mongoose.Schema.Types.ObjectId, ref: "PayrollRun" },
  },
  { timestamps: true }
);

// Ek employee ka ek month me sirf ek hi payslip bane
payslipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Payslip", payslipSchema);