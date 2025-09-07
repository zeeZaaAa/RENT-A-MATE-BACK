import Mate from "../models/mates.js";
import Renter from "../models/renters.js";
import Admin from "../models/admin.js";
import Unverify_user from "../models/unverfiy_user.js";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/genToken.js";
import RefreshTokenModel from "../models/refreshToken.js";
import {
  createVerifyToken,
  hashVerifyToken,
} from "../utils/createVerifyToken.js";
import { sendEmail } from "../utils/sendEmail.js";

// มาที่ register แล้วให้ sendOTP และ บันทึกข้อมูลลง db แบบชั่วคราว

export const register = async (req, res) => {
  const { name, surName, email, password, birthDate, role } = req.body;

  try {
    const requiredFields = [
      "name",
      "surName",
      "email",
      "password",
      "birthDate",
      "role",
    ];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `Missing field: ${field}` });
      }
    }

    const emailTaken =
      (await Mate.exists({ email })) || (await Renter.exists({ email }));

    if (emailTaken) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const nameSurnameTaken =
      (await Mate.exists({ name, surName })) ||
      (await Renter.exists({ name, surName }));

    if (nameSurnameTaken) {
      return res
        .status(400)
        .json({ message: "Name and Surname already used together" });
    }

    const validRoles = ["mate", "renter"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const dob = new Date(birthDate);
    const today = new Date();

    // ตรวจสอบว่า birthDate ไม่อยู่ในอนาคต
    if (dob > today) {
      return res
        .status(400)
        .json({ message: "Birth date cannot be in the future" });
    }

    // คำนวณอายุ
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      return res
        .status(400)
        .json({ message: "You must be at least 18 years old" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verifyToken = createVerifyToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const verifyTokenHash = hashVerifyToken(verifyToken);

    const existing = await Unverify_user.findOne({ email });

    if (existing) {
      existing.verifyTokenHash = verifyTokenHash;
      existing.expiresAt = expiresAt;
      await existing.save();
    } else {
      const baseData = {
        name,
        surName,
        email,
        passwordHash,
        birthDate,
        role,
        verifyTokenHash,
        expiresAt,
      };
      await Unverify_user.create(baseData);
    }

    res
      .status(201)
      .json({ success: true, message: "Registration successful!" });

    const verifyLink = `${process.env.FRONT_API}/auth/verify?token=${verifyToken}`;

    sendEmail(email, verifyLink);
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await Admin.findOne({ username: email });
    if (user) user.role = "admin";

    if (!user) {
      user = await Mate.findOne({ email });
      if (user) user.role = "mate";
    }

    if (!user) {
      user = await Renter.findOne({ email });
      if (user) user.role = "renter";
    }

    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword)
      return res.status(400).json({ message: "Invalid email or password" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshTokenModel.deleteMany({ userId: user._id });
    await RefreshTokenModel.create({ userId: user._id, token: refreshToken });

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.username || user.name,
        surName: user.surName || undefined,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const hashed = hashVerifyToken(token);
    const user = await Unverify_user.findOne({ verifyTokenHash: hashed });
    if (!user) {
      const mate = await Mate.findOne({ verifyTokenHash: hashed });
      const renter = await Renter.findOne({ verifyTokenHash: hashed });

      if (mate || renter) {
        return res.json({ message: "Email already verified" });
      }

      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (user.expiresAt < Date.now()) {
      await Unverify_user.deleteOne({ _id: user._id });
      return res.status(400).json({ message: "Token expired" });
    }

    // สร้าง user ตัวจริง
    if (user.role === "mate") {
      await Mate.create({
        name: user.name,
        surName: user.surName,
        email: user.email,
        passwordHash: user.passwordHash,
        birthDate: user.birthDate,
      });
    } else if (user.role === "renter") {
      await Renter.create({
        name: user.name,
        surName: user.surName,
        email: user.email,
        passwordHash: user.passwordHash,
        birthDate: user.birthDate,
      });
    } else {
      await Unverify_user.deleteOne({ _id: user._id });
      return res.status(400).json({ message: "Invalid Role" });
    }
    await Unverify_user.deleteOne({ _id: user._id });

    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }

  try {
    // ลบ refresh token จาก DB
    await RefreshTokenModel.findOneAndDelete({ token: refreshToken });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
