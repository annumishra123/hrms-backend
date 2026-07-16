const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/employees', require('./employeeRoutes'));
router.use('/attendance', require('./attendanceRoutes'));
router.use('/leaves', require('./leaveRoutes'));
router.use('/payroll', require('./payrollRoutes'));
router.use('/performance', require('./performanceRoutes'));
router.use('/recruitment', require('./recruitmentRoutes'));
router.use('/documents', require('./documentRoutes'));
router.use('/announcements', require('./announcementRoutes'));
router.use('/helpdesk', require('./helpdeskRoutes'));
router.use('/admin', require('./adminRoutes'));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: API health check
 *     tags: [Admin]
 *     security: []
 *     responses:
 *       200: { description: API is up and running }
 */
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'HRMS API is up and running', timestamp: new Date().toISOString() });
});

module.exports = router;
