import mongoose from "mongoose";

export const ProfileImageSchema = new mongoose.Schema({
  secure_url: String,
  public_id: String,
  version: Number,
  width: Number,
  height: Number,
  format: String,
}, { _id: false });

export const defaultPic = {
  secure_url: "https://res.cloudinary.com/dslmzctpw/image/upload/v1756633247/b7b4d386-14e5-4e02-8302-b66f0974e43e.png",
  public_id: "b7b4d386-14e5-4e02-8302-b66f0974e43e",
  version: 1756633247,
  width: 980,
  height: 980,
  format: "PNG",
};

