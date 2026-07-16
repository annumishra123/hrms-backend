const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: String, required: true },
    location: { type: String, default: 'Remote' },
    employmentType: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], default: 'Full-time' },
    description: { type: String },
    openings: { type: Number, default: 1 },
    status: { type: String, enum: ['open', 'closed', 'on-hold'], default: 'open' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const applicantSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    resumeUrl: { type: String },
    stage: {
      type: String,
      enum: ['applied', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'],
      default: 'applied',
    },
    interviewDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       required: [title, department]
 *       properties:
 *         _id: { type: string }
 *         title: { type: string, example: React Developer }
 *         department: { type: string, example: Engineering }
 *         location: { type: string, example: Varanasi }
 *         employmentType: { type: string, enum: [Full-time, Part-time, Contract, Internship] }
 *         description: { type: string }
 *         openings: { type: integer, example: 12 }
 *         status: { type: string, enum: [open, closed, on-hold] }
 *     Applicant:
 *       type: object
 *       required: [job, name, email]
 *       properties:
 *         _id: { type: string }
 *         job: { type: string }
 *         name: { type: string, example: Riya Singh }
 *         email: { type: string }
 *         phone: { type: string }
 *         resumeUrl: { type: string }
 *         stage: { type: string, enum: [applied, shortlisted, interview, offered, hired, rejected] }
 *         interviewDate: { type: string, format: date-time }
 */
module.exports = {
  Job: mongoose.model('Job', jobSchema),
  Applicant: mongoose.model('Applicant', applicantSchema),
};
