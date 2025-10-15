import User from "../model/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import uploadonCloudinary from "../utils/cloudinary.js";
import dotenv from "dotenv";
import Otp from "../model/Otp.js";
import twilio from "twilio";
import sgMail  from "@sendgrid/mail"







dotenv.config();

// REGISTER CONTROLLER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone,isAdmin } = req.body;

    // Basic validation
    if (!name  || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: "Phone number already registered." });
    }



    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);


     let imageUrl = null;

       if (req.file) {
      const uploadResponse = await uploadonCloudinary(req.file.path);

      if (!uploadResponse) {
        return res.status(500).json({ message: "Image upload failed" });
      }

      imageUrl = uploadResponse.secure_url;
      
    } else {
      imageUrl =
        "https://res.cloudinary.com/gauravkacloud/image/upload/v1731986753/photo_yrra2i.png";
      
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      provider: "local",
      picture:imageUrl,
      isAdmin,
    });

    return res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// LOGIN CONTROLLER
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Create JWT
    const token = jwt.sign(
      { id: user._id,isAdmin:user.isAdmin, name:user.name ,email:user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Set token in cookie
    res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // ✅
  // sameSite: "lax", 
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

    res.status(200).json({ message: "Login successful", user });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};




// Twilio config
const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


// SANDGrid integration for email OTP..
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


// Generate & send OTP
export const sendOtp = async (req, res) => {
  try {
    const { method, phone, email } = req.body;

    if (!method || (method === "sms" && !phone) || (method === "email" && !email)) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // ✅ 1. Find user by phone or email
    const user = method === "sms" 
      ? await User.findOne({ phone })
      : await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    // ✅ 2. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    // ✅ 3. Remove old unused OTP
    await Otp.deleteMany({ userId: user._id, used: false });

    // ✅ 4. Save OTP in DB
    await Otp.create({
      userId: user._id,
      otpHash,
      method,
      expiresAt: expiryTime,
    });
 
    // ✅ 5. Send OTP based on method
    if (method === "sms") {
      await client.messages.create({
        body: `Your verification code is ${otp}`,
        from: process.env.TWILIO_NUMBER,
        to: `+91${phone}`,
      });
      console.log(`📱 OTP sent to phone: ${phone}`);
    }

    if (method === "email") {
  const msg = {
    to: email,
    from: "gauravchotu58@gmail.com",
    subject: "Your OTP Code – Secure Verification Required 🔐",
    text: `Dear ${user.name}, your One-Time Password (OTP) is ${otp}. Please use this code to verify your identity.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 520px; margin: auto; background: #fff; padding: 25px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          
          <!-- Profile Section -->
          <div style="text-align: center;">
            <img src="${user.picture || 'https://res.cloudinary.com/gauravkacloud/image/upload/v1731986753/photo_yrra2i.png'}" 
                 alt="User Image" 
                 style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;">
            <h3 style="color: #333; margin: 5px 0;">Hi ${user.name || "User"},</h3>
          </div>

          <p style="font-size: 15px; color: #555; text-align: center; margin-top: 15px;">
            We received a request to verify your account. Please use the OTP below to complete your verification:
          </p>

          <!-- OTP Box -->
          <h1 style="text-align: center; background: #007BFF; color: white; padding: 12px; border-radius: 6px; letter-spacing: 5px;">
            ${otp}
          </h1>

          <p style="font-size: 13px; color: #666; text-align: center; margin-top: 25px;">
            This OTP is valid for 5 minutes. Do not share it with anyone.
          </p>

          <hr style="margin: 25px 0;">

          <p style="font-size: 12px; color: #888; text-align: center;">
            © 2025 YourTech. All rights reserved.<br/>
            This is an automated message, please do not reply.
          </p>
        </div>
      </div>
    `,
  };
  await sgMail.send(msg);
  console.log(`📩 OTP sent to email: ${email}`);
}




    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Send OTP Error:", error);
    if (error.response) console.error(error.response.body);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};






// Verify OTP - returns a short-lived resetToken on success

export const verifyOtp = async (req, res) => {
  try {
    const { phone, email, otp } = req.body;

    if ((!phone && !email) || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone or Email and OTP are required.",
      });
    }

    const phoneVal = phone ? String(phone).trim() : null;
    const emailVal = email ? String(email).trim().toLowerCase() : null;
    const method = phoneVal ? "sms" : "email";

    const user = await User.findOne(
      phoneVal ? { phone: phoneVal } : { email: emailVal }
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const otpRecord = await Otp.findOne({
      userId: user._id,
      method,
      used: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or already used.",
      });
    }

    //  Expiry check
    const now = new Date();
    if (otpRecord.expiresAt < now) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    const isMatch = await bcrypt.compare(String(otp), otpRecord.otpHash);
    if (!isMatch) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;

      if (otpRecord.attempts >= 5) {
        await Otp.deleteOne({ _id: otpRecord._id });
        return res.status(429).json({
          success: false,
          message: "Too many failed attempts. Please request a new OTP.",
        });
      }

      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
        remainingAttempts: 5 - otpRecord.attempts,
      });
    }

    otpRecord.used = true;
    otpRecord.verifiedAt = now;
    await otpRecord.save();

    const resetToken = jwt.sign(
      { id: user._id, type: "reset", method },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      resetToken,
      expiresIn: "5m",
    });

  } catch (error) {
    console.error("[Verify OTP Error]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};




// Reset password using resetToken (returned by verifyOtp)


// ✅ Reset password using Bearer token
export const resetPassword = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const resetToken = authHeader.split(" ")[1];

    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (decoded.type !== "reset") {
      return res.status(400).json({ message: "Invalid token type" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    await Otp.deleteMany({ userId: user._id });

    return res.status(200).json({ success: true, message: "Password has been reset" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};





// Get all normal users (only for admin)
export const getAllNormalUsers = async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const users = await User.find({ isAdmin: false }).select("-password");

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get All Normal Users Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

    