const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD for easy per-day lookup
    checkIn: {
      time: { type: Date },
      method: { type: String, enum: ['qr', 'gps', 'face', 'manual'], default: 'manual' },
      location: {
        lat: { type: Number },
        lng: { type: Number },
      },
      distanceFromOfficeMeters: { type: Number },
      withinGeofence: { type: Boolean, default: null },
      livenessVerified: { type: Boolean, default: null },
      syncedFromOffline: { type: Boolean, default: false },
    },
    checkOut: {
      time: { type: Date },
      method: { type: String, enum: ['qr', 'gps', 'face', 'manual'] },
      location: {
        lat: { type: Number },
        lng: { type: Number },
      },
      syncedFromOffline: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day', 'leave', 'holiday'],
      default: 'present',
    },
    workedHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    regularization: {
      requested: { type: Boolean, default: false },
      reason: { type: String },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

attendanceSchema.methods.computeWorkedHours = function () {
  if (this.checkIn?.time && this.checkOut?.time) {
    const ms = new Date(this.checkOut.time) - new Date(this.checkIn.time);
    this.workedHours = Math.round((ms / 1000 / 60 / 60) * 100) / 100;
    this.overtimeHours = this.workedHours > 9 ? Math.round((this.workedHours - 9) * 100) / 100 : 0;
  }
  return this.workedHours;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Attendance:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         employee: { type: string, description: User ObjectId }
 *         date: { type: string, example: "2026-07-16" }
 *         checkIn:
 *           type: object
 *           properties:
 *             time: { type: string, format: date-time }
 *             method: { type: string, enum: [qr, gps, face, manual] }
 *             location:
 *               type: object
 *               properties:
 *                 lat: { type: number }
 *                 lng: { type: number }
 *             withinGeofence: { type: boolean }
 *             livenessVerified: { type: boolean }
 *         checkOut:
 *           type: object
 *           properties:
 *             time: { type: string, format: date-time }
 *             method: { type: string, enum: [qr, gps, face, manual] }
 *         status: { type: string, enum: [present, absent, half-day, leave, holiday] }
 *         workedHours: { type: number }
 *         overtimeHours: { type: number }
 */
module.exports = mongoose.model('Attendance', attendanceSchema);
