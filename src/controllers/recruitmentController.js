const { Job, Applicant } = require('../models/Recruitment');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// @desc Create job posting (HR/Admin)
exports.createJob = asyncHandler(async (req, res) => {
  const job = await Job.create({ ...req.body, postedBy: req.user._id });
  res.status(201).json({ success: true, message: 'Job posted successfully', data: job });
});

// @desc List job postings (with open position + candidate counts)
exports.getJobs = asyncHandler(async (req, res) => {
  const { status = 'open' } = req.query;
  const query = status === 'all' ? {} : { status };
  const jobs = await Job.find(query).sort('-createdAt');

  const jobsWithCounts = await Promise.all(
    jobs.map(async (job) => {
      const candidateCount = await Applicant.countDocuments({ job: job._id });
      const hiredCount = await Applicant.countDocuments({ job: job._id, stage: 'hired' });
      return { ...job.toObject(), candidateCount, hiredCount };
    })
  );

  res.json({ success: true, data: jobsWithCounts });
});

// @desc Update job posting
exports.updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!job) throw new ApiError(404, 'Job posting not found');
  res.json({ success: true, message: 'Job posting updated', data: job });
});

// @desc Apply to a job / add applicant
exports.addApplicant = asyncHandler(async (req, res) => {
  const applicant = await Applicant.create({ ...req.body, job: req.params.jobId });
  res.status(201).json({ success: true, message: 'Applicant added', data: applicant });
});

// @desc List applicants for a job
exports.getApplicants = asyncHandler(async (req, res) => {
  const { stage } = req.query;
  const query = { job: req.params.jobId };
  if (stage) query.stage = stage;
  const applicants = await Applicant.find(query).sort('-createdAt');
  res.json({ success: true, data: applicants });
});

// @desc Move applicant through pipeline stages
exports.updateApplicantStage = asyncHandler(async (req, res) => {
  const { stage, interviewDate, notes } = req.body;
  const applicant = await Applicant.findByIdAndUpdate(
    req.params.id,
    { stage, interviewDate, notes },
    { new: true, runValidators: true }
  );
  if (!applicant) throw new ApiError(404, 'Applicant not found');
  res.json({ success: true, message: `Applicant moved to '${applicant.stage}'`, data: applicant });
});
