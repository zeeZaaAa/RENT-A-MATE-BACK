import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema(
  {
    participants: [{
      participantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "participants.participantModel"
      },
      participantModel: {
        type: String,
        required: true,
        enum: ["Mate", "Renter"]
      }
    }],
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

export default ChatRoom;