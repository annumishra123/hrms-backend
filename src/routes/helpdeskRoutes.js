const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/engagementController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * /helpdesk/tickets:
 *   post:
 *     summary: Raise a new support ticket
 *     tags: [Helpdesk]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Ticket'
 *     responses:
 *       201: { description: Ticket raised }
 *   get:
 *     summary: Get my raised tickets
 *     tags: [Helpdesk]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, in-progress, resolved, closed] }
 *     responses:
 *       200: { description: List of my tickets }
 */
router.route('/tickets').post(ctrl.createTicket).get(ctrl.getMyTickets);

/**
 * @swagger
 * /helpdesk/tickets/all:
 *   get:
 *     summary: Get all tickets (HR/Admin/IT support)
 *     tags: [Helpdesk]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [IT, HR, Payroll, Facilities, Other] }
 *     responses:
 *       200: { description: List of all tickets }
 */
router.get('/tickets/all', authorize('hr', 'admin'), ctrl.getAllTickets);

/**
 * @swagger
 * /helpdesk/tickets/{id}/comment:
 *   post:
 *     summary: Add a comment/reply to a ticket
 *     tags: [Helpdesk]
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
 *             required: [text]
 *             properties:
 *               text: { type: string, example: "I'll review it" }
 *     responses:
 *       200: { description: Comment added }
 */
router.post('/tickets/:id/comment', ctrl.addTicketComment);

/**
 * @swagger
 * /helpdesk/tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status / assign to support agent (HR/Admin)
 *     tags: [Helpdesk]
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
 *             properties:
 *               status: { type: string, enum: [open, in-progress, resolved, closed] }
 *               assignedTo: { type: string }
 *     responses:
 *       200: { description: Ticket updated }
 */
router.patch('/tickets/:id/status', authorize('hr', 'admin'), ctrl.updateTicketStatus);

module.exports = router;
