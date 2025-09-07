import express from 'express';
import http from "http";
import { Server } from "socket.io";
import cors from 'cors';
import helmet from "helmet";
import dotenv from 'dotenv';
import rateLimit from "express-rate-limit";
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import profileRoute from "./routes/profileRoutes.js"
import searchRoutes from "./routes/searchRoutes.js"
import mateProfileRoutes from "./routes/mateProfileRoutes.js"
import reviewRoute from "./routes/reviewRoute.js"
import chatSocket from './websockets/chat.js';
import chatRoutes from './routes/chatRoutes.js'
import likeMateRoutes from "./routes/likeMateRoutes.js"

dotenv.config();

import "./utils/autoRefunded.js"

const app = express();
const server = http.createServer(app); // ใช้ http.Server
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONT_API], // frontend ของคุณ
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT;

connectDB();

app.use(cors({
  origin: [`${process.env.FRONT_API}`],
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());
app.use(helmet());
app.use(rateLimit({ windowMs: 1 * 60 * 1000, max: 100 }));


app.use('/api/auth', authRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/profile', profileRoute);
app.use('/search', searchRoutes);
app.use('/mate', mateProfileRoutes);
app.use('/review', reviewRoute);
app.use("/api/chat", chatRoutes);
app.use('/api/renter', likeMateRoutes);

chatSocket(io)

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
