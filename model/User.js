import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  
   email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (email) =>
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z.-]+\.[a-zA-Z]{2,}$/.test(email),
        message: (error) => `${error.value} is not a valid email address`,
      },
    },

  password: {
    type: String,
  },
 phone: {
      type: String,
      match: [/^\d{10}$/, "Phone number must be 10 digits"],
    },

  picture: {
    type: String,
    default: "https://res.cloudinary.com/gauravkacloud/image/upload/v1731986753/photo_yrra2i.png",
  },
  googleId: {
    type: String,
    default: null,
  },
  provider: {
    type: String,
    enum: ["google", "local"],
    default: "local",
  },

 isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },

}, { timestamps: true });




export default mongoose.model("User", userSchema);
