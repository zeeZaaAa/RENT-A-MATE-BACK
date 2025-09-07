import jwt from "jsonwebtoken";
import Message from "../models/message.js";
import ChatRoom from "../models/chatroom.js";

export default function chatSocket(io) {
  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.disconnect(true);
      return;
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      console.error("Invalid token:", err.message);
      socket.disconnect(true);
      return;
    }

    console.log("User connected:", user.id);

    socket.on("joinRoom", async (roomId) => {
      if (!roomId) return;

      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      if (!room.participants.includes(user.id)) {
        console.log(
          `User ${user.id} tried to join room ${roomId} without permission`
        );
        return; // ไม่อนุญาตให้เข้าห้อง
      }

      socket.join(roomId);
      console.log(`User ${user.id} joined room ${roomId}`);
    });

    socket.on("sendMessage", async ({ roomId, text }) => {
      if (!roomId || !text) return;

      const room = await ChatRoom.findById(roomId);
      if (!room || !room.participants.includes(user.id)) {
        console.log(
          `User ${user.id} tried to send message to room ${roomId} without permission`
        );
        return;
      }

      try {
        const msg = await Message.create({
          chatRoomId: roomId,
          sender: user.id,
          senderModel: user.role,
          text,
          readBy: [user.id],
          readByModel: [user.role],
        });

        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: text,
          updatedAt: new Date(),
        });

        io.to(roomId).emit("newMessage", msg);
      } catch (err) {
        console.error("sendMessage error:", err);
      }
    });

    socket.on("markAsRead", async ({ roomId }) => {
      if (!roomId) return;
      try {
        await Message.updateMany(
          { chatRoomId: roomId, readBy: { $ne: user.id } },
          { $push: { readBy: user.id, readByModel: user.role } }
        );
      } catch (err) {
        console.error("markAsRead error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", user.id);
    });
  });
}
