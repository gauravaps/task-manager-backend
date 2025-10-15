import Task from "../model/Task.js"; 
import User from "../model/User.js";
import mongoose from "mongoose";




 
 
 //Only admin should call this route 


export const createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, assignedTo } = req.body;

    if (!title || !dueDate || !assignedTo) {
      return res.status(400).json({ success: false, message: "Title, dueDate and assignedTo are required" });
    }

    // validate assignedTo is a valid user id
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({ success: false, message: "Invalid assignedTo user id" });
    }
    const userExists = await User.findById(assignedTo);
    if (!userExists) {
      return res.status(404).json({ success: false, message: "Assigned user not found" });
    }

    const task = new Task({
      title: title.trim(),
      description: description ? description.trim() : "",
      dueDate,
      priority: priority || "Low",
      assignedTo,
      createdBy: req.user.id,
    });

    await task.save();

    res.status(201).json({ success: true, message: "Task created", task });
  } catch (err) {
    console.error("createTask error:", err);
    res.status(500).json({ success: false, message: "Server error while creating task" });
  }
};

/**
 * Get all tasks (admin)
 * Query params: page, limit, search, status, priority, assignedTo
 */
export const getAllTasks = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, parseInt(req.query.limit || "10"));
    const skip = (page - 1) * limit;

    const { search, status, priority, assignedTo } = req.query;

    const filter = {};

    if (search) {
      // text search on title/description (case-insensitive)
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) filter.assignedTo = assignedTo;

    const total = await Task.countDocuments(filter);
    const tasks = await Task.find(filter)
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email picture")
      .populate("createdBy", "name email");

    res.json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      total,
      tasks,
    });
  } catch (err) {
    console.error("getAllTasks error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching tasks" });
  }
};

/**
 * Query params: page, limit, status, priority
 */
export const getMyTasks = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, parseInt(req.query.limit || "10"));
    const skip = (page - 1) * limit;

    const { status, priority } = req.query;
    const filter = {
      assignedTo: req.user.id, // show only tasks assigned to this user
    };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const total = await Task.countDocuments(filter);
    const tasks = await Task.find(filter)
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email picture")
      .populate("createdBy", "name email");

    res.json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      total,
      tasks,
    });
  } catch (err) {
    console.error("getMyTasks error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching your tasks" });
  }
};

/**
 * Get single task details by id
 */
export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid task id" });

    const task = await Task.findById(id)
      .populate("assignedTo", "name email picture")
      .populate("createdBy", "name email");

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // If user is not admin and not assignedTo, restrict access? We allow admin or assigned user or creator.
    const isAdmin = req.user.isAdmin;
    const isAssigned = task.assignedTo && String(task.assignedTo._id) === String(req.user.id);
    const isCreator = task.createdBy && String(task.createdBy._id) === String(req.user.id);

    if (!isAdmin && !isAssigned && !isCreator) {
      return res.status(403).json({ success: false, message: "Not authorized to view this task" });
    }

    res.json({ success: true, task });
  } catch (err) {
    console.error("getTaskById error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching task" });
  }
};


 //Update task (full edit) - admin or creator
 
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid task id" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const isAdmin = req.user.isAdmin;
    const isCreator = String(task.createdBy) === String(req.user.id);

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: "Not authorized to update this task" });
    }

    // If assignedTo is sent, validate the user
    if (payload.assignedTo && !mongoose.Types.ObjectId.isValid(payload.assignedTo)) {
      return res.status(400).json({ success: false, message: "Invalid assignedTo user id" });
    }
    if (payload.assignedTo) {
      const userExists = await User.findById(payload.assignedTo);
      if (!userExists) return res.status(404).json({ success: false, message: "Assigned user not found" });
    }

    // Update fields (only allow defined fields)
    const updatable = ["title", "description", "dueDate", "priority", "assignedTo", "status"];
    updatable.forEach((key) => {
      if (payload[key] !== undefined) task[key] = payload[key];
    });

    await task.save();

    const populated = await Task.findById(id).populate("assignedTo", "name email picture").populate("createdBy", "name email");

    res.json({ success: true, message: "Task updated", task: populated });
  } catch (err) {
    console.error("updateTask error:", err);
    res.status(500).json({ success: false, message: "Server error while updating task" });
  }
};


 //Update only status (for assigned user to mark complete/in-progress)

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid task id" });
    if (!status) return res.status(400).json({ success: false, message: "Status is required" });
    if (!["pending", "completed"].includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Allow only assigned user or admin to change status
    const isAdmin = req.user.isAdmin;
    const isAssigned = String(task.assignedTo) === String(req.user.id);

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({ success: false, message: "Not authorized to change status" });
    }

    task.status = status;
    await task.save();

    res.json({ success: true, message: "Status updated", task });
  } catch (err) {
    console.error("updateTaskStatus error:", err);
    res.status(500).json({ success: false, message: "Server error while updating task status" });
  }
};

/**
 * Delete a task - only admin or creator
 */
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid task id" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const isAdmin = req.user.isAdmin;
    const isCreator = String(task.createdBy) === String(req.user.id);

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this task" });
    }

    await Task.findByIdAndDelete(id);
    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    console.error("deleteTask error:", err);
    res.status(500).json({ success: false, message: "Server error while deleting task" });
  }
};
