const { OKR, PerformanceReview } = require('../models/Performance');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// @desc Create/set OKR for current quarter
exports.createOkr = asyncHandler(async (req, res) => {
  const { quarter, objective, keyResults } = req.body;
  if (!quarter || !objective) throw new ApiError(400, 'quarter and objective are required');

  const okr = await OKR.create({ employee: req.user._id, quarter, objective, keyResults });
  res.status(201).json({ success: true, message: 'OKR created', data: okr });
});

// @desc Update key result progress
exports.updateKeyResultProgress = asyncHandler(async (req, res) => {
  const { keyResultIndex, progress } = req.body;
  const okr = await OKR.findOne({ _id: req.params.id, employee: req.user._id });
  if (!okr) throw new ApiError(404, 'OKR not found');
  if (!okr.keyResults[keyResultIndex]) throw new ApiError(400, 'Invalid keyResultIndex');

  okr.keyResults[keyResultIndex].progress = progress;
  await okr.save();
  res.json({ success: true, message: 'Key result updated', data: okr });
});

// @desc Get my OKRs
exports.getMyOkrs = asyncHandler(async (req, res) => {
  const { quarter } = req.query;
  const query = { employee: req.user._id };
  if (quarter) query.quarter = quarter;
  const okrs = await OKR.find(query).sort('-createdAt');
  res.json({ success: true, data: okrs });
});

// @desc Add/update a 360 review rating for an employee
exports.submitReviewRating = asyncHandler(async (req, res) => {
  const { employeeId, reviewCycle, ratingType, rating, feedback } = req.body;
  // ratingType: self | manager | peer | directReports
  const fieldMap = {
    self: 'selfRating',
    manager: 'managerRating',
    peer: 'peerRating',
    directReports: 'directReportsRating',
  };
  if (!fieldMap[ratingType]) throw new ApiError(400, 'Invalid ratingType');

  let review = await PerformanceReview.findOne({ employee: employeeId, reviewCycle });
  if (!review) review = new PerformanceReview({ employee: employeeId, reviewCycle });

  review[fieldMap[ratingType]] = rating;
  if (feedback) review.feedback = feedback;
  review.status = 'submitted';
  await review.save();

  res.json({ success: true, message: `${ratingType} rating recorded`, data: review });
});

// @desc Get 360 review for an employee & cycle
exports.getReview = asyncHandler(async (req, res) => {
  const { employeeId, reviewCycle } = req.params;
  const review = await PerformanceReview.findOne({ employee: employeeId, reviewCycle });
  if (!review) throw new ApiError(404, 'Review not found for this cycle');
  res.json({ success: true, data: review });
});

// @desc Finalize a review cycle (HR/Manager)
exports.finalizeReview = asyncHandler(async (req, res) => {
  const review = await PerformanceReview.findByIdAndUpdate(
    req.params.id,
    { status: 'finalized' },
    { new: true }
  );
  if (!review) throw new ApiError(404, 'Review not found');
  res.json({ success: true, message: 'Review finalized', data: review });
});
