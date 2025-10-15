import express from "express";
import {
  createTask,
  getAllTasks,
  getMyTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from "../controllers/taskController.js";

import  { isAdmin, verifyToken } from "../middleware/authMiddleware.js"


const router = express.Router();

// Create task - admin only
router.post("/create-task", verifyToken, isAdmin, createTask);

// Admin: get all tasks 
router.get("/get-all-filter-task", verifyToken, isAdmin, getAllTasks);

// Get tasks assigned to logged-in user (or created for them)
router.get("/get-mytask", verifyToken, getMyTasks);

// Get single task (admin or assigned/creator)
router.get("/get-task-byid/:id", verifyToken, getTaskById);

// Update task field (edit) - admin or creator
router.put("/update-task/:id", verifyToken, updateTask);

// Update only task's status - assigned user or admin
router.put("/update-status/:id", verifyToken, updateTaskStatus);

// Delete task - admin or creator
router.delete("/delete-task/:id", verifyToken, deleteTask);

export default router;
