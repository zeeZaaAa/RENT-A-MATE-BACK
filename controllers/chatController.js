import ChatRoom from "../models/chatroom.js";
import Message from "../models/message.js";
import Mate from "../models/mates.js";
import Renter from "../models/renters.js";

export const getChatList = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 6;

    const chatRooms = await ChatRoom.find({
      "participants.participantId": userId,
    })
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate({
        path: "participants.participantId",
        select: "name surName role pic",
        refPath: "participants.participantModel",
      });

    const totalCount = await ChatRoom.countDocuments({
      "participants.participantId": userId,
    });
    const totalPages = Math.ceil(totalCount / pageSize);

    const chatList = chatRooms.map((room) => {
      const other = room.participants.find(
        (p) => p.participantId._id.toString() !== userId
      );

      return {
        id: room._id,
        roomId: room._id,
        user: other
          ? `${other.participantId.name} ${other.participantId.surName}`
          : "Unknown",
        message: room.lastMessage || "",
        pic: other?.participantId?.pic || "",
        unread: room.lastMessage && room.lastMessageAt ? true : false,
        updatedAt: room.updatedAt,
      };
    });

    res.json({ chatList, totalPages, page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /chat/create
export const createChatRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role; 
    const { participantId, participantRole } = req.body; 

    if (!participantId || !participantRole) {
      return res
        .status(400)
        .json({ message: "participantId and participantRole are required" });
    }

    if (
      !["mate", "renter"].includes(userRole) ||
      !["mate", "renter"].includes(participantRole)
    ) {
      return res.status(400).json({ message: "Invalid role" });
    }

    let chatRoom = await ChatRoom.findOne({
      "participants.participantId": { $all: [userId, participantId] },
    });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        participants: [
          {
            participantId: userId,
            participantModel: userRole === "mate" ? "Mate" : "Renter",
          },
          {
            participantId: participantId,
            participantModel: participantRole === "mate" ? "Mate" : "Renter",
          },
        ],
        lastMessage: "",
      });

      if (userRole === "mate") {
        await Mate.findByIdAndUpdate(userId, {
          $push: { chatRoomIds: chatRoom._id },
        });
      } else {
        await Renter.findByIdAndUpdate(userId, {
          $push: { chatRoomIds: chatRoom._id },
        });
      }

      if (participantRole === "mate") {
        await Mate.findByIdAndUpdate(participantId, {
          $push: { chatRoomIds: chatRoom._id },
        });
      } else {
        await Renter.findByIdAndUpdate(participantId, {
          $push: { chatRoomIds: chatRoom._id },
        });
      }
    }

    chatRoom = await chatRoom.populate({
      path: "participants.participantId",
      select: "name surName role pic",
    });

    res.status(200).json({
      message: "ChatRoom created",
      chatRoom: {
        id: chatRoom._id,
        participants: chatRoom.participants,
        updatedAt: chatRoom.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize) || 50, 100);

    const messages = await Message.find({ chatRoomId: roomId })
      .sort({ createdAt: 1 }) 
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.status(200).json({
      success: true,
      page,
      pageSize,
      count: messages.length,
      messages,
    });
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const room = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const chatRoom = await ChatRoom.findById(roomId).lean();
    if (!chatRoom)
      return res
        .status(404)
        .json({ success: false, message: "Room not found" });

    const otherParticipant = chatRoom.participants.find(
      (p) => p.participantId.toString() !== userId
    );

    if (!otherParticipant) {
      return res
        .status(404)
        .json({ success: false, message: "No other participant found" });
    }

    let participant;
    if (otherParticipant.participantModel === "Mate") {
      participant = await Mate.findById(
        otherParticipant.participantId,
        "name surName pic"
      ).lean();
    } else if (otherParticipant.participantModel === "Renter") {
      participant = await Renter.findById(
        otherParticipant.participantId,
        "name surName pic"
      ).lean();
    }

    res
      .status(200)
      .json({ success: true, participants: participant ? [participant] : [] });
  } catch (err) {
    console.error("getChatRoom error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
