import mongoose from 'mongoose';
import { ProfileImageSchema, defaultPic } from './profileImage.js';


const mateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  birthDate: { type: Date, required: true },
  role: { type: String, default: 'mate', enum: ['mate'], required: true },
  price_rate: {type: Number},
  pic: { type: ProfileImageSchema, default: defaultPic },
  nickname: {type: String},
  interest: [{type: String}],
  review_rate: {type: Number},
  skill: [{type: String}],
  avaliable_date: { type: String, enum: ["weekends", "weekdays", "all"]},
  avaliable_time: [{type: String}],
  introduce: {type: String},
  city: {type: String},
  transactionIds: [{ type: mongoose.Schema.Types.ObjectId }],
  chatRoomIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom" }]
}, { timestamps: true });

const Mate = mongoose.model('Mate', mateSchema);

export default Mate;
