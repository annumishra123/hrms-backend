const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/holidayController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.getHolidays);
router.post('/bulk', authorize('hr', 'admin'), ctrl.bulkAddHolidays);
router.patch('/:id', authorize('hr', 'admin'), ctrl.updateHoliday);
router.delete('/:id', authorize('hr', 'admin'), ctrl.deleteHoliday);

module.exports = router;