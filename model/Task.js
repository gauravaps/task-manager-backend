import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Task title is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  dueDate: {
    type: Date,
    required: [true, "Due date is required"],
  },
  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "Low",
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

export default mongoose.model("Task", taskSchema);
