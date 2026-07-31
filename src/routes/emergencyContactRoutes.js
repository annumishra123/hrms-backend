const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/emergencyContact");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/emergency-contacts", ctrl.getEmergencyContacts);
router.post("/emergency-contacts", ctrl.addEmergencyContact);
router.delete("/emergency-contacts/:contactId", ctrl.deleteEmergencyContact);

module.exports = router;