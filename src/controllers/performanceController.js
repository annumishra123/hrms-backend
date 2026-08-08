const { OKR, PerformanceReview } = require('../models/Performance');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// ============ SELF-SERVICE (employee apna data) ============

// @desc Create/set OKR for current quarter (self)
exports.createOkr = asyncHandler(async (req, res) => {
  const { quarter, objective, keyResults } = req.body;
  if (!quarter || !objective) throw new ApiError(400, 'quarter and objective are required');
  const okr = await OKR.create({ employee: req.user._id, quarter, objective, keyResults });
  res.status(201).json({ success: true, message: 'OKR created', data: okr });
});

// @desc Update key result progress (self)
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

// @desc Add/update a 360 review rating for an employee (HR/Manager/Self)
exports.submitReviewRating = asyncHandler(async (req, res) => {
  const { employeeId, reviewCycle, ratingType, rating, feedback } = req.body;
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
  if (review.status === 'in-progress') review.status = 'submitted';
  await review.save();

  const populated = await review.populate('employee', 'name employeeId designation department profilePhoto');
  res.json({ success: true, message: `${ratingType} rating recorded`, data: populated });
});

// @desc Get 360 review for an employee & cycle
exports.getReview = asyncHandler(async (req, res) => {
  const { employeeId, reviewCycle } = req.params;
  const review = await PerformanceReview.findOne({ employee: employeeId, reviewCycle }).populate(
    'employee',
    'name employeeId designation department profilePhoto'
  );
  if (!review) throw new ApiError(404, 'Review not found for this cycle');
  res.json({ success: true, data: review });
});

// @desc Finalize a review cycle (HR/Manager)
exports.finalizeReview = asyncHandler(async (req, res) => {
  const review = await PerformanceReview.findByIdAndUpdate(
    req.params.id,
    { status: 'finalized' },
    { new: true }
  ).populate('employee', 'name employeeId designation department profilePhoto');
  if (!review) throw new ApiError(404, 'Review not found');
  res.json({ success: true, message: 'Review finalized', data: review });
});

// ============ ADMIN / HR — noumber of employees ke liye advanced listing ============

// @desc Get ALL employees' reviews for a cycle — paginated + searchable
// GET /performance/reviews?cycle=Q3 2026&page=1&limit=25&search=&status=
exports.getAllReviews = asyncHandler(async (req, res) => {
  const { cycle, page = 1, limit = 25, search = '', status = '' } = req.query;
  if (!cycle) throw new ApiError(400, 'cycle query param zaroori hai');

  const skip = (Number(page) - 1) * Number(limit);
  const matchStage = { reviewCycle: cycle };
  if (status) matchStage.status = status;

  const pipeline = [
    { $match: matchStage },
    { $lookup: { from: 'users', localField: 'employee', foreignField: '_id', as: 'employee' } },
    { $unwind: '$employee' },
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { 'employee.name': { $regex: search, $options: 'i' } },
          { 'employee.employeeId': { $regex: search, $options: 'i' } },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: { 'employee.name': 1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: Number(limit) },
          {
            $project: {
              reviewCycle: 1,
              selfRating: 1,
              managerRating: 1,
              peerRating: 1,
              directReportsRating: 1,
              overallRating: 1,
              feedback: 1,
              status: 1,
              createdAt: 1,
              updatedAt: 1,
              'employee._id': 1,
              'employee.name': 1,
              'employee.employeeId': 1,
              'employee.designation': 1,
              'employee.department': 1,
              'employee.profilePhoto': 1,
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    }
  );

  const result = await PerformanceReview.aggregate(pipeline);
  const data = result[0]?.data || [];
  const totalCount = result[0]?.totalCount[0]?.count || 0;

  // Jin employees ka review is cycle me abhi tak bana hi nahi (not-started), unko bhi count karna zaroori
  const totalActiveEmployees = await User.countDocuments({ isActive: true });

  res.json({
    success: true,
    data,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    currentPage: Number(page),
    totalActiveEmployees,
  });
});

// @desc Get ALL employees' OKRs for a quarter — paginated + searchable
// GET /performance/okrs/all?quarter=Q3 2026&page=1&limit=25&search=
exports.getAllOkrs = asyncHandler(async (req, res) => {
  const { quarter, page = 1, limit = 25, search = '' } = req.query;
  if (!quarter) throw new ApiError(400, 'quarter query param zaroori hai');

  const skip = (Number(page) - 1) * Number(limit);

  const pipeline = [
    { $match: { quarter } },
    { $lookup: { from: 'users', localField: 'employee', foreignField: '_id', as: 'employee' } },
    { $unwind: '$employee' },
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { 'employee.name': { $regex: search, $options: 'i' } },
          { 'employee.employeeId': { $regex: search, $options: 'i' } },
          { objective: { $regex: search, $options: 'i' } },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: { 'employee.name': 1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: Number(limit) },
          {
            $project: {
              quarter: 1,
              objective: 1,
              keyResults: 1,
              overallProgress: 1,
              createdAt: 1,
              'employee._id': 1,
              'employee.name': 1,
              'employee.employeeId': 1,
              'employee.designation': 1,
              'employee.department': 1,
              'employee.profilePhoto': 1,
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    }
  );

  const result = await OKR.aggregate(pipeline);
  const data = result[0]?.data || [];
  const totalCount = result[0]?.totalCount[0]?.count || 0;

  res.json({
    success: true,
    data,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    currentPage: Number(page),
  });
});

// @desc Cycle/quarter dashboard stats — 700 employees ka summary ek nazar me
// GET /performance/stats?cycle=Q3 2026
exports.getPerformanceStats = asyncHandler(async (req, res) => {
  const { cycle } = req.query;
  if (!cycle) throw new ApiError(400, 'cycle query param zaroori hai');

  const totalEmployees = await User.countDocuments({ isActive: true });
  const reviews = await PerformanceReview.find({ reviewCycle: cycle });
  const okrs = await OKR.find({ quarter: cycle });

  const submitted = reviews.filter((r) => r.status !== 'in-progress').length;
  const finalized = reviews.filter((r) => r.status === 'finalized').length;
  const avgRating = reviews.length
    ? +(reviews.reduce((s, r) => s + (r.overallRating || 0), 0) / reviews.length).toFixed(2)
    : 0;
  const avgOkrProgress = okrs.length
    ? Math.round(okrs.reduce((s, o) => s + (o.overallProgress || 0), 0) / okrs.length)
    : 0;
  const lowPerformers = reviews.filter((r) => r.overallRating && r.overallRating < 3).length;
  const topPerformers = reviews.filter((r) => r.overallRating && r.overallRating >= 4.5).length;

  res.json({
    success: true,
    data: {
      totalEmployees,
      reviewsStarted: reviews.length,
      reviewsSubmitted: submitted,
      reviewsFinalized: finalized,
      reviewsNotStarted: totalEmployees - reviews.length,
      avgRating,
      totalOkrs: okrs.length,
      employeesWithoutOkr: totalEmployees - okrs.length,
      avgOkrProgress,
      lowPerformers,
      topPerformers,
    },
  });
});

// @desc Available review cycles / quarters (dropdown ke liye)
exports.getReviewCycles = asyncHandler(async (req, res) => {
  const cycles = await PerformanceReview.distinct('reviewCycle');
  const quarters = await OKR.distinct('quarter');
  const merged = [...new Set([...cycles, ...quarters])].sort().reverse();
  res.json({ success: true, data: merged });
});

// @desc HR/Admin kisi bhi employee ke liye OKR create kare
exports.createOkrForEmployee = asyncHandler(async (req, res) => {
  const { employeeId, quarter, objective, keyResults } = req.body;
  if (!employeeId || !quarter || !objective) {
    throw new ApiError(400, 'employeeId, quarter aur objective zaroori hain');
  }
  const okr = await OKR.create({ employee: employeeId, quarter, objective, keyResults });
  const populated = await okr.populate('employee', 'name employeeId designation department profilePhoto');
  res.status(201).json({ success: true, message: 'OKR create ho gayi', data: populated });
});

// @desc HR/Admin kisi bhi employee ki key result progress update kare
exports.updateKeyResultProgressAdmin = asyncHandler(async (req, res) => {
  const { keyResultIndex, progress } = req.body;
  const okr = await OKR.findById(req.params.id);
  if (!okr) throw new ApiError(404, 'OKR not found');
  if (!okr.keyResults[keyResultIndex]) throw new ApiError(400, 'Invalid keyResultIndex');
  okr.keyResults[keyResultIndex].progress = progress;
  await okr.save();
  const populated = await okr.populate('employee', 'name employeeId designation department profilePhoto');
  res.json({ success: true, message: 'Key result update ho gayi', data: populated });
});

// @desc HR/Admin OKR delete kare
exports.deleteOkr = asyncHandler(async (req, res) => {
  const okr = await OKR.findByIdAndDelete(req.params.id);
  if (!okr) throw new ApiError(404, 'OKR not found');
  res.json({ success: true, message: 'OKR delete ho gayi' });
});