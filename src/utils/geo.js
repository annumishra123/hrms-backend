const Office = require('../models/officeLocation');

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
  const office = await Office.findOne(); // agar multiple offices hain to filter/id use karo

  if (!office) {
    throw new Error('Office location not configured');
  }

  const officeLat = Number(office.lat);
  const officeLng = Number(office.lng);
  const radius = Number(office.radiusMeters) || 200;

  if (isNaN(officeLat) || isNaN(officeLng)) {
    throw new Error('Office location has invalid coordinates');
  }

  const distance = distanceInMeters(lat, lng, officeLat, officeLng);
  return { withinGeofence: distance <= radius, distance: Math.round(distance) };
}

module.exports = { distanceInMeters, isWithinGeofence };