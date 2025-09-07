import mongoose from 'mongoose';
import { ProfileImageSchema, defaultPic } from './profileImage.js';

const renterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  birthDate: { type: Date, required: true },
  role: { type: String, default: 'renter', enum: ['renter'], required: true },
  interest: {type: String},
  pic: { type: ProfileImageSchema, default: defaultPic },
  transactionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
  liked: [{ type: mongoose.Schema.Types.ObjectId, ref: "Mate"  }],
  chatRoomIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom" }]
}, { timestamps: true });

const Renter = mongoose.model('Renter', renterSchema);

export default Renter;
