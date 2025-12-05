import express from "express";
import { getLikedMates, toggleLike } from "../controllers/likedMateController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/likes", authenticate, requireRole("renter"), getLikedMates);
router.post("/likes/toggle", authenticate, requireRole("renter"), toggleLike);

export default router;