const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    docType: {
      type: String,
      enum: ['Aadhaar', 'PAN', 'OfferLetter', 'SalarySlip', 'ExperienceLetter', 'Other'],
      default: 'Other',
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    expiryDate: { type: Date },
    uploadedOn: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Document:
 *       type: object
 *       required: [fileName, fileUrl]
 *       properties:
 *         _id: { type: string }
 *         employee: { type: string }
 *         docType: { type: string, enum: [Aadhaar, PAN, OfferLetter, SalarySlip, ExperienceLetter, Other] }
 *         fileName: { type: string, example: aadhaar_card.pdf }
 *         fileUrl: { type: string }
 *         expiryDate: { type: string, format: date }
 */
module.exports = mongoose.model('Document', documentSchema);
