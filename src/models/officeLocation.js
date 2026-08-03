const mongoose = require("mongoose");

const officeLocationSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Head Office" },
    address: { type: String, default: "" },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    restrictionEnabled: { type: Boolean, default: true },
    radiusMeters: { type: Number, required: true, default: 20 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfficeLocation", officeLocationSchema);