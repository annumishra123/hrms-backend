const cloudinary = require('../config/cloudinary');
const User = require('../models/User');

/**
 * Helper: Buffer ko Cloudinary pe upload karta hai (stream ke through)
 */
const uploadToCloudinary = async (buffer, folder) => {
  const base64 = buffer.toString("base64");
  const dataURI = `data:image/jpeg;base64,${base64}`;

  return await cloudinary.uploader.upload(dataURI, {
    folder,
    resource_type: "image",
    transformation: [
      {
        width: 500,
        height: 500,
        crop: "fill",
        gravity: "face",
      },
    ],
  });
};

/**
 * @desc   Get logged-in user's full profile
 * @route  GET /api/profile/me
 * @access Private
 */
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+aadhaarNumber');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc   Update personal information + optionally profile photo (Cloudinary)
 * @route  PUT /api/profile/update
 * @access Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('+profilePhotoId');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const {
      name,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      pincode,
      aadhaarNumber,
      panNumber,
    } = req.body;

    // ---------- Validation ----------
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });
    }

    if (phone !== undefined && phone !== '' && phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'Phone number must be at least 10 digits' });
    }

    if (aadhaarNumber !== undefined && aadhaarNumber !== '' && !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({ success: false, message: 'Aadhaar number must be exactly 12 digits' });
    }

    if (panNumber !== undefined && panNumber !== '' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid PAN format (e.g. ABCDE1234F)' });
    }

    // ---------- Update text fields ----------
    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined) user.gender = gender;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (pincode !== undefined) user.pincode = pincode;
    if (aadhaarNumber !== undefined) user.aadhaarNumber = aadhaarNumber;
    if (panNumber !== undefined) user.panNumber = panNumber.toUpperCase();

    // ---------- Profile Photo Upload (Cloudinary) ----------
    if (req.file) {
      // Purani Cloudinary image delete karo (agar hai)
      if (user.profilePhotoId) {
        try {
          await cloudinary.uploader.destroy(user.profilePhotoId);
        } catch (delErr) {
          console.warn('Old Cloudinary image delete failed:', delErr.message);
        }
      }

      const result = await uploadToCloudinary(req.file.buffer, 'hr-app/profile-photos');

      user.profilePhoto = result.secure_url;   // 👈 ye DB me save hoga, frontend seedha isse dikhayega
      user.profilePhotoId = result.public_id;  // future delete/replace ke liye
    }

    await user.save();

    const updatedUser = await User.findById(userId).select('+aadhaarNumber');

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (err) {
    console.error('Update profile error:', err);

    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'This email/phone already exists' });
    }

    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};