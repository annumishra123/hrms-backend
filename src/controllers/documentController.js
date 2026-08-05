const Document = require('../models/Document');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadToCloudinary');

// ─────────────────────────────────────────────
// @desc Upload a document to vault (ab Cloudinary pe jayega, disk pe nahi)
// @route POST /api/documents
// ─────────────────────────────────────────────
exports.uploadDocument = asyncHandler(async (req, res) => {

  if (!req.file) throw new ApiError(400, 'No file uploaded');

  if (!req.file.buffer) {
    throw new ApiError(
      500,
      'File buffer missing — server upload middleware misconfigured (expected memoryStorage)'
    );
  }

  const { docType, expiryDate } = req.body;

  // Cloudinary pe upload karo
  const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
  const result = await uploadToCloudinary(
    req.file.buffer,
    'hrms/documents',
    resourceType
  );

  const doc = await Document.create({
    employee: req.user._id,
    docType,
    fileName: req.file.originalname,
    fileUrl: result.secure_url,
    cloudinaryPublicId: result.public_id, // baad me delete karne ke liye
    resourceType,
    expiryDate: expiryDate || null,
  });

  res.status(201).json({ success: true, message: 'Document uploaded successfully', data: doc });
});

// ─────────────────────────────────────────────
// @desc List my documents
// @route GET /api/documents
// ─────────────────────────────────────────────
exports.getMyDocuments = asyncHandler(async (req, res) => {
  const docs = await Document.find({ employee: req.user._id }).sort('-createdAt');
  res.json({ success: true, data: docs });
});

// ─────────────────────────────────────────────
// @desc Delete a document (Cloudinary se bhi delete hoga)
// @route DELETE /api/documents/:id
// ─────────────────────────────────────────────
exports.deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, employee: req.user._id });
  if (!doc) throw new ApiError(404, 'Document not found');

  if (doc.cloudinaryPublicId) {
    try {
      await deleteFromCloudinary(doc.cloudinaryPublicId, doc.resourceType || 'image');
    } catch (err) {
      console.log('Cloudinary delete failed (continuing anyway):', err.message);
    }
  }

  await doc.deleteOne();
  res.json({ success: true, message: 'Document deleted' });
});

// ─────────────────────────────────────────────
// @desc Digital ID card data
// ─────────────────────────────────────────────
exports.getDigitalIdCard = asyncHandler(async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      employeeId: user.employeeId,
      name: user.name,
      designation: user.designation,
      department: user.department,
      profilePhoto: user.profilePhoto,
      dateOfJoining: user.dateOfJoining,
      validUpto: new Date(new Date().getFullYear() + 1, 11, 31),
      barcodePayload: `HRMS|${user.employeeId}|${user._id}`,
    },
  });
});

// ─────────────────────────────────────────────
// @desc Documents expiring within N days
// ─────────────────────────────────────────────
exports.getExpiringDocuments = asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const docs = await Document.find({
    employee: req.user._id,
    expiryDate: { $ne: null, $lte: cutoff },
  }).sort('expiryDate');
  res.json({ success: true, data: docs });
});