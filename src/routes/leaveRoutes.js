const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * /leaves:
 *   post:
 *     summary: Apply for leave
 *     tags: [Leave]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Leave'
 *     responses:
 *       201: { description: Leave application submitted }
 *       400: { description: Validation error / insufficient balance }
 *   get:
 *     summary: Get my leave applications
 *     tags: [Leave]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected, cancelled] }
 *     responses:
 *       200: { description: My leave applications with current balance }
 */
router.route('/').post(ctrl.applyLeave).get(ctrl.getMyLeaves);

/**
 * @swagger
 * /leaves/team:
 *   get:
 *     summary: Get leave requests for my team (Manager/HR)
 *     tags: [Leave]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, default: pending }
 *     responses:
 *       200: { description: Team leave requests }
 */
router.get('/team', authorize('manager', 'hr', 'admin'), ctrl.getTeamLeaves);

/**
 * @swagger
 * /leaves/calendar:
 *   get:
 *     summary: Get company/team leave calendar for a given month
 *     tags: [Leave]
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer, example: 5 }
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer, example: 2026 }
 *     responses:
 *       200: { description: Approved leaves overlapping the given month }
 */
router.get('/calendar', ctrl.getLeaveCalendar);

/**
 * @swagger
 * /leaves/{id}/action:
 *   patch:
 *     summary: Approve or reject a leave request (Manager/HR)
 *     tags: [Leave]
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
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [approve, reject] }
 *               comment: { type: string, example: "Approved, enjoy!" }
 *     responses:
 *       200: { description: Leave request updated }
 */
router.patch('/:id/action', authorize('manager', 'hr', 'admin'), ctrl.actOnLeave);

/**
 * @swagger
 * /leaves/{id}/cancel:
 *   patch:
 *     summary: Cancel my own pending leave request
 *     tags: [Leave]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Leave request cancelled }
 */
router.patch('/:id/cancel', ctrl.cancelLeave);

module.exports = router;
