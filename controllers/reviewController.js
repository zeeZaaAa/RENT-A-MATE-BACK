import Transaction from "../models/transaction.js";
import Review from "../models/review.js";
import Mate from "../models/mates.js";

export const addReview = async (req, res) => {
  try {
    const { rating } = req.body;
    const bookingId = req.params.id;
    const renterId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const booking = await Transaction.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.renterId) !== String(renterId)) {
      return res.status(403).json({ message: "You are not renter of this booking" });
    }

    if (booking.status !== "end") {
      return res.status(400).json({ message: "Booking is not ended yet" });
    }

    const existing = await Review.findOne({
      booking: booking._id,
      reviewer: renterId,
    });
    if (existing) {
      return res.status(400).json({ message: "You already reviewed this booking" });
    }

    const review = await Review.create({
      booking: booking._id,
      reviewer: renterId,
      reviewedUser: booking.mateId,
      rating,
    });

    booking.status = "reviewed";
    booking.reviewId = review._id;
    await booking.save();

    const mateReviews = await Review.find({ reviewedUser: booking.mateId });
    const avg =
      mateReviews.reduce((sum, r) => sum + r.rating, 0) / mateReviews.length;

    await Mate.findByIdAndUpdate(booking.mateId, { review_rate: avg });

    res.json({
      message: "Review submitted successfully",
      review,
    });
  } catch (err) {
    console.error("Add review failed:", err);
    res.status(500).json({ message: "Failed to add review" });
  }
};