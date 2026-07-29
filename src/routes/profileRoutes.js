const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth'); 
const { getMyProfile, updateProfile } = require('../controllers/profileController');


router.get('/me', protect, getMyProfile);

router.put('/update', protect, upload.single('avatar'), updateProfile);

module.exports = router;