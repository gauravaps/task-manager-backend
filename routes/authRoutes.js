import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../model/User.js"
import dotenv from "dotenv";
import { getAllNormalUsers, loginUser, registerUser, resetPassword, sendOtp, verifyOtp } from "../controllers/authController.js";
import upload from "../middleware/multer.middileware.js";
import { isAdmin, verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();




dotenv.config();

// for login with Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

//for login with Google
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const user = req.user;

    const token = jwt.sign(
      { id: user._id, email: user.email ,isAdmin:user.isAdmin, name:user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set token in cookie..
    res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // ✅
  // sameSite: "lax", 
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
    // Redirect frontend with success status
    res.redirect(`${process.env.CLIENT_URL}/auth/success`);
  }
);


//Registration with manual form..
router.post("/register",upload.single('picture'), registerUser);
router.post("/login" , loginUser)
 

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

 

router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out" });
});


//  OTP send route
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.get('/all-users' , verifyToken , isAdmin ,getAllNormalUsers)





export default router;
