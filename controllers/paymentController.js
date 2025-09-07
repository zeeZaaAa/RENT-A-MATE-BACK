import Stripe from "stripe";
import HoldingBooking from "../models/holdingBooking.js";

export const createPaymentIntent = async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { amount } = req.body;
  const { bookingId } = req.query;
  const renterId = req.user.id;

  if (!amount) {
    return res.status(400).json({ message: "Missing amount" });
  }

  try {
    if (!bookingId) {
      return res.status(400).json({ message: "Missing bookingId" });
    }

    if (req.user.role !== "renter") {
      return res.status(400).json({ message: "Invalid role" });
    }
    const booking = await HoldingBooking.findById(bookingId);
;
    if (!booking || booking.renterId.toString() !== renterId.toString()) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // แปลงเป็นสตางค์
      currency: "thb",
      automatic_payment_methods: { enabled: true }, // ให้ Stripe จัดการประเภทการจ่ายเงิน
    });

    booking.stripePaymentIntentId = paymentIntent.id;
    await booking.save();

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Payment Intent Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
