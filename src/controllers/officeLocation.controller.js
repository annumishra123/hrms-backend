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

    let office = await OfficeLocation.findOne();

    // NAYA: lat/lng ko sirf tab parse/update karo jab valid number ban rahe hon
    const parsedLat = lat !== undefined && lat !== "" ? parseFloat(lat) : undefined;
    const parsedLng = lng !== undefined && lng !== "" ? parseFloat(lng) : undefined;

    // Agar naya document bana rahe hain (pehli baar), tabhi lat/lng required hain
    if (!office && (parsedLat === undefined || parsedLng === undefined || isNaN(parsedLat) || isNaN(parsedLng))) {
      return res.status(400).json({ success: false, message: "Latitude aur longitude required hain" });
    }

    if (office) {
      office.name = name ?? office.name;
      office.address = address ?? office.address;

      // NAYA: sirf valid value ho tabhi update karo, warna purani value rakho
      if (parsedLat !== undefined && !isNaN(parsedLat)) office.lat = parsedLat;
      if (parsedLng !== undefined && !isNaN(parsedLng)) office.lng = parsedLng;

      office.radiusMeters = radiusMeters ? parseFloat(radiusMeters) : office.radiusMeters;
      office.restrictionEnabled =
        restrictionEnabled !== undefined ? Boolean(restrictionEnabled) : office.restrictionEnabled;
      office.updatedBy = req.user?._id;
      await office.save();
    } else {
      office = await OfficeLocation.create({
        name,
        address,
        lat: parsedLat,
        lng: parsedLng,
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