const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/performanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ============ Admin/HR — listing, stats, cycles (number of employees ke liye) ============
// NOTE: ye specific-path routes '/okrs/:id/...' jaisi dynamic routes se UPAR hone chahiye

router.get('/stats', authorize('hr', 'admin', 'manager'), ctrl.getPerformanceStats);
router.get('/cycles', authorize('hr', 'admin', 'manager'), ctrl.getReviewCycles);
router.get('/reviews', authorize('hr', 'admin', 'manager'), ctrl.getAllReviews);
router.get('/okrs/all', authorize('hr', 'admin', 'manager'), ctrl.getAllOkrs);
router.post('/okrs/admin', authorize('hr', 'admin'), ctrl.createOkrForEmployee);
router.patch('/okrs/:id/key-result/admin', authorize('hr', 'admin'), ctrl.updateKeyResultProgressAdmin);
router.delete('/okrs/:id', authorize('hr', 'admin'), ctrl.deleteOkr);

// ============ Self-service ============

/**
 * @swagger
 * /performance/okrs:
 *   post:
 *     summary: Create an OKR for the current quarter (self)
 *     tags: [Performance]
 *   get:
 *     summary: Get my OKRs
 *     tags: [Performance]
 */
router.route('/okrs').post(ctrl.createOkr).get(ctrl.getMyOkrs);

/**
 * @swagger
 * /performance/okrs/{id}/key-result:
 *   patch:
 *     summary: Update progress of a specific key result within an OKR (self)
 *     tags: [Performance]
 */
router.patch('/okrs/:id/key-result', ctrl.updateKeyResultProgress);

/**
 * @swagger
 * /performance/reviews:
 *   post:
 *     summary: Submit a 360° review rating
 *     tags: [Performance]
 */
router.post('/reviews', ctrl.submitReviewRating);

/**
 * @swagger
 * /performance/reviews/{employeeId}/{reviewCycle}:
 *   get:
 *     summary: Get 360° review for an employee & review cycle
 *     tags: [Performance]
 */
router.get('/reviews/:employeeId/:reviewCycle', ctrl.getReview);

/**
 * @swagger
 * /performance/reviews/{id}/finalize:
 *   patch:
 *     summary: Finalize a review cycle (Manager/HR)
 *     tags: [Performance]
 */
router.patch('/reviews/:id/finalize', authorize('manager', 'hr', 'admin'), ctrl.finalizeReview);

module.exports = router;