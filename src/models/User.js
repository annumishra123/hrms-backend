const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Counter = require('../middleware/Counter');

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, index: true }, // e.g. EMP00125
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['employee', 'manager', 'hr', 'admin'],
      default: 'employee',
    },
    designation: { type: String, default: 'Software Developer' },
    department: { type: String, default: 'Engineering' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dateOfJoining: { type: Date, default: Date.now },
    profilePhoto: { type: String, default: '' },
    faceEmbeddingRef: { type: String, default: null }, // reference/id to stored face template (liveness login)
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    mfaEnabled: { type: Boolean, default: false },
    otp: { type: String, select: false },
    socketId: {type: String, default: null},
    otpExpires: { type: Date, select: false },
    leaveBalance: {
      casual: { type: Number, default: 12 },
      earned: { type: Number, default: 18 },
      sick: { type: Number, default: 6 },
      privilege: { type: Number, default: 3 },
    },
    salary: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      otherAllowance: { type: Number, default: 0 },
      pf: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
    },
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Auto-generate employeeId if not provided
userSchema.pre("save", async function (next) {
  try {
    if (this.employeeId) return next();

    const counter = await Counter.findOneAndUpdate(
      { _id: "employeeId" },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
      }
    );

    this.employeeId = `EMP${String(counter.seq).padStart(5, "0")}`;

    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.netSalary = function () {
  const s = this.salary;
  const gross = (s.basic || 0) + (s.hra || 0) + (s.specialAllowance || 0) + (s.otherAllowance || 0);
  const deductions = (s.pf || 0) + (s.professionalTax || 0);
  return gross - deductions;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         employeeId: { type: string, example: EMP01025 }
 *         name: { type: string, example: Anurag Mishra }
 *         email: { type: string, example: anurag@techsoft.com }
 *         phone: { type: string, example: "+91-9876543210" }
 *         role: { type: string, enum: [employee, manager, hr, admin] }
 *         designation: { type: string, example: Software Developer }
 *         department: { type: string, example: Engineering }
 *         dateOfJoining: { type: string, format: date-time }
 *         socketId: {type: String, default: null},
 *         leaveBalance:
 *           type: object
 *           properties:
 *             casual: { type: number }
 *             earned: { type: number }
 *             sick: { type: number }
 *             privilege: { type: number }
 *         isActive: { type: boolean }
 */
module.exports = mongoose.model('User', userSchema);
