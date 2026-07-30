const Holiday = require('../models/Holiday');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// GET /holidays?year=2026
exports.getHolidays = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const query = {};
  if (year) {
    query.date = {
      $gte: new Date(`${year}-01-01`),
      $lte: new Date(`${year}-12-31`),
    };
  }
  const holidays = await Holiday.find(query).sort('date');
  res.json({ success: true, data: holidays });
});

// POST /holidays/bulk  -> body: { holidays: [{title,date,type,description}, ...] }
exports.bulkAddHolidays = asyncHandler(async (req, res) => {
  const { holidays } = req.body;
  if (!Array.isArray(holidays) || holidays.length === 0) {
    throw new ApiError(400, 'holidays array is required');
  }
  const invalid = holidays.find((h) => !h.title || !h.date);
  if (invalid) throw new ApiError(400, 'Each holiday needs title and date');

  const created = await Holiday.insertMany(holidays, { ordered: false });
  res.status(201).json({ success: true, message: `${created.length} holidays added`, data: created });
});

// PATCH /holidays/:id
exports.updateHoliday = asyncHandler(async (req, res) => {
  const { title, date, type, description } = req.body;
  const holiday = await Holiday.findByIdAndUpdate(
    req.params.id,
    { title, date, type, description },
    { new: true, runValidators: true }
  );
  if (!holiday) throw new ApiError(404, 'Holiday not found');
  res.json({ success: true, message: 'Holiday updated', data: holiday });
});

// DELETE /holidays/:id
exports.deleteHoliday = asyncHandler(async (req, res) => {
  const holiday = await Holiday.findByIdAndDelete(req.params.id);
  if (!holiday) throw new ApiError(404, 'Holiday not found');
  res.json({ success: true, message: 'Holiday deleted' });
});