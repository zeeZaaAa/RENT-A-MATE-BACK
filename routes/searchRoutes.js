import express from 'express';
import { getCity, searchMate, getMateData, isLiked } from '../controllers/searchController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/cities', authenticate, getCity);
router.get('/mates', authenticate, requireRole("renter"), searchMate);
router.get('/mate-data', authenticate, requireRole("renter"), getMateData);
router.get('/isLiked', authenticate, requireRole("renter"), isLiked);

export default router;