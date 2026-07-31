const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/devices/push-token', ctrl.registerPushToken);
router.get('/notifications', ctrl.getMyNotifications);
router.patch('/notifications/:id/read', ctrl.markAsRead);

module.exports = router;