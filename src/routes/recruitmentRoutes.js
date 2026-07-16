const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recruitmentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * /recruitment/jobs:
 *   post:
 *     summary: Create a new job posting (HR/Admin)
 *     tags: [Recruitment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Job'
 *     responses:
 *       201: { description: Job posted successfully }
 *   get:
 *     summary: List job postings with candidate/hire counts
 *     tags: [Recruitment]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, closed, on-hold, all], default: open }
 *     responses:
 *       200: { description: List of job postings }
 */
router.route('/jobs').post(authorize('hr', 'admin'), ctrl.createJob).get(ctrl.getJobs);

/**
 * @swagger
 * /recruitment/jobs/{id}:
 *   put:
 *     summary: Update a job posting (HR/Admin)
 *     tags: [Recruitment]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Job'
 *     responses:
 *       200: { description: Job posting updated }
 */
router.put('/jobs/:id', authorize('hr', 'admin'), ctrl.updateJob);

/**
 * @swagger
 * /recruitment/jobs/{jobId}/applicants:
 *   post:
 *     summary: Add an applicant to a job's pipeline
 *     tags: [Recruitment]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Applicant'
 *     responses:
 *       201: { description: Applicant added }
 *   get:
 *     summary: List applicants for a job
 *     tags: [Recruitment]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: stage
 *         schema: { type: string, enum: [applied, shortlisted, interview, offered, hired, rejected] }
 *     responses:
 *       200: { description: List of applicants }
 */
router
  .route('/jobs/:jobId/applicants')
  .post(authorize('hr', 'admin'), ctrl.addApplicant)
  .get(authorize('hr', 'admin', 'manager'), ctrl.getApplicants);

/**
 * @swagger
 * /recruitment/applicants/{id}/stage:
 *   patch:
 *     summary: Move an applicant to a new pipeline stage
 *     tags: [Recruitment]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stage]
 *             properties:
 *               stage: { type: string, enum: [applied, shortlisted, interview, offered, hired, rejected] }
 *               interviewDate: { type: string, format: date-time }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Applicant stage updated }
 */
router.patch('/applicants/:id/stage', authorize('hr', 'admin'), ctrl.updateApplicantStage);

module.exports = router;
