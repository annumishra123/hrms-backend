const OfficeLocation = require('../models/officeLocation');

/**
 * Haversine formula - distance between two lat/lng points in meters.
 */
function distanceInMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function isWithinGeofence(lat, lng) {
  // Har request pe fresh DB se office fetch — isliye toggle real-time kaam karta hai
  const office = await OfficeLocation.findOne().sort({ updatedAt: -1 });

  if (!office) {
    throw new Error('Office location not configured');
  }

  // NAYA: agar restriction OFF hai, to koi bhi location allow — distance calculate karke sirf info ke liye return karo
  if (office.restrictionEnabled === false) {
    const officeLat = Number(office.lat);
    const officeLng = Number(office.lng);
    const distance = !isNaN(officeLat) && !isNaN(officeLng)
      ? Math.round(distanceInMeters(lat, lng, officeLat, officeLng))
      : null;

    return { withinGeofence: true, distance, restrictionEnabled: false };
  }

  const officeLat = Number(office.lat);
  const officeLng = Number(office.lng);
  const radius = Number(office.radiusMeters) || 200;

  if (isNaN(officeLat) || isNaN(officeLng)) {
    throw new Error('Office location has invalid coordinates');
  }

  const distance = Math.round(distanceInMeters(lat, lng, officeLat, officeLng));

  return { withinGeofence: distance <= radius, distance, restrictionEnabled: true };
}

module.exports = { distanceInMeters, isWithinGeofence };