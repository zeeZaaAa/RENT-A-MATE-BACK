import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";
import { validateImageBuffer } from "../utils/validateImage.js";
import Mate from "../models/mates.js";
import Renter from "../models/renters.js";

const uploadToCloudinary = (buffer, folder, filename) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename.replace(/\.[^/.]+$/, ""),
        overwrite: true,
        transformation: [{ width: 1600, crop: "limit" }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

export const profile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    await validateImageBuffer(req.file.buffer);

    const userId = req.user.id.toString();
    const role = req.user.role;
    const folder = `users/${userId}/profile`;
    const filename = `${Date.now()}_${req.file.originalname}`;

    let user = await Renter.findById(userId);
    if (!user) user = await Mate.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const result = await uploadToCloudinary(req.file.buffer, folder, filename);

    const oldPublicId = user.pic?.public_id;
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (err) {
        console.warn("Failed to delete old image:", err);
      }
    }

    const update = {
      pic: {
        secure_url: result.secure_url,
        public_id: result.public_id,
        version: result.version,
        width: result.width,
        height: result.height,
        format: result.format,
      },
    };

    if (role === "mate") {
      user = await Mate.findByIdAndUpdate(userId, update, { new: true });
    } else if (role === "renter") {
      user = await Renter.findByIdAndUpdate(userId, update, { new: true });
    } else {
      return res.status(404).json({ message: "Invalid role" });
    }

    return res.status(200).json({ message: "Profile picture updated", pic: update.pic });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Upload failed", details: err.message || err });
  }
};
