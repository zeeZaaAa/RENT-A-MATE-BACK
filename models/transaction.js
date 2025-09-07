import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  mateId: { type: mongoose.Schema.Types.ObjectId, ref: "Mate", required: true },
  renterId: { type: mongoose.Schema.Types.ObjectId, ref: "Renter", required: true },
  amount: { type: Number, required: true },
  startTime: { type: Date, required: true},
  endTime: { type: Date, required: true},
  place: { type: String, required: true},
  purpose: { type: String, required: true},
  others: { type: String},
  stripePaymentIntentId: { type: String },
  status: { type: String, enum: ['paid', 'refunded', 'confirmed', 'end', 'reviewed'], default: 'paid' },
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
  canceledBy: { type: String, enum: ['mate', 'renter', 'system'], default: null },
  paidToMate: { type: Boolean, default: false },
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;