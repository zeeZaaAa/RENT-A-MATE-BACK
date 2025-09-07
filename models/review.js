import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    reviewedUser: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  {
    timestamps: true // will add createdAt and updatedAt
  }
);

// ห้ามรีวิวซ้ำใน booking เดียวกัน
reviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
