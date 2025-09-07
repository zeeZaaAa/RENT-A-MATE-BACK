import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatRoomId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, refPath: "senderModel", required: true },
    senderModel: { type: String, enum: ["Mate", "Renter"], required: true }, // ตรงกับชื่อ model
    text: { type: String, required: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, refPath: "readByModel" }],
    readByModel: [{ type: String, enum: ["Mate", "Renter"] }],
  },
  { timestamps: true }
);

messageSchema.index({ chatRoomId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
