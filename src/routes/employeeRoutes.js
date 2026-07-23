const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Get all employees (paginated, searchable)
 *     tags: [Employees]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name, email or employeeId
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [employee, manager, hr, admin] }
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 */
router.get('/', authorize('hr', 'admin', 'manager'), ctrl.getEmployees);








/**
 * @swagger
 * /employees/all-emp:
 *   get:
 *     summary: Get all employees 
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 */
router.get('/all-emp', authorize('admin'), ctrl.getAllEmployees);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get a single employee by ID
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Employee found }
 *       404: { description: Employee not found }
 */
router.get('/:id', ctrl.getEmployeeById);

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update employee profile (self or HR/Admin)
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               profilePhoto: { type: string }
 *               designation: { type: string }
 *               department: { type: string }
 *               manager: { type: string }
 *     responses:
 *       200: { description: Profile updated }
 *       403: { description: Not permitted }
 */
router.put('/:id', ctrl.updateEmployee);

/**
 * @swagger
 * /employees/{id}/status:
 *   patch:
 *     summary: Activate or deactivate an employee (HR/Admin)
 *     tags: [Employees]
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
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Status updated }
 */
router.patch('/:id/status', authorize('hr', 'admin'), ctrl.setEmployeeActiveStatus);

/**
 * @swagger
 * /employees/{id}/salary:
 *   put:
 *     summary: Update employee's salary structure (HR/Admin)
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               basic: { type: number, example: 50000 }
 *               hra: { type: number, example: 15000 }
 *               specialAllowance: { type: number, example: 10000 }
 *               otherAllowance: { type: number, example: 5000 }
 *               pf: { type: number, example: 6000 }
 *               professionalTax: { type: number, example: 200 }
 *     responses:
 *       200: { description: Salary structure updated }
 */
router.put('/:id/salary', authorize('hr', 'admin'), ctrl.updateSalaryStructure);

module.exports = router;
