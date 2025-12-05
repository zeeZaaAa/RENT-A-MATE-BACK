import jwt from 'jsonwebtoken';
import RefreshTokenModel from '../models/refreshToken.js';
import { generateAccessToken } from '../utils/genToken.js';

export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token provided' });

  try {
    const storedToken = await RefreshTokenModel.findOne({ token: refreshToken });
    if (!storedToken) return res.status(403).json({ message: 'Invalid refresh token' });

    // verify refresh token
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid refresh token' });

      const accessToken = generateAccessToken(user);
      res.json({ accessToken });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
