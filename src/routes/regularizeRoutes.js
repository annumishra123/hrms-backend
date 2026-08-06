
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/regularizeController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/', ctrl.submitRegularizeRequest);
router.get('/', ctrl.getMyRegularizeRequests);
router.get('/../attendance/date/:date', ctrl.getAttendanceByDate);


// for admin
router.get('/', authorize('admin', 'hr'), ctrl.getAllRegularizeRequests);          
router.get('/:id', authorize("admin", "hr"), ctrl.getRegularizeRequestById);      
router.patch('/:id/approve', authorize("admin", "hr"), ctrl.approveRegularizeRequest);
router.patch('/:id/reject', authorize("admin", "hr"), ctrl.rejectRegularizeRequest);



module.exports = router;
