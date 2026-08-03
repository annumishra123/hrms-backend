const OfficeLocation = require("../models/officeLocation");

// GET /api/office-location
// Sabhi logged-in users office location dekh sakte hain
exports.getOfficeLocation = async (req, res) => {
  try {
    const office = await OfficeLocation.findOne().sort({ updatedAt: -1 });
    if (!office) {
      return res.status(404).json({ success: false, message: "Office location is not set" });
    }
    res.json({ success: true, office });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// POST /api/office-location
// Sirf Admin access karega (route me middleware lagega: authMiddleware + adminOnly)
exports.setOfficeLocation = async (req, res) => {
  try {
    const { name, address, lat, lng, radiusMeters, restrictionEnabled } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: "Latitude and longitude is required " });
    }

    // Ek hi document maintain karna hai, isliye upsert use kar rahe hain
    let office = await OfficeLocation.findOne();

    if (office) {
      office.name = name ?? office.name;
      office.address = address ?? office.address;
      office.lat = parseFloat(lat);
      office.lng = parseFloat(lng);
      office.radiusMeters = radiusMeters ? parseFloat(radiusMeters) : office.radiusMeters;
      // NAYA: agar body me restrictionEnabled bheja gaya hai to use update karo, warna existing value rakho
      office.restrictionEnabled =
        restrictionEnabled !== undefined ? Boolean(restrictionEnabled) : office.restrictionEnabled;
      office.updatedBy = req.user?._id;
      await office.save();
    } else {
      office = await OfficeLocation.create({
        name,
        address,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radiusMeters: radiusMeters ? parseFloat(radiusMeters) : 20,
        restrictionEnabled: restrictionEnabled !== undefined ? Boolean(restrictionEnabled) : true,
        updatedBy: req.user?._id,
      });
    }

    res.json({ success: true, message: "Office location save ", office });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};