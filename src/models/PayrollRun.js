const mongoose = require("mongoose");

const payrollRunSchema = new mongoose.Schema(
  {
    month: { type: Number, required: true }, 
    year: { type: Number, required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    errors: [
      {
        empId: String,
        name: String,
        reason: String,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

payrollRunSchema.index({ month: 1, year: 1 });

module.exports = mongoose.model("PayrollRun", payrollRunSchema);