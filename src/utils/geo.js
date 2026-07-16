/**
 * Haversine formula - distance between two lat/lng points in meters.
 */
function distanceInMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isWithinGeofence(lat, lng) {
  const officeLat = parseFloat(process.env.OFFICE_LAT);
  const officeLng = parseFloat(process.env.OFFICE_LNG);
  const radius = parseFloat(process.env.OFFICE_RADIUS_METERS || 200);

  const distance = distanceInMeters(lat, lng, officeLat, officeLng);
  return { withinGeofence: distance <= radius, distance: Math.round(distance) };
}

module.exports = { distanceInMeters, isWithinGeofence };
