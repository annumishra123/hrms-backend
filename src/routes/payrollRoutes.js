const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * /payroll/generate:
 *   post:
 *     summary: Generate/process a payslip for an employee (HR/Admin)
 *     tags: [Payroll]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, month, year]
 *             properties:
 *               employeeId: { type: string }
 *               month: { type: integer, example: 5 }
 *               year: { type: integer, example: 2026 }
 *     responses:
 *       201: { description: Payslip generated }
 *       409: { description: Payslip already exists for that period }
 */
router.post('/generate', authorize('hr', 'admin'), ctrl.generatePayslip);

/**
 * @swagger
 * /payroll/{id}/mark-paid:
 *   patch:
 *     summary: Mark a payslip as paid (HR/Admin)
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payslip marked as paid }
 */
router.patch('/:id/mark-paid', authorize('hr', 'admin'), ctrl.markPayslipPaid);

/**
 * @swagger
 * /payroll/me:
 *   get:
 *     summary: Get all my payslips
 *     tags: [Payroll]
 *     responses:
 *       200: { description: List of payslips }
 */
router.get('/me', ctrl.getMyPayslips);

/**
 * @swagger
 * /payroll/me/{year}/{month}:
 *   get:
 *     summary: Get my payslip for a specific month & year
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: month
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Payslip for the requested period }
 *       404: { description: Payslip not found }
 */
router.get('/me/:year/:month', ctrl.getPayslipByMonth);

/**
 * @swagger
 * /payroll/tax-planner:
 *   post:
 *     summary: Estimate income tax liability (old vs new regime, indicative)
 *     tags: [Payroll]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [annualGrossIncome]
 *             properties:
 *               annualGrossIncome: { type: number, example: 900000 }
 *               section80C: { type: number, example: 130000 }
 *               mediclaim80D: { type: number, example: 25000 }
 *               hraExemption: { type: number, example: 60000 }
 *               regime: { type: string, enum: [old, new], default: old }
 *     responses:
 *       200: { description: Estimated tax liability breakdown }
 */
router.post('/tax-planner', ctrl.taxPlanner);

/**
 * @swagger
 * /payroll/expenses:
 *   post:
 *     summary: Submit an expense/reimbursement claim (OCR-assisted from receipt scan)
 *     tags: [Payroll]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExpenseClaim'
 *     responses:
 *       201: { description: Expense claim submitted }
 *   get:
 *     summary: Get my expense claims
 *     tags: [Payroll]
 *     responses:
 *       200: { description: List of my expense claims }
 */
router.route('/expenses').post(ctrl.submitExpenseClaim).get(ctrl.getMyExpenseClaims);

/**
 * @swagger
 * /payroll/expenses/{id}/action:
 *   patch:
 *     summary: Approve, reject, or mark an expense claim as reimbursed (Manager/HR)
 *     tags: [Payroll]
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
 *               action: { type: string, enum: [approve, reject, reimbursed] }
 *     responses:
 *       200: { description: Expense claim status updated }
 */
router.patch('/expenses/:id/action', authorize('manager', 'hr', 'admin'), ctrl.actOnExpenseClaim);

module.exports = router;
