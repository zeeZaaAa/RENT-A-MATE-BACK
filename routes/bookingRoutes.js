import {book, confirmBooking, getMateProfile, getBookindData, unavaliable, request, acceptRequest, rejectRequest, getTransactions, cancelTransaction, mate, endBooking} from '../controllers/bookingController.js'
import express from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/book', authenticate, requireRole("renter"), book);
router.post('/confirmbooking', authenticate, requireRole("renter"), confirmBooking);
router.get('/booking-data', authenticate, requireRole("renter"), getBookindData);
router.get('/mate-profile', authenticate, requireRole("renter"), getMateProfile);
router.get('/unavaliable', authenticate, requireRole("renter"), unavaliable);
router.get('/requests', authenticate, requireRole("mate"), request);
router.post('/:id/accept', authenticate, requireRole("mate"), acceptRequest);
router.post('/:id/reject', authenticate, requireRole("mate"), rejectRequest);
router.get('/transactions', authenticate, requireRole("renter"), getTransactions);
router.post('/cancel/:id', authenticate, requireRole("renter"), cancelTransaction);
router.get('/mate', authenticate, requireRole("mate"), mate);
router.post('/end/:id', authenticate, requireRole("mate"), endBooking);

export default router;
