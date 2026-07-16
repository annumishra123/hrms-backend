const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/engagementController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * /announcements:
 *   post:
 *     summary: Publish a company/department announcement (HR/Admin)
 *     tags: [Announcements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Announcement'
 *     responses:
 *       201: { description: Announcement published }
 *   get:
 *     summary: List announcements
 *     tags: [Announcements]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [Company, Department, Policy, Event] }
 *     responses:
 *       200: { description: List of announcements }
 */
router.route('/').post(authorize('hr', 'admin'), ctrl.createAnnouncement).get(ctrl.getAnnouncements);

/**
 * @swagger
 * /announcements/{id}:
 *   delete:
 *     summary: Remove an announcement (HR/Admin)
 *     tags: [Announcements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Announcement removed }
 */
router.delete('/:id', authorize('hr', 'admin'), ctrl.deleteAnnouncement);

module.exports = router;
