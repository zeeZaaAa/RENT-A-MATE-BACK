import mongoose from "mongoose";
import dotenv from "dotenv";
import Mate from "../models/mates.js";

// name: { type: String, required: true },
//   surName: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   passwordHash: { type: String, required: true },
//   birthDate: { type: Date, required: true },
//   role: { type: String, default: 'mate', enum: ['mate'], required: true },
dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    for (let i = 1; i < 11; i++) {
      const name = "mate";
      const surName = `test${i}`;
      const email = `matetest${i}@gmail.com`;
      const passwordHash = "123456789";
      const birthDate = new Date("2025-08-05T14:55:59.641Z");
      await Mate.create({
        name: name,
        surName: surName,
        email: email,
        passwordHash: passwordHash,
        birthDate: birthDate,
      });
      console.log(`created mate ${name} ${surName}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error seeding admin:", err);
    process.exit(1);
  }
};

run();
