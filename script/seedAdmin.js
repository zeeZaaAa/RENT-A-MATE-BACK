import mongoose from "mongoose";
import dotenv from "dotenv";
import createAdmin from "../utils/createAdmin.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const username = "admin";
    const password = process.env.ADMIN_PASSWORD;

    const existing = await mongoose.model("Admin").findOne({ username });
    if (existing) {
      console.log(`Admin "${username}" already exists. Skipping.`);
    } else {
      await createAdmin(username, password);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error seeding admin:", err);
    process.exit(1);
  }
};

run();
