import multer from "multer";
import dotenv from "dotenv";
dotenv.config();

const MAX = parseInt(process.env.MAX_UPLOAD_SIZE, 10); 

export const multerMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX },
  fileFilter: (req, file, cb) => {
    // quick filter by mimetype (first line of defense)
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only .jpg, .jpeg, .png, .webp allowed"), false);
    }
    cb(null, true);
  },
});
