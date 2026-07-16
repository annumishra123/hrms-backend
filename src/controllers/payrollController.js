const { Payroll, ExpenseClaim } = require('../models/Payroll');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// @desc Generate/process payslip for an employee for a given month (HR/Admin)
exports.generatePayslip = asyncHandler(async (req, res) => {
  const { employeeId, month, year } = req.body;
  const employee = await User.findById(employeeId);
  if (!employee) throw new ApiError(404, 'Employee not found');

  const existing = await Payroll.findOne({ employee: employeeId, month, year });
  if (existing) throw new ApiError(409, 'Payslip already generated for this month');

  const payslip = await Payroll.create({
    employee: employeeId,
    month,
    year,
    earnings: {
      basic: employee.salary.basic,
      hra: employee.salary.hra,
      specialAllowance: employee.salary.specialAllowance,
      otherAllowance: employee.salary.otherAllowance,
    },
    deductions: {
      pf: employee.salary.pf,
      professionalTax: employee.salary.professionalTax,
      tds: 0,
    },
    status: 'processed',
  });

  res.status(201).json({ success: true, message: 'Payslip generated', data: payslip });
});

// @desc Mark payslip as paid
exports.markPayslipPaid = asyncHandler(async (req, res) => {
  const payslip = await Payroll.findByIdAndUpdate(
    req.params.id,
    { status: 'paid', paidOn: new Date() },
    { new: true }
  );
  if (!payslip) throw new ApiError(404, 'Payslip not found');
  res.json({ success: true, message: 'Payslip marked as paid', data: payslip });
});

// @desc Get my payslips
exports.getMyPayslips = asyncHandler(async (req, res) => {
  const payslips = await Payroll.find({ employee: req.user._id }).sort('-year -month');
  res.json({ success: true, data: payslips });
});

// @desc Get a specific payslip by month/year (for download/view)
exports.getPayslipByMonth = asyncHandler(async (req, res) => {
  const { month, year } = req.params;
  const payslip = await Payroll.findOne({ employee: req.user._id, month, year });
  if (!payslip) throw new ApiError(404, 'Payslip not found for the requested period');
  res.json({ success: true, data: payslip });
});

// @desc Simple old-vs-new regime tax projection (indicative, FY India rules simplified)
exports.taxPlanner = asyncHandler(async (req, res) => {
  const { annualGrossIncome, section80C = 0, mediclaim80D = 0, hraExemption = 0, regime = 'old' } = req.body;
  if (!annualGrossIncome) throw new ApiError(400, 'annualGrossIncome is required');

  let taxableIncome;
  if (regime === 'old') {
    const deductions = Math.min(section80C, 150000) + Math.min(mediclaim80D, 25000) + hraExemption + 50000; // +50k std deduction
    taxableIncome = Math.max(annualGrossIncome - deductions, 0);
  } else {
    taxableIncome = Math.max(annualGrossIncome - 75000, 0); // new regime standard deduction (indicative)
  }

  const tax = computeSlabTax(taxableIncome, regime);

  res.json({
    success: true,
    data: {
      regime,
      annualGrossIncome,
      taxableIncome,
      estimatedTaxLiability: tax,
      investmentsConsidered: { section80C, mediclaim80D, hraExemption },
      note: 'Indicative estimate only. Consult a CA / compliance rule engine before finalizing Form 16.',
    },
  });
});

function computeSlabTax(income, regime) {
  // Simplified illustrative slabs (India, indicative only — not legal/tax advice)
  const slabs =
    regime === 'old'
      ? [
          { upto: 250000, rate: 0 },
          { upto: 500000, rate: 0.05 },
          { upto: 1000000, rate: 0.2 },
          { upto: Infinity, rate: 0.3 },
        ]
      : [
          { upto: 300000, rate: 0 },
          { upto: 600000, rate: 0.05 },
          { upto: 900000, rate: 0.1 },
          { upto: 1200000, rate: 0.15 },
          { upto: 1500000, rate: 0.2 },
          { upto: Infinity, rate: 0.3 },
        ];

  let tax = 0;
  let lastLimit = 0;
  for (const slab of slabs) {
    if (income > lastLimit) {
      const taxableAtThisSlab = Math.min(income, slab.upto) - lastLimit;
      tax += taxableAtThisSlab * slab.rate;
      lastLimit = slab.upto;
    } else break;
  }
  return Math.round(tax);
}

// ---------------- Expense Claims (OCR-assisted) ----------------

// @desc Submit expense claim (with optional OCR-extracted fields from client-side scan)
exports.submitExpenseClaim = asyncHandler(async (req, res) => {
  const { category, vendor, amount, expenseDate, receiptUrl, ocrExtractedText } = req.body;
  if (!amount || !expenseDate) throw new ApiError(400, 'amount and expenseDate are required');

  const claim = await ExpenseClaim.create({
    employee: req.user._id,
    category,
    vendor,
    amount,
    expenseDate,
    receiptUrl,
    ocrExtractedText,
  });

  res.status(201).json({ success: true, message: 'Expense claim submitted', data: claim });
});

// @desc My expense claims
exports.getMyExpenseClaims = asyncHandler(async (req, res) => {
  const claims = await ExpenseClaim.find({ employee: req.user._id }).sort('-createdAt');
  res.json({ success: true, data: claims });
});

// @desc Approve/reject expense claim (Manager/HR)
exports.actOnExpenseClaim = asyncHandler(async (req, res) => {
  const { action } = req.body; // approve | reject | reimbursed
  const claim = await ExpenseClaim.findById(req.params.id);
  if (!claim) throw new ApiError(404, 'Expense claim not found');

  const map = { approve: 'approved', reject: 'rejected', reimbursed: 'reimbursed' };
  if (!map[action]) throw new ApiError(400, 'Invalid action');

  claim.status = map[action];
  await claim.save();
  res.json({ success: true, message: `Expense claim ${claim.status}`, data: claim });
});
