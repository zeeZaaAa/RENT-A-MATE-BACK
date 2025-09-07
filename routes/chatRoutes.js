import express from "express";
import { getChatList, createChatRoom, getMessages, room} from "../controllers/chatController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// ใช้ authMiddleware เพื่อเช็ค token
router.get("/", authenticate, getChatList);
router.post("/create", authenticate, requireRole("renter"), createChatRoom);
router.get("/message/:roomId", authenticate, getMessages);
router.get("/room/:roomId", authenticate, room);

export default router;