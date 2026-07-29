const express = require('express');
const router = express.Router();
const { getDevices, removeDevice, logoutAllDevices } = require('../controllers/deviceController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getDevices);
router.delete('/:id', protect, removeDevice);
router.post('/logout-all', protect, logoutAllDevices);

module.exports = router;