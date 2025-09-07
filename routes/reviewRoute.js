import express from "express";
import { addReview } from "../controllers/reviewController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/booking/:id", authenticate, requireRole("renter"), addReview);

export default router;