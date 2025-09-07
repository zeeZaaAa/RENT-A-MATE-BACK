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

    // ----------------- joinRoom -----------------
    socket.on("joinRoom", async (roomId) => {
      if (!roomId) return;

      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      const isParticipant = room.participants.some(
        (p) => p.participantId.toString() === user.id
      );

      if (!isParticipant) {
        console.log(
          `User ${user.id} tried to join room ${roomId} without permission`
        );
        return;
      }

      socket.join(roomId);
      console.log(`User ${user.id} joined room ${roomId}`);
    });

    // ----------------- sendMessage -----------------
    socket.on("sendMessage", async ({ roomId, text }) => {
      if (!roomId || !text) return;

      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      const senderInfo = room.participants.find(
        (p) => p.participantId.toString() === user.id
      );
      if (!senderInfo) {
        console.log(
          `User ${user.id} tried to send message to room ${roomId} without permission`
        );
        return;
      }

      try {
        const msg = await Message.create({
          chatRoomId: roomId,
          sender: user.id,
          senderModel: senderInfo.participantModel, // เอา role จาก room
          text,
          readBy: [user.id],
          readByModel: [senderInfo.participantModel],
        });

        // อัปเดต lastMessage ใน room
        room.lastMessage = text;
        room.lastMessageAt = new Date();
        room.updatedAt = new Date();
        await room.save();

        io.to(roomId).emit("newMessage", msg);
      } catch (err) {
        console.error("sendMessage error:", err);
      }
    });

    // ----------------- markAsRead -----------------
    socket.on("markAsRead", async ({ roomId }) => {
      if (!roomId) return;

      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) return;

        const participantInfo = room.participants.find(
          (p) => p.participantId.toString() === user.id
        );
        if (!participantInfo) return;

        await Message.updateMany(
          {
            chatRoomId: roomId,
            readBy: { $ne: user.id },
          },
          {
            $push: {
              readBy: user.id,
              readByModel: participantInfo.participantModel,
            },
          }
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
