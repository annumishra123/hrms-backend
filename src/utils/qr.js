const jwt = require('jsonwebtoken');

/**
 * Generates a short-lived QR token (embedded inside the QR code image on the
 * office display). Employee app scans it and posts it back to /attendance/qr-checkin.
 */
function generateQrToken(officeGate = 'Main Gate') {
  return jwt.sign({ gate: officeGate, purpose: 'attendance-qr' }, process.env.JWT_SECRET, { expiresIn: '2m' });
}

function verifyQrToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'attendance-qr') throw new Error('Invalid QR token purpose');
  return decoded;
}

module.exports = { generateQrToken, verifyQrToken };
