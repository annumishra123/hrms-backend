const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: { type: String, enum: ['Company', 'Department', 'Policy', 'Event'], default: 'Company' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true },
    description: { type: String },
    category: { type: String, enum: ['IT', 'HR', 'Payroll', 'Facilities', 'Other'], default: 'Other' },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: [
      {
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Announcement:
 *       type: object
 *       required: [title, message]
 *       properties:
 *         _id: { type: string }
 *         title: { type: string, example: Office Holiday }
 *         message: { type: string, example: 24 May 2025 will be observed on account of Id-ul-fitr }
 *         category: { type: string, enum: [Company, Department, Policy, Event] }
 *         pinned: { type: boolean }
 *     Ticket:
 *       type: object
 *       required: [subject]
 *       properties:
 *         _id: { type: string }
 *         raisedBy: { type: string }
 *         subject: { type: string, example: Laptop not working }
 *         description: { type: string }
 *         category: { type: string, enum: [IT, HR, Payroll, Facilities, Other] }
 *         status: { type: string, enum: [open, in-progress, resolved, closed] }
 */
module.exports = {
  Announcement: mongoose.model('Announcement', announcementSchema),
  Ticket: mongoose.model('Ticket', ticketSchema),
};
