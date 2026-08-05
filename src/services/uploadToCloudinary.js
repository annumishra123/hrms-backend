const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Multer memoryStorage se aaya hua buffer seedha Cloudinary pe upload karta hai.
 * @param {Buffer} fileBuffer - req.file.buffer
 * @param {string} folder - Cloudinary me kis folder me save karna hai (e.g. 'hrms/documents')
 * @param {string} resourceType - 'image' | 'raw' (PDF ke liye 'raw' ya 'auto')
 */
function uploadToCloudinary(fileBuffer, folder = 'hrms/documents', resourceType = 'auto') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType, // 'auto' images + pdf dono handle kar lega
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

function deleteFromCloudinary(publicId, resourceType = 'auto') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };