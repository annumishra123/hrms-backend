const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Multer memoryStorage se aaya hua buffer seedha Cloudinary pe upload karta hai.
 * @param {Buffer} fileBuffer - req.file.buffer
 * @param {string} folder - Cloudinary me kis folder me save karna hai (e.g. 'hrms/documents')
 * @param {string} resourceType - 'image' | 'raw' | 'auto'
 */
function uploadToCloudinary(fileBuffer, folder = 'hrms/documents', resourceType = 'auto') {
  return new Promise((resolve, reject) => {
    // ✅ Guard: buffer missing hone par crash nahi, proper rejected error
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      return reject(
        new Error(
          'File buffer is missing or invalid — check that Multer is using memoryStorage (upload.single field name must match the form field).'
        )
      );
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType, // 'auto' images + pdf dono handle kar lega
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload returned no result'));
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

function deleteFromCloudinary(publicId, resourceType = 'auto') {
  if (!publicId) return Promise.resolve(null); // kuch delete karne layak nahi
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };