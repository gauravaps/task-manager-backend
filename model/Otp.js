// backend/models/Otp.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true , index: true,},
  otpHash: { type: String, required: true, },            // hashed OTP (never store plaintext)
  method: { type: String, enum: ["sms", "email"], required: true , index: true,},
  attempts: { type: Number, default: 0 ,},               // wrong-tries count
  used: { type: Boolean, default: false,index: true, },              // mark true after successful verify
  createdAt: { type: Date, default: Date.now ,ndex: true,},
  expiresAt: { type: Date, required: true ,} // set when creating OTP (e.g. now + 5min)
});

// TTL index: MongoDB will auto-delete the doc after expiresAt passes
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ⚡ Optional compound index for faster lookups
otpSchema.index({ userId: 1, method: 1, createdAt: -1 });

export default mongoose.model("Otp", otpSchema);
