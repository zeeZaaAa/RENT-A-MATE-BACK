import Transaction from "../models/transaction.js";
import Stripe from "stripe";

export async function autoCancel(transactionId) {
  try {
    const tx = await Transaction.findById(transactionId);
    if (!tx) return;

    if (tx.status !== "paid") {
      return;
    }

    if (!tx.stripePaymentIntentId) {
      console.warn(`[AutoCancel] No Stripe PaymentIntent for transaction ${transactionId}`);
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
      await stripe.refunds.create({
        payment_intent: tx.stripePaymentIntentId,
      });
      console.log(`[AutoCancel] Transaction ${transactionId} refunded successfully.`);
    } catch (err) {
      console.error(`[AutoCancel] Stripe refund failed for transaction ${transactionId}:`, err);
      return;
    }

    tx.status = "refunded";
    tx.canceledBy = "system";
    await tx.save();

  } catch (error) {
    console.error(`[AutoCancel] Error cancelling transaction ${transactionId}:`, error);
  }
}
