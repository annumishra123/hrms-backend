const Attendance = require('../models/Attendance');
const User = require('../models/User')
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { isWithinGeofence } = require('../utils/geo');
const { generateQrToken, verifyQrToken,  } = require('../utils/qr');
const { todayStr, formatTime } = require('../utils/date');
const { getOrCreateToday } = require('../services/attendanceService');


// @desc Generate a fresh QR token to display at the office gate (HR/Admin)
exports.generateQr = asyncHandler(async (req, res) => {
  const token = generateQrToken(req.query.gate);
  res.json({ success: true, data: { qrToken: token, expiresInSeconds: 120 } });
});

// @desc Check-in via QR code scan
exports.qrCheckIn = asyncHandler(async (req, res) => {
  const { qrToken } = req.body;
  if (!qrToken) throw new ApiError(400, 'qrToken is required');

  let decoded;
  try {
    decoded = verifyQrToken(qrToken);
  } catch {
    throw new ApiError(400, 'QR code invalid or expired. Please scan the latest QR.');
  }

  const record = await getOrCreateToday(req.user._id);
  if (record.checkIn?.time) throw new ApiError(409, 'Already checked in today');

  record.checkIn = { time: new Date(), method: 'qr' };
  record.status = 'present';
  await record.save();

  res.json({ success: true, message: `Checked in successfully at ${decoded.gate}`, data: record });
});

// @desc Check-in via GPS geo-fence
exports.gpsCheckIn = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) throw new ApiError(400, 'lat and lng are required');

  const { withinGeofence, distance } = await isWithinGeofence(lat, lng);
  if (!withinGeofence) {
    throw new ApiError(403, `You are ${distance}m away from office. Must be within allowed radius to check in.`);
  }

  const record = await getOrCreateToday(req.user._id);
  if (record.checkIn?.time) throw new ApiError(409, 'Already checked in today');

  record.checkIn = {
    time: new Date(),
    method: 'gps',
    location: { lat, lng },
    distanceFromOfficeMeters: distance,
    withinGeofence: true,
  };
  record.status = 'present';
  await record.save();

  res.json({ success: true, message: 'Checked in successfully via GPS', data: record });
});

// @desc Check-in via Face Liveness verification (liveness result comes from client-side/AI service)
exports.faceCheckIn = asyncHandler(async (req, res) => {
  const { livenessVerified, confidenceScore } = req.body;
  if (!livenessVerified) {
    throw new ApiError(400, 'Face liveness could not be verified. Please blink or turn your head and retry.');
  }

  const record = await getOrCreateToday(req.user._id);
  if (record.checkIn?.time) throw new ApiError(409, 'Already checked in today');

  record.checkIn = { time: new Date(), method: 'face', livenessVerified: true };
  record.status = 'present';
  await record.save();

  res.json({
    success: true,
    message: 'Face verified — checked in successfully',
    data: record,
    meta: { confidenceScore: confidenceScore || null },
  });
});

// @desc Check-out (any method)
exports.checkOut = asyncHandler(async (req, res) => {
  const { method = 'manual', lat, lng } = req.body;
  const record = await Attendance.findOne({ eisWithinGeofencemployee: req.user._id, date: todayStr() });
  if (!record || !record.checkIn?.time) throw new ApiError(400, 'You must check in before checking out');
  if (record.checkOut?.time) throw new ApiError(409, 'Already checked out today');

  record.checkOut = { time: new Date(), method, location: lat && lng ? { lat, lng } : undefined };
  record.computeWorkedHours();
  await record.save();

  res.json({ success: true, message: 'Checked out successfully', data: record });
});

// @desc Offline sync - bulk push attendance events recorded while offline
exports.offlineSync = asyncHandler(async (req, res) => {
  const { events } = req.body; // [{ date, type: 'checkin'|'checkout', time, method, lat, lng }]
  if (!Array.isArray(events) || !events.length) throw new ApiError(400, 'events array is required');

  const results = [];
  for (const evt of events) {
    let record = await Attendance.findOne({ employee: req.user._id, date: evt.date });
    if (!record) record = new Attendance({ employee: req.user._id, date: evt.date });

    if (evt.type === 'checkin' && !record.checkIn?.time) {
      record.checkIn = {
        time: evt.time,
        method: evt.method || 'manual',
        location: evt.lat && evt.lng ? { lat: evt.lat, lng: evt.lng } : undefined,
        syncedFromOffline: true,
      };
      record.status = 'present';
    } else if (evt.type === 'checkout' && !record.checkOut?.time) {
      record.checkOut = {
        time: evt.time,
        method: evt.method || 'manual',
        location: evt.lat && evt.lng ? { lat: evt.lat, lng: evt.lng } : undefined,
        syncedFromOffline: true,
      };
      record.computeWorkedHours();
    }
    await record.save();
    results.push(record);
  }

  res.json({ success: true, message: `${results.length} offline event(s) synced`, data: results });
});

// @desc Request attendance regularization
exports.requestRegularization = asyncHandler(async (req, res) => {
  const { date, reason } = req.body;
  const record = await Attendance.findOne({ employee: req.user._id, date });
  if (!record) throw new ApiError(404, 'No attendance record found for this date');

  record.regularization = { requested: true, reason, status: 'pending' };
  await record.save();

  res.json({ success: true, message: 'Regularization request submitted', data: record });
});

// @desc My attendance history (with monthly summary)
exports.getMyAttendance = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const query = { employee: req.user._id };
  if (month && year) {
    query.date = { $regex: `^${year}-${String(month).padStart(2, '0')}` };
  }
  const records = await Attendance.find(query).sort('-date');

  const summary = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { present: 0, absent: 0, 'half-day': 0, leave: 0, holiday: 0 }
  );

  res.json({ success: true, data: records, summary });
});

// @desc Get any employee's attendance (Manager/HR/Admin)
exports.getEmployeeAttendance = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;
  const query = { employee: employeeId };
  if (month && year) {
    query.date = { $regex: `^${year}-${String(month).padStart(2, '0')}` };
  }
  const records = await Attendance.find(query).sort('-date');
  res.json({ success: true, data: records });
});



exports.getAttendanceOverview = asyncHandler(async (req, res) => {
  const date = todayStr();
  const totalEmployees = await User.countDocuments({ role: 'employee' });

  const todayRecords = await Attendance.find({ date }).populate('employee', 'name profilePhoto');

  const present = todayRecords.filter((r) => r.status === 'present').length;
  const halfDay = todayRecords.filter((r) => r.status === 'half-day').length;
  const onLeave = todayRecords.filter((r) => r.status === 'leave').length;
  const holiday = todayRecords.filter((r) => r.status === 'holiday').length;
  const explicitAbsent = todayRecords.filter((r) => r.status === 'absent').length;
  const noShow = Math.max(totalEmployees - todayRecords.length, 0);
  const absent = explicitAbsent + noShow;

  const percentPresent = totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0;

  const today = { present, absent, halfDay, onLeave, percentPresent };

  // ---- Weekly trend: last 7 calendar days ----
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];

    const dayRecords = await Attendance.find({ date: dStr });
    const dayPresent = dayRecords.filter((r) => r.status === 'present' || r.status === 'half-day').length;
    const dayAbsent = Math.max(totalEmployees - dayPresent, 0);

    trend.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      present: dayPresent,
      absent: dayAbsent,
    });
  }

  // ---- Today's log ----
  const log = todayRecords.map((r) => ({
    id: r._id,
    name: r.employee?.name || 'Unknown',
    avatar: r.employee?.profilePhoto || '',
    checkIn: formatTime(r.checkIn?.time) || '--:--',
    checkOut: formatTime(r.checkOut?.time) || '--:--',
    hours: r.workedHours ? `${r.workedHours}h` : '--',
    mode: r.checkIn?.method || '--',
    status: r.status,
  }));

  res.json({ success: true, data: { today, trend, log } });
});


// @desc Monthly attendance — date-wise log (all employees) + per-employee summary (Manager/HR/Admin)
exports.getMonthlyAttendance = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) throw new ApiError(400, 'month and year are required');

  // "2026-07" jaisa prefix — same pattern jo getMyAttendance mein use hua hai
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  const records = await Attendance.find({ date: { $regex: `^${monthPrefix}` } })
    .populate('employee', 'name profilePhoto')
    .sort('-date');

  // (A) DATE-WISE GROUPING — 28 ko kaun aaya, 27 ko kaun
  const dateMap = {};
  for (const r of records) {
    if (!dateMap[r.date]) dateMap[r.date] = [];
    dateMap[r.date].push({
      id: r._id,
      name: r.employee?.name || 'Unknown',
      avatar: r.employee?.profilePhoto || '',
      checkIn: formatTime(r.checkIn?.time) || '--:--',
      checkOut: formatTime(r.checkOut?.time) || '--:--',
      hours: r.workedHours ? `${r.workedHours}h` : '--',
      mode: r.checkIn?.method || '--',
      status: r.status,
    });
  }

  const monthlyLog = Object.entries(dateMap)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // latest date sabse upar
    .map(([date, recs]) => ({ date, records: recs }));

  // (B) PER-EMPLOYEE MONTHLY SUMMARY
  const employeeMap = {};
  for (const r of records) {
    const empId = r.employee?._id?.toString();
    if (!empId) continue;

    if (!employeeMap[empId]) {
      employeeMap[empId] = {
        id: empId,
        name: r.employee.name,
        avatar: r.employee.profilePhoto || '',
        present: 0,
        absent: 0,
        halfDay: 0,
        onLeave: 0,
        holiday: 0,
        totalHours: 0,
      };
    }

    const bucket = employeeMap[empId];
    if (r.status === 'present') bucket.present += 1;
    else if (r.status === 'absent') bucket.absent += 1;
    else if (r.status === 'half-day') bucket.halfDay += 1;
    else if (r.status === 'leave') bucket.onLeave += 1;
    else if (r.status === 'holiday') bucket.holiday += 1;

    if (r.workedHours) bucket.totalHours += r.workedHours;
  }

  const summary = Object.values(employeeMap).map((e) => ({
    ...e,
    totalHours: Math.round(e.totalHours * 10) / 10,
  }));

  res.json({ success: true, data: { monthlyLog, summary } });
});


exports.getAttendanceByDate = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { date } = req.params;

    const record = await Attendance.findOne({ employee: employeeId, date });

    return res.status(200).json({ success: true, data: record || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Attendance request could not be loaded' });
  }
};