const mongoose = require('mongoose');

const keyResultSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const okrSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quarter: { type: String, required: true, example: 'Q2 2026' },
    objective: { type: String, required: true },
    keyResults: [keyResultSchema],
    overallProgress: { type: Number, default: 0 },
  },
  { timestamps: true }
);

okrSchema.pre('save', function (next) {
  if (this.keyResults.length) {
    const total = this.keyResults.reduce((sum, kr) => sum + kr.progress, 0);
    this.overallProgress = Math.round(total / this.keyResults.length);
  }
  next();
});

const reviewSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewCycle: { type: String, required: true }, // e.g. "Q2 2026"
    selfRating: { type: Number, min: 1, max: 5 },
    managerRating: { type: Number, min: 1, max: 5 },
    peerRating: { type: Number, min: 1, max: 5 },
    directReportsRating: { type: Number, min: 1, max: 5 },
    overallRating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    status: { type: String, enum: ['in-progress', 'submitted', 'finalized'], default: 'in-progress' },
  },
  { timestamps: true }
);

reviewSchema.pre('save', function (next) {
  const ratings = [this.selfRating, this.managerRating, this.peerRating, this.directReportsRating].filter(Boolean);
  if (ratings.length) {
    this.overallRating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
  }
  next();
});

/**
 * @swagger
 * components:
 *   schemas:
 *     OKR:
 *       type: object
 *       required: [quarter, objective]
 *       properties:
 *         _id: { type: string }
 *         employee: { type: string }
 *         quarter: { type: string, example: "Q2 2026" }
 *         objective: { type: string, example: Improve Product Quality }
 *         keyResults:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title: { type: string, example: Reduce Bugs by 30% }
 *               progress: { type: number, example: 70 }
 *         overallProgress: { type: number }
 *     PerformanceReview:
 *       type: object
 *       required: [reviewCycle]
 *       properties:
 *         _id: { type: string }
 *         employee: { type: string }
 *         reviewCycle: { type: string, example: "Q2 2026" }
 *         selfRating: { type: number, example: 4.5 }
 *         managerRating: { type: number, example: 4.3 }
 *         peerRating: { type: number, example: 4.1 }
 *         directReportsRating: { type: number, example: 4.0 }
 *         overallRating: { type: number }
 *         feedback: { type: string }
 *         status: { type: string, enum: [in-progress, submitted, finalized] }
 */
module.exports = {
  OKR: mongoose.model('OKR', okrSchema),
  PerformanceReview: mongoose.model('PerformanceReview', reviewSchema),
};
