import HoldingBooking from "../models/holdingBooking.js";
import Transaction from "../models/transaction.js";
import Mate from "../models/mates.js";
import Renter from "../models/renters.js";
import Stripe from "stripe";
import { isMateSetupComplete } from "../utils/validateMateComplete.js";
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";

export const book = async (req, res) => {
  const { startTime, endTime, place, purpose, others = "" } = req.body;
  const renterId = req.user.id;
  const { mateId } = req.query;

  try {
    if (req.user.role !== "renter") {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (req.body.others && req.body.others.length > 30) {
      return res
        .status(400)
        .json({ message: "Others must be at most 30 characters" });
    }

    // ตรวจ field
    const requiredFields = ["startTime", "endTime", "place", "purpose"];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `Missing field: ${field}` });
      }
    }

    const start = zonedTimeToUtc(startTime, "Asia/Bangkok");
    const end = zonedTimeToUtc(endTime, "Asia/Bangkok");

    if (isNaN(start) || isNaN(end) || end < start) {
      return res.status(400).json({ message: "Invalid start or end time" });
    }

    const now = new Date();

    if (start <= now) {
      return res
        .status(400)
        .json({ message: "Start time must be in the future" });
    }

    // ดึง mate
    const mate = await Mate.findById(mateId);
    if (!mate) return res.status(404).json({ message: "Mate not found" });

    // Validate กับ avaliable_date
    const startBangkok = utcToZonedTime(start, "Asia/Bangkok");
    const day = startBangkok.getDay(); // 0=Sun,...6=Sat
    switch (mate.avaliable_date) {
      case "weekdays":
        if (day < 1 || day > 5)
          return res.status(400).json({
            message: "Selected date is not available (weekdays only)",
          });
        break;
      case "weekends":
        if (day !== 0 && day !== 6)
          return res.status(400).json({
            message: "Selected date is not available (weekends only)",
          });
        break;
      case "all":
      default:
        break;
    }

    // Validate กับ avaliable_time
    if (mate.avaliable_time && mate.avaliable_time.length === 2) {
      const [startStr, endStr] = mate.avaliable_time;
      const [availStartHour, availStartMin] = startStr.split(":").map(Number);
      const [availEndHour, availEndMin] = endStr.split(":").map(Number);

      const startBangkok = utcToZonedTime(start, "Asia/Bangkok");
      const endBangkok = utcToZonedTime(end, "Asia/Bangkok");

      const startHour = startBangkok.getHours();
      const startMin = startBangkok.getMinutes();
      const endHour = endBangkok.getHours();
      const endMin = endBangkok.getMinutes();

      const startTotalMin = startHour * 60 + startMin;
      const endTotalMin = endHour * 60 + endMin;
      const availStartTotalMin = availStartHour * 60 + availStartMin;
      const availEndTotalMin = availEndHour * 60 + availEndMin;

      if (
        startTotalMin < availStartTotalMin ||
        startTotalMin >= availEndTotalMin
      )
        return res
          .status(400)
          .json({ message: "Start time is outside available hours" });

      if (endTotalMin <= availStartTotalMin || endTotalMin > availEndTotalMin)
        return res
          .status(400)
          .json({ message: "End time is outside available hours" });
    }

    // ตรวจสอบเวลาซ้ำ
    const isDuplicate = await HoldingBooking.findOne({
      mateId,
      $or: [{ startTime: { $lt: end }, endTime: { $gt: start } }],
    });
    const isDuplicate2 = await Transaction.findOne({
      mateId,
      status: { $ne: "refunded" },
      $or: [{ startTime: { $lt: end }, endTime: { $gt: start } }],
    });
    if (isDuplicate || isDuplicate2) {
      return res
        .status(400)
        .json({ message: "This time slot is already held or booked" });
    }

    // ตรวจ renter
    const renter = await Renter.findById(renterId);
    if (!renter) return res.status(404).json({ message: "Renter not found" });

    // คำนวณจำนวนชั่วโมงและ amount
    const diffMs = end - start;
    const hourDiff = diffMs / (1000 * 60 * 60);
    const amount = Math.ceil(hourDiff * mate.price_rate);

    const booking = await HoldingBooking.create({
      mateId,
      renterId,
      startTime: start,
      endTime: end,
      place,
      purpose,
      others,
      amount,
      createdAt: new Date(),
    });

    return res.status(201).json({
      message: "Booking is held for 10 minutes. Please confirm.",
      bookingId: booking._id,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const confirmBooking = async (req, res) => {
  const { bookingId } = req.query;
  const renterId = req.user.id;

  try {
    if (req.user.role !== "renter") {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!bookingId) {
      return res.status(400).json({ message: "Missing bookingId" });
    }

    const booking = await HoldingBooking.findById(bookingId);
    if (!booking || booking.renterId.toString() !== renterId.toString()) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const mate = await Mate.findById(booking.mateId);
    if (!mate) return res.status(404).json({ message: "Mate not found" });

    if (!isMateSetupComplete(mate)) {
      return res.status(400).json({
        message:
          "This mate has not completed their profile setup yet. Booking is not allowed.",
      });
    }

    // ตรวจ payment
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(
      booking.stripePaymentIntentId
    );

    if (paymentIntent.status !== "succeeded") {
      return res.status(402).json({ message: "Payment not completed" });
    }

    // ตรวจเวลาหมดอายุ
    const now = new Date();
    const created = new Date(booking.createdAt);
    if (now - created > 10 * 60 * 1000) {
      await HoldingBooking.findByIdAndDelete(bookingId);
      return res
        .status(410)
        .json({ message: "Booking expired. Please try again." });
    }

    // แปลงเวลาเป็น Bangkok
    const startBangkok = utcToZonedTime(booking.startTime, "Asia/Bangkok");
    const endBangkok = utcToZonedTime(booking.endTime, "Asia/Bangkok");

    // ตรวจ available_date
    const day = startBangkok.getDay();
    switch (mate.avaliable_date) {
      case "weekdays":
        if (day < 1 || day > 5)
          return res.status(400).json({
            message: "Selected date is not available (weekdays only)",
          });
        break;
      case "weekends":
        if (day !== 0 && day !== 6)
          return res.status(400).json({
            message: "Selected date is not available (weekends only)",
          });
        break;
      case "all":
      default:
        break;
    }

    // ตรวจ available_time
    if (mate.avaliable_time && mate.avaliable_time.length === 2) {
      const [startStr, endStr] = mate.avaliable_time;
      const [availStartHour, availStartMin] = startStr.split(":").map(Number);
      const [availEndHour, availEndMin] = endStr.split(":").map(Number);

      const startTotalMin =
        startBangkok.getHours() * 60 + startBangkok.getMinutes();
      const endTotalMin = endBangkok.getHours() * 60 + endBangkok.getMinutes();
      const availStartTotalMin = availStartHour * 60 + availStartMin;
      const availEndTotalMin = availEndHour * 60 + availEndMin;

      if (
        startTotalMin < availStartTotalMin ||
        startTotalMin >= availEndTotalMin
      )
        return res
          .status(400)
          .json({ message: "Start time is outside available hours" });

      if (endTotalMin <= availStartTotalMin || endTotalMin > availEndTotalMin)
        return res
          .status(400)
          .json({ message: "End time is outside available hours" });
    }

    // ตรวจเวลาซ้ำทั้ง HoldingBooking และ Transaction
    const conflictHolding = await HoldingBooking.findOne({
      mateId: booking.mateId,
      _id: { $ne: booking._id },
      $or: [
        {
          startTime: { $lt: booking.endTime },
          endTime: { $gt: booking.startTime },
        },
      ],
    });

    const conflictTransaction = await Transaction.findOne({
      mateId: booking.mateId,
      status: { $ne: "refunded" },
      $or: [
        {
          startTime: { $lt: booking.endTime },
          endTime: { $gt: booking.startTime },
        },
      ],
    });

    if (conflictHolding || conflictTransaction) {
      await HoldingBooking.findByIdAndDelete(bookingId);
      return res.status(409).json({ message: "Time slot already booked" });
    }

    const transaction = new Transaction({
      mateId: booking.mateId,
      renterId: booking.renterId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      place: booking.place,
      purpose: booking.purpose,
      others: booking.others,
      amount: booking.amount,
      stripePaymentIntentId: booking.stripePaymentIntentId,
    });

    await transaction.save();
    await Promise.all([
      Mate.findByIdAndUpdate(booking.mateId, {
        $addToSet: { transactionIds: transaction._id },
      }),
      Renter.findByIdAndUpdate(booking.renterId, {
        $addToSet: { transactionIds: transaction._id },
      }),
      HoldingBooking.findByIdAndDelete(bookingId),
    ]);

    res
      .status(200)
      .json({ message: "Booking confirmed", transactionId: transaction._id });
  } catch (error) {
    console.error("Confirm booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMateProfile = async (req, res) => {
  const { mateId } = req.query;
  try {
    if (!mateId) {
      return res.status(400).json({ message: "Missing mateId query" });
    }

    const mate = await Mate.findById(mateId);
    if (!mate) {
      return res.status(404).json({ message: "Mate not found" });
    }
    if (!isMateSetupComplete(mate)) {
      return res.status(400).json({
        message:
          "This mate has not completed their profile setup yet. Booking is not allowed.",
      });
    }

    const mateProfile = {
      id: mate._id,
      name: mate.name,
      surName: mate.surName,
      pic: mate.pic,
      interest: mate.interest,
      review_rate: mate.review_rate,
      price_rate: mate.price_rate,
      skill: mate.skill,
      introduce: mate.introduce,
      avaliable_date: mate.avaliable_date,
      avaliable_time: mate.avaliable_time,
    };

    return res.status(200).json({ mateProfile: mateProfile });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getBookindData = async (req, res) => {
  const { bookingId } = req.query;
  const renterId = req.user.id;

  try {
    if (!bookingId) {
      return res.status(400).json({ message: "Missing bookingId query" });
    }

    const booking = await HoldingBooking.findById(bookingId);
    if (!booking || booking.renterId.toString() !== renterId.toString()) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const mate = await Mate.findById(booking.mateId);
    if (!mate) {
      return res.status(404).json({ message: "Mate not found" });
    }

    const bookingData = {
      mateName: mate.name,
      mateSurName: mate.surName,
      startTime: booking.startTime,
      endTime: booking.endTime,
      place: booking.place,
      purpose: booking.purpose,
      others: booking.others || undefined,
      amount: booking.amount,
    };

    return res.status(200).json({ booking: bookingData });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const unavaliable = async (req, res) => {
  try {
    const { mateId, date } = req.query;
    if (!mateId || !date) {
      return res.status(400).json({ message: "mateId and date are required" });
    }

    // สร้าง start/end ของวันแบบ local time

    const startOfDayUTC = zonedTimeToUtc(`${date}T00:00:00`, "Asia/Bangkok");
    const endOfDayUTC = zonedTimeToUtc(`${date}T23:59:59.999`, "Asia/Bangkok");

    // console.log(`startOfDay: ${startOfDay}`);
    // console.log(`endOfDay: ${endOfDay}`);

    // ดึงทั้ง HoldingBooking และ Transaction
    const [holdings, transactions] = await Promise.all([
      HoldingBooking.find({
        mateId,
        startTime: { $lt: endOfDayUTC },
        endTime: { $gt: startOfDayUTC },
      }),
      Transaction.find({
        mateId,
        status: { $ne: "refunded" },
        startTime: { $lt: endOfDayUTC },
        endTime: { $gt: startOfDayUTC },
      }),
    ]);

    // รวมเป็น unavailable slots
    const unavailableSlots = [
      ...holdings.map((b) => ({
        start: b.startTime,
        end: b.endTime,
      })),
      ...transactions.map((t) => ({
        start: t.startTime,
        end: t.endTime,
      })),
    ];
    // console.log(`unavailableSlots: ${unavailableSlots}`);
    res.json(unavailableSlots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const request = async (req, res) => {
  try {
    const mateId = req.user.id;

    const mate = await Mate.findById(mateId);
    if (!mate) {
      return res.status(404).json({ message: "Mate not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 5;

    const now = new Date();

    const query = {
      _id: { $in: mate.transactionIds },
      status: "paid",
      startTime: { $gte: now },
    };

    const total = await Transaction.countDocuments(query);

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate({
        path: "renterId",
        model: Renter,
        select: "name surName nickname",
      });

    const safeData = transactions.map((t) => ({
      id: t._id,
      renter: t.renterId
        ? {
            id: t.renterId._id,
            name: t.renterId.name,
            surName: t.renterId.surName,
            nickname: t.renterId.nickname,
          }
        : null,
      amount: t.amount,
      startTime: t.startTime,
      endTime: t.endTime,
      place: t.place,
      purpose: t.purpose,
      others: t.others,
      status: t.status,
    }));

    res.status(200).json({
      data: safeData,
      pagination: {
        total,
        totalPages: Math.ceil(total / pageSize),
        page,
        pageSize,
      },
    });
  } catch (err) {
    console.error("Get requests error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// กด Accept
export const acceptRequest = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });

    if (transaction.status !== "paid") {
      return res.status(400).json({ message: "Invalid transaction status" });
    }

    transaction.status = "confirmed";
    await transaction.save();

    res.status(200).json({
      message: "Request accepted",
      data: {
        id: transaction._id,
        status: transaction.status,
      },
    });
  } catch (err) {
    console.error("Accept request error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// กด Reject + Refund
export const rejectRequest = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });

    if (transaction.status !== "paid") {
      return res.status(400).json({ message: "Invalid transaction status" });
    }

    if (transaction.mateId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not allowed to cancel this transaction" });
    }

    if (!transaction.stripePaymentIntentId) {
      return res.status(400).json({ message: "No payment to refund" });
    }

    // ✅ Refund ผ่าน Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId,
    });

    transaction.status = "refunded";
    transaction.canceledBy = "mate";
    await transaction.save();

    res.status(200).json({
      message: "Request rejected and refunded",
      data: {
        id: transaction._id,
        status: transaction.status,
        refundId: refund.id,
      },
    });
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const renterId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 5;

    const query = { renterId };

    const total = await Transaction.countDocuments(query);

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate({
        path: "mateId",
        model: Mate,
        select: "name place price_rate",
      });

    const safeData = transactions.map((t) => ({
      id: t._id,
      mate: t.mateId
        ? { id: t.mateId._id, name: t.mateId.name, place: t.mateId.place }
        : null,
      amount: t.amount,
      startTime: t.startTime,
      endTime: t.endTime,
      place: t.place,
      purpose: t.purpose,
      others: t.others,
      status: t.status,
      canCancel: t.status === "paid", // ยกเลิกได้ถ้ายังแค่จ่ายเงิน
      canReview: t.status === "end", // review ได้ก็ต่อเมื่อ booking end แล้ว
    }));

    res.json({
      data: safeData,
      pagination: {
        total,
        totalPages: Math.ceil(total / pageSize),
        page,
        pageSize,
      },
    });
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ยกเลิก booking ของ renter
export const cancelTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });

    if (transaction.status !== "paid") {
      return res.status(400).json({ message: "Invalid transaction status" });
    }

    if (transaction.renterId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not allowed to cancel this transaction" });
    }

    if (!transaction.stripePaymentIntentId) {
      return res.status(400).json({ message: "No payment to refund" });
    }

    // ✅ Refund ผ่าน Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId,
    });

    transaction.status = "refunded";
    transaction.canceledBy = "renter";
    await transaction.save();

    res.status(200).json({
      message: "Request rejected and refunded",
      data: {
        id: transaction._id,
        status: transaction.status,
        refundId: refund.id,
      },
    });
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const mate = async (req, res) => {
  try {
    const mateId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 5;
    const now = new Date();

    const query = { mateId };

    const total = await Transaction.countDocuments(query);

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate({
        path: "renterId",
        model: Renter,
        select: "name surName",
      });

    const safeData = transactions.map((t) => {
      const endBangkok = utcToZonedTime(t.endTime, "Asia/Bangkok");
      const canEnd =
        t.status === "confirmed" &&
        endBangkok <= utcToZonedTime(now, "Asia/Bangkok");

      return {
        id: t._id,
        renter: t.renterId
          ? { id: t.renterId._id, name: t.renterId.name }
          : null,
        amount: t.amount,
        startTime: t.startTime,
        endTime: t.endTime,
        place: t.place,
        purpose: t.purpose,
        others: t.others,
        status: t.status,
        canEnd,
      };
    });

    res.json({
      data: safeData,
      pagination: {
        total,
        totalPages: Math.ceil(total / pageSize),
        page,
        pageSize,
      },
    });
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const endBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const mateId = req.user.id;

    const booking = await Transaction.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // ตรวจสอบสิทธิ์ว่าเป็น mate ของ booking นี้
    if (String(booking.mateId) !== String(mateId)) {
      return res
        .status(403)
        .json({ message: "You are not the mate of this booking" });
    }

    // ตรวจสอบว่า status สามารถ end ได้
    if (booking.status !== "confirmed") {
      return res
        .status(400)
        .json({ message: "Only confirmed bookings can be ended" });
    }
    booking.paidToMate = true;
    booking.status = "end";
    await booking.save();

    res.json({
      message: "Booking ended successfully & payout simulated successfully",
      paidToMate: booking.paidToMate,
    });
  } catch (err) {
    console.error("End booking failed:", err);
    res.status(500).json({ message: "Failed to end booking" });
  }
};
