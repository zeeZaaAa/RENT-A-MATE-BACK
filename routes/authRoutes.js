import express from 'express';
import { register, login, verifyEmail, logout } from '../controllers/authController.js';
import { refreshAccessToken } from '../controllers/refreshTokenController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logout);

export default router;
