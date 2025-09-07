import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { multerMiddleware } from "../middleware/uploadSanitizer.js";
import { profile } from "../controllers/cloudinaryController.js";

const router = express.Router();

router.post("/upload", authenticate, multerMiddleware.single("file"), profile);

export default router;
