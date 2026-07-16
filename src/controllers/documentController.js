const Document = require('../models/Document');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// @desc Upload a document to vault
exports.uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  const { docType, expiryDate } = req.body;

  const fileUrl = `${process.env.BASE_URL || ''}/uploads/${req.file.filename}`;

  const doc = await Document.create({
    employee: req.user._id,
    docType,
    fileName: req.file.originalname,
    fileUrl,
    expiryDate,
  });

  res.status(201).json({ success: true, message: 'Document uploaded successfully', data: doc });
});

// @desc List my documents
exports.getMyDocuments = asyncHandler(async (req, res) => {
  const docs = await Document.find({ employee: req.user._id }).sort('-createdAt');
  res.json({ success: true, data: docs });
});

// @desc Delete a document
exports.deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOneAndDelete({ _id: req.params.id, employee: req.user._id });
  if (!doc) throw new ApiError(404, 'Document not found');
  res.json({ success: true, message: 'Document deleted' });
});

// @desc Digital ID card data (name, designation, photo, employeeId, validity, barcode payload)
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

// @desc Documents expiring within N days (default 30) - reminders
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
