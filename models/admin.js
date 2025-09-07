import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  username: {type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin', enum: ['admin'], required: true },
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;