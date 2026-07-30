const express = require("express");
const router = express.Router();
const ctrl = require('../controllers/officeLocation.controller');

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get("/office-location", protect, ctrl.getOfficeLocation);
router.post("/office-location", protect, authorize('admin', 'hr'), ctrl.setOfficeLocation);


module.exports = router;