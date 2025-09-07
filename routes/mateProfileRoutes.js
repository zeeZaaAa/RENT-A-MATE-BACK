import { me, updateMe } from "../controllers/mateProfileController.js";
import express from "express";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", authenticate, requireRole("mate"), me);
router.put("/me", authenticate, requireRole("mate"), updateMe);

export default router;
