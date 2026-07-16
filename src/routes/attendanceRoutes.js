const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * /attendance/qr/generate:
 *   get:
 *     summary: Generate a fresh short-lived QR token for office gate display (HR/Admin)
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: gate
 *         schema: { type: string, example: "Office Main Gate" }
 *     responses:
 *       200: { description: QR token generated (valid for 2 minutes) }
 */
router.get('/qr/generate', authorize('hr', 'admin'), ctrl.generateQr);

/**
 * @swagger
 * /attendance/qr/checkin:
 *   post:
 *     summary: Check-in by scanning the office QR code
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [qrToken]
 *             properties:
 *               qrToken: { type: string }
 *     responses:
 *       200: { description: Checked in successfully }
 *       400: { description: QR invalid or expired }
 *       409: { description: Already checked in }
 */
router.post('/qr/checkin', ctrl.qrCheckIn);

/**
 * @swagger
 * /attendance/gps/checkin:
 *   post:
 *     summary: Check-in via GPS - verifies employee is within office geofence radius
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lat, lng]
 *             properties:
 *               lat: { type: number, example: 25.3176 }
 *               lng: { type: number, example: 82.9739 }
 *     responses:
 *       200: { description: Checked in successfully via GPS }
 *       403: { description: Outside allowed geofence radius }
 */
router.post('/gps/checkin', ctrl.gpsCheckIn);

/**
 * @swagger
 * /attendance/face/checkin:
 *   post:
 *     summary: Check-in via Face Login with liveness detection (blink/head-turn anti-spoof)
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [livenessVerified]
 *             properties:
 *               livenessVerified: { type: boolean, description: "Result from client-side/AI liveness SDK" }
 *               confidenceScore: { type: number, example: 0.97 }
 *     responses:
 *       200: { description: Face verified, checked in successfully }
 *       400: { description: Liveness verification failed }
 */
router.post('/face/checkin', ctrl.faceCheckIn);

/**
 * @swagger
 * /attendance/checkout:
 *   post:
 *     summary: Check-out for the day
 *     tags: [Attendance]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method: { type: string, enum: [qr, gps, face, manual], example: manual }
 *               lat: { type: number }
 *               lng: { type: number }
 *     responses:
 *       200: { description: Checked out successfully }
 *       400: { description: Must check-in before checking out }
 */
router.post('/checkout', ctrl.checkOut);

/**
 * @swagger
 * /attendance/offline-sync:
 *   post:
 *     summary: Bulk-sync attendance events recorded while device was offline
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [events]
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date: { type: string, example: "2026-07-15" }
 *                     type: { type: string, enum: [checkin, checkout] }
 *                     time: { type: string, format: date-time }
 *                     method: { type: string, enum: [qr, gps, face, manual] }
 *                     lat: { type: number }
 *                     lng: { type: number }
 *     responses:
 *       200: { description: Offline events synced successfully }
 */
router.post('/offline-sync', ctrl.offlineSync);

/**
 * @swagger
 * /attendance/regularize:
 *   post:
 *     summary: Request attendance regularization for a past date
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, reason]
 *             properties:
 *               date: { type: string, example: "2026-07-10" }
 *               reason: { type: string, example: "Forgot to check-in, was on client site" }
 *     responses:
 *       200: { description: Regularization request submitted }
 */
router.post('/regularize', ctrl.requestRegularization);

/**
 * @swagger
 * /attendance/me:
 *   get:
 *     summary: Get my attendance history with monthly summary
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, example: 5 }
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *     responses:
 *       200: { description: Attendance history with summary counts }
 */
router.get('/me', ctrl.getMyAttendance);

/**
 * @swagger
 * /attendance/employee/{employeeId}:
 *   get:
 *     summary: Get an employee's attendance (Manager/HR/Admin)
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Attendance records }
 */
router.get('/employee/:employeeId', authorize('manager', 'hr', 'admin'), ctrl.getEmployeeAttendance);

module.exports = router;
