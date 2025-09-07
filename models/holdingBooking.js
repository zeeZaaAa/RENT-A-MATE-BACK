import mongoose from 'mongoose';

const holdingBookingSchema = new mongoose.Schema({
  mateId: { type: mongoose.Schema.Types.ObjectId, required: true },
  renterId: { type: mongoose.Schema.Types.ObjectId, required: true },
  startTime: { type: Date, required: true},
  endTime: { type: Date, required: true},
  place: { type: String, required: true},
  purpose: { type: String, required: true},
  amount: { type: Number, required: true },
  others: { type: String},
  stripePaymentIntentId: {type: String},
  createdAt: { type: Date, required: true },
}, { timestamps: true });

holdingBookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 10 * 60 });

const HoldingBooking = mongoose.model('HoldingBooking', holdingBookingSchema);

export default HoldingBooking;