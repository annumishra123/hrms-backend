const Expense = require('../models/Expense');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// ─────────────────────────────────────────────
// @desc Get expenses — employee sees own, admin can pass ?all=true for everyone's
// @route GET /api/expenses?status=&all=
// ─────────────────────────────────────────────
exports.getExpenses = asyncHandler(async (req, res) => {
  const { status, all } = req.query;
  const filter = {};

  if (req.user.role === 'admin' && all === 'true') {
    // admin: no employee filter, sees everyone's expenses
  } else {
    filter.employee = req.user._id;
  }

  if (status && status !== 'All') {
    filter.status = status;
  }

  const expenses = await Expense.find(filter)
    .sort({ date: -1 })
    .populate('employee', 'name email');

  res.json({ success: true, data: expenses });
});

// ─────────────────────────────────────────────
// @desc Get single expense by id
// @route GET /api/expenses/:id
// ─────────────────────────────────────────────
exports.getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id).populate('employee', 'name email');
  if (!expense) throw new ApiError(404, 'Expense not found');

  if (req.user.role !== 'admin' && String(expense.employee._id) !== String(req.user._id)) {
    throw new ApiError(403, 'Not authorized to view this expense');
  }

  res.json({ success: true, data: expense });
});

// ─────────────────────────────────────────────
// @desc Create new expense (with optional receipt image)
// @route POST /api/expenses
// ─────────────────────────────────────────────
exports.createExpense = asyncHandler(async (req, res) => {
  const { title, amount, category, date, notes } = req.body;

  if (!title || !amount || !date) {
    throw new ApiError(400, 'Title, amount and date are required');
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const expense = await Expense.create({
    employee: req.user._id,
    title,
    amount: Number(amount),
    category: category || 'Other',
    date: new Date(date),
    notes: notes || '',
    imageUrl,
  });

  res.status(201).json({ success: true, message: 'Expense submitted for approval', data: expense });
});

// ─────────────────────────────────────────────
// @desc Edit own pending expense
// @route PUT /api/expenses/:id
// ─────────────────────────────────────────────
exports.updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError(404, 'Expense not found');

  if (String(expense.employee) !== String(req.user._id)) {
    throw new ApiError(403, 'Not authorized');
  }
  if (expense.status !== 'Pending') {
    throw new ApiError(400, 'Only pending expenses can be edited');
  }

  const { title, amount, category, date, notes } = req.body;
  if (title) expense.title = title;
  if (amount) expense.amount = Number(amount);
  if (category) expense.category = category;
  if (date) expense.date = new Date(date);
  if (notes !== undefined) expense.notes = notes;
  if (req.file) expense.imageUrl = `/uploads/${req.file.filename}`;

  await expense.save();
  res.json({ success: true, message: 'Expense updated', data: expense });
});

// ─────────────────────────────────────────────
// @desc Approve / reject an expense (admin only)
// @route PATCH /api/expenses/:id/status
// ─────────────────────────────────────────────
exports.updateExpenseStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Admin access required');
  }

  const { status, reviewNote } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    throw new ApiError(400, 'Status must be Approved or Rejected');
  }

  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError(404, 'Expense not found');

  expense.status = status;
  expense.reviewedBy = req.user._id;
  expense.reviewNote = reviewNote || '';
  await expense.save();

  res.json({ success: true, message: `Expense ${status.toLowerCase()}`, data: expense });
});

// ─────────────────────────────────────────────
// @desc Delete expense
// @route DELETE /api/expenses/:id
// ─────────────────────────────────────────────
exports.deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError(404, 'Expense not found');

  const isOwner = String(expense.employee) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }
  if (expense.status !== 'Pending' && req.user.role !== 'admin') {
    throw new ApiError(400, 'Only pending expenses can be deleted');
  }

  await expense.deleteOne();
  res.json({ success: true, message: 'Expense deleted', data: { id: req.params.id } });
});

// ─────────────────────────────────────────────
// @desc Totals summary (for summary card on ExpensesScreen)
// @route GET /api/expenses/summary/totals
// ─────────────────────────────────────────────
exports.getExpenseSummary = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { employee: req.user._id };
  const expenses = await Expense.find(filter);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter((e) => e.status === 'Pending').reduce((s, e) => s + e.amount, 0);
  const approved = expenses.filter((e) => e.status === 'Approved').reduce((s, e) => s + e.amount, 0);
  const rejected = expenses.filter((e) => e.status === 'Rejected').reduce((s, e) => s + e.amount, 0);

  res.json({ success: true, data: { total, pending, approved, rejected } });
});