import express from "express";
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from "cookie-parser";
import passport from "passport";
import "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";



 


 

// dotenv config
dotenv.config();
  


 
// express app instence...
const app = express(); 
 
// middlewares
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json());

//set cookie-parser middleware for cookies
app.use(cookieParser());

app.use(passport.initialize());

  


// Routes
app.use("/auth", authRoutes); 

// mount
app.use("/api", taskRoutes);




// connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL)    
  .then(() => {
    console.log('✅ MongoDB Now connected..');
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch((err) => console.error('❌ MongoDB connection failed:', err));