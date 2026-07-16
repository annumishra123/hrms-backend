const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const upload = require('../config/upload');

router.use(protect);

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Upload a document to the personal document vault
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *               docType: { type: string, enum: [Aadhaar, PAN, OfferLetter, SalarySlip, ExperienceLetter, Other] }
 *               expiryDate: { type: string, format: date }
 *     responses:
 *       201: { description: Document uploaded successfully }
 *   get:
 *     summary: List my uploaded documents
 *     tags: [Documents]
 *     responses:
 *       200: { description: List of documents }
 */
router.route('/').post(upload.single('file'), ctrl.uploadDocument).get(ctrl.getMyDocuments);

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Delete a document from vault
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Document deleted }
 */
router.delete('/:id', ctrl.deleteDocument);

/**
 * @swagger
 * /documents/id-card:
 *   get:
 *     summary: Get digital employee ID card data (for e-badge display)
 *     tags: [Documents]
 *     responses:
 *       200: { description: Digital ID card details }
 */
router.get('/id-card', ctrl.getDigitalIdCard);

/**
 * @swagger
 * /documents/expiring:
 *   get:
 *     summary: Get my documents expiring soon (reminders)
 *     tags: [Documents]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200: { description: Documents expiring within the given window }
 */
router.get('/expiring', ctrl.getExpiringDocuments);

module.exports = router;
