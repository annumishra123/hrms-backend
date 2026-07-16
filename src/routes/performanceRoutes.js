const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/performanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * /performance/okrs:
 *   post:
 *     summary: Create an OKR for the current quarter
 *     tags: [Performance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OKR'
 *     responses:
 *       201: { description: OKR created }
 *   get:
 *     summary: Get my OKRs
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: quarter
 *         schema: { type: string, example: "Q2 2026" }
 *     responses:
 *       200: { description: List of my OKRs }
 */
router.route('/okrs').post(ctrl.createOkr).get(ctrl.getMyOkrs);

/**
 * @swagger
 * /performance/okrs/{id}/key-result:
 *   patch:
 *     summary: Update progress of a specific key result within an OKR
 *     tags: [Performance]
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
 *             required: [keyResultIndex, progress]
 *             properties:
 *               keyResultIndex: { type: integer, example: 0 }
 *               progress: { type: number, example: 70 }
 *     responses:
 *       200: { description: Key result progress updated }
 */
router.patch('/okrs/:id/key-result', ctrl.updateKeyResultProgress);

/**
 * @swagger
 * /performance/reviews:
 *   post:
 *     summary: Submit a 360° review rating (self/manager/peer/direct-reports)
 *     tags: [Performance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, reviewCycle, ratingType, rating]
 *             properties:
 *               employeeId: { type: string }
 *               reviewCycle: { type: string, example: "Q2 2026" }
 *               ratingType: { type: string, enum: [self, manager, peer, directReports] }
 *               rating: { type: number, minimum: 1, maximum: 5, example: 4.5 }
 *               feedback: { type: string }
 *     responses:
 *       200: { description: Rating recorded }
 */
router.post('/reviews', ctrl.submitReviewRating);

/**
 * @swagger
 * /performance/reviews/{employeeId}/{reviewCycle}:
 *   get:
 *     summary: Get 360° review for an employee & review cycle
 *     tags: [Performance]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: reviewCycle
 *         required: true
 *         schema: { type: string, example: "Q2 2026" }
 *     responses:
 *       200: { description: Performance review data }
 *       404: { description: Review not found }
 */
router.get('/reviews/:employeeId/:reviewCycle', ctrl.getReview);

/**
 * @swagger
 * /performance/reviews/{id}/finalize:
 *   patch:
 *     summary: Finalize a review cycle (Manager/HR)
 *     tags: [Performance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Review finalized }
 */
router.patch('/reviews/:id/finalize', authorize('manager', 'hr', 'admin'), ctrl.finalizeReview);

module.exports = router;
