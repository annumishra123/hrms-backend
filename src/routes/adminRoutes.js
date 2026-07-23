const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('hr', 'admin'));

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get high-level admin dashboard statistics
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Dashboard KPIs - total employees, present today, on leave, new hires, monthly payroll total
 */
router.get('/dashboard', ctrl.getDashboardStats);

/**
 * @swagger
 * /admin/attendance-trend:
 *   get:
 *     summary: Get attendance present/absent trend for the last N days (for charts)
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 7 }
 *     responses:
 *       200: { description: Daily attendance trend data }
 */
router.get('/attendance-trend', ctrl.getAttendanceTrend);

/**
 * @swagger
 * /admin/departments:
 *   get:
 *     summary: Get department-wise employee headcount
 *     tags: [Admin]
 *     responses:
 *       200: { description: Headcount grouped by department }
 */
router.get('/departments', ctrl.getDepartmentBreakdown);



/**
 * @swagger
 * /admin/employees/{userId}/deactivate:
 *   put:
 *     tags: [Admin]
 *     summary: Deactivate an employee account (Admin/HR only)
 *     operationId: adminDeactivateEmployee
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated successfully
 */
router.put('/deactivate/:userId', ctrl.deactivateUser);


/**
 * @swagger
 * /admin/org-chart:
 *   get:
 *     summary: Get full organization chart (manager → direct reports tree)
 *     tags: [Admin]
 *     responses:
 *       200: { description: Org chart tree structure }
 */
router.get('/org-chart', ctrl.getOrgChart);

module.exports = router;
