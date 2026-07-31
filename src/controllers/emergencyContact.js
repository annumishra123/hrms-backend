const User = require("../models/User");

// GET /api/profile/emergency-contacts
exports.getEmergencyContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("emergencyContacts");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, contacts: user.emergencyContacts || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// POST /api/profile/emergency-contacts
exports.addEmergencyContact = async (req, res) => {
  try {
    const { name, relation, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: "Name and phone is required " });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.emergencyContacts.push({ name, relation, phone });
    await user.save();

    res.json({ success: true, message: "Contact not found", contacts: user.emergencyContacts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// DELETE /api/profile/emergency-contacts/:contactId
exports.deleteEmergencyContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User nahi mila" });
    }

    user.emergencyContacts = user.emergencyContacts.filter(
      (c) => c._id.toString() !== contactId
    );
    await user.save();

    res.json({ success: true, message: "Contact remove ", contacts: user.emergencyContacts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};