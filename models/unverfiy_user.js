import mongoose from 'mongoose';

const unverify_userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  birthDate: { type: Date, required: true },
  role: { type: String, required: true },
  verifyTokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

unverify_userSchema.index({ createdAt: 1 }, { expireAfterSeconds: 10 * 60 });

const Unverify_user = mongoose.model('Unverify_user', unverify_userSchema);

export default Unverify_user;
