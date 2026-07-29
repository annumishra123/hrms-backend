const express = require('express');
const router = express.Router();
const { getDevices, removeDevice, logoutAllDevices } = require('../controllers/deviceController');
const authMiddleware = require('../middleware/authMiddleware'); // tumhara existing JWT verify middleware

router.get('/', authMiddleware, getDevices);
router.delete('/:id', authMiddleware, removeDevice);
router.post('/logout-all', authMiddleware, logoutAllDevices);

module.exports = router;