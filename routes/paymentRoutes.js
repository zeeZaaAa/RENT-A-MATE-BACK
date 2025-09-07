import express from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';
import { createPaymentIntent } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-payment-intent', authenticate, requireRole("renter"), createPaymentIntent);

export default router;