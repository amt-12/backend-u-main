const Task = require("../../models/Task");
const BrandLead = require("../../models/BrandLead");
const User = require("../../models/Auth/User");
const mongoose = require("mongoose");

// Helper to map task to the format expected by the frontend
const mapTask = (task) => ({
  _id: task._id,
  title: task.title,
  description: task.description,
  assignedTo: task.assignedTo ? {
    _id: task.assignedTo._id,
    fullName: task.assignedTo.name,
    email: task.assignedTo.email,
    designation: task.assignedTo.designation || "",
    department: task.assignedTo.department || ""
  } : null,
  assignedBy: task.assignedBy ? {
    _id: task.assignedBy._id,
    fullName: task.assignedBy.name,
    email: task.assignedBy.email
  } : null,
  deadline: task.deadline,
  status: task.status,
  priority: task.priority,
  completedAt: task.completedAt,
  notes: task.notes,
  deckLink: task.deckLink,
  milestone: task.milestone || null,
  project: task.project ? {
    _id: task.project._id,
    brandName: task.project.brandName
  } : null,
  subTasks: task.subTasks || [],
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  approvalStatus: task.approvalStatus || 'pending',
  revisionNotes: task.revisionNotes || '',
  revisionHistory: task.revisionHistory || []
});

// Create task
const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, deadline, priority, notes, project, milestone } = req.body;
    const assignedById = req.user.userId || req.user.id || req.user._id;

    if (!title || !description || !assignedTo || !deadline) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const isAdmin = ["superadmin", "super_admin", "admin"].includes(req.user.role);
    const isManager = req.user.role === "manager";

    // If not admin, check if they are the reporting head of this project
    if (!isAdmin) {
      if (!project) {
        return res.status(400).json({ success: false, message: "Project is required for task assignment by reporting heads" });
      }

      const brandLead = await BrandLead.findById(project).lean();
      if (!brandLead) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      const isProjectHead = 
        (brandLead.assignedTo && brandLead.assignedTo.toString() === assignedById.toString()) ||
        Object.values(brandLead.categoryData || {}).some(
          (cat) => cat && cat.assignedTo && cat.assignedTo.toString() === assignedById.toString()
        );

      if (!isManager || !isProjectHead) {
        return res.status(403).json({ success: false, message: "Access denied. You must be a manager and a reporting head for this project" });
      }
    }

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: assignedById,
      deadline: new Date(deadline),
      priority: priority || "medium",
      notes: notes || "",
      project: project || null,
      milestone: milestone || null
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role designation department")
      .populate("assignedBy", "name email role")
      .populate("project", "brandName");

    const responseData = mapTask(populatedTask);

    // Real-time socket notification
    if (global.io) {
      global.io.to(`user_${assignedTo}`).emit("taskAssigned", responseData);
    }

    res.status(201).json({ success: true, task: responseData, data: responseData });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ success: false, message: "Server error creating task" });
  }
};

// Get my tasks (tasks assigned to me)
const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const { status } = req.query;

    const filter = { assignedTo: userId };
    if (status) {
      filter.status = status;
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email role designation department")
      .populate("assignedBy", "name email role")
      .populate("project", "brandName")
      .sort({ createdAt: -1 })
      .lean();

    const mapped = tasks.map(mapTask);
    res.json({ success: true, tasks: mapped, data: mapped });
  } catch (error) {
    console.error("Get my tasks error:", error);
    res.status(500).json({ success: false, message: "Server error fetching tasks" });
  }
};

// Get assigned tasks (tasks assigned by me)
const getAssignedTasks = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const { status } = req.query;

    const filter = { assignedBy: userId };
    if (status) {
      filter.status = status;
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email role designation department")
      .populate("assignedBy", "name email role")
      .populate("project", "brandName")
      .sort({ createdAt: -1 })
      .lean();

    const mapped = tasks.map(mapTask);
    res.json({ success: true, tasks: mapped, data: mapped });
  } catch (error) {
    console.error("Get assigned tasks error:", error);
    res.status(500).json({ success: false, message: "Server error fetching assigned tasks" });
  }
};

// Get all tasks (admin only)
const getAllTasks = async (req, res) => {
  try {
    const isAdmin = ["superadmin", "super_admin", "admin"].includes(req.user.role);
    const userId = req.user.userId || req.user.id || req.user._id;

    const { status, priority, assignedTo, assignedBy, project, milestone } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (project) filter.project = project;
    if (milestone) filter.milestone = milestone;

    if (isAdmin) {
      if (assignedTo) filter.assignedTo = assignedTo;
      if (assignedBy) filter.assignedBy = assignedBy;
    } else {
      const isManager = req.user.role === "manager";
      if (isManager) {
        // Find projects where this user is the project head (assignedTo) or category representative
        const myProjects = await BrandLead.find({
          $or: [
            { assignedTo: userId },
            { "categoryData.digital_marketing.assignedTo": userId },
            { "categoryData.website_development.assignedTo": userId },
            { "categoryData.ad_production.assignedTo": userId }
          ]
        }).select("_id").lean();
        const myProjectIds = myProjects.map(p => p._id);

        filter.$or = [
          { assignedTo: userId },
          { assignedBy: userId },
          { project: { $in: myProjectIds } }
        ];
      } else {
        // Executive can only see tasks assigned to them
        filter.assignedTo = userId;
      }
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email role designation department")
      .populate("assignedBy", "name email role")
      .populate("project", "brandName")
      .sort({ createdAt: -1 })
      .lean();

    const mapped = tasks.map(mapTask);
    res.json({ success: true, tasks: mapped, data: mapped });
  } catch (error) {
    console.error("Get all tasks error:", error);
    res.status(500).json({ success: false, message: "Server error fetching tasks" });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id)
      .populate("assignedTo", "name email role designation department")
      .populate("assignedBy", "name email role")
      .populate("project", "brandName")
      .lean();

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const mapped = mapTask(task);
    res.json({ success: true, task: mapped, data: mapped });
  } catch (error) {
    console.error("Get task by ID error:", error);
    res.status(500).json({ success: false, message: "Server error fetching task" });
  }
};

// Update task details
const updateTask = async (req, res) => {
  try {
    const { title, description, assignedTo, deadline, priority, notes, project, milestone } = req.body;
    const userId = req.user.userId || req.user.id || req.user._id;

    const { id } = req.params;
    let task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const isAdmin = ["superadmin", "super_admin", "admin"].includes(req.user.role);
    const isManager = req.user.role === "manager";

    if (!isAdmin) {
      if (!isManager) {
        return res.status(403).json({ success: false, message: "Not authorized to update this task" });
      }
      
      const isCreator = task.assignedBy.toString() === userId.toString();
      let isProjectHead = false;
      if (task.project) {
        const brandLead = await BrandLead.findById(task.project).lean();
        if (brandLead) {
          isProjectHead = 
            (brandLead.assignedTo && brandLead.assignedTo.toString() === userId.toString()) ||
            Object.values(brandLead.categoryData || {}).some(
              (cat) => cat && cat.assignedTo && cat.assignedTo.toString() === userId.toString()
            );
        }
      }

      if (!isCreator && !isProjectHead) {
        return res.status(403).json({ success: false, message: "Not authorized to update this task" });
      }
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (assignedTo) task.assignedTo = assignedTo;
    if (deadline) task.deadline = new Date(deadline);
    if (priority) task.priority = priority;
    if (notes !== undefined) task.notes = notes;
    if (project !== undefined) task.project = project;
    if (milestone !== undefined) task.milestone = milestone;

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role designation department")
      .populate("assignedBy", "name email role")
      .populate("project", "brandName");

    const responseData = mapTask(populatedTask);

    if (global.io) {
      global.io.to(`user_${task.assignedTo}`).emit("taskUpdated", responseData);
    }

    res.json({ success: true, task: responseData, data: responseData });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ success: false, message: "Server error updating task" });
  }
};

// Update task status
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!status || !['pending', 'in_progress', 'completed', 'overdue', 'revision'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    let task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Assignee can update status. Creator and admin can also update.
    const isAssignee = task.assignedTo.toString() === userId.toString();
    const isCreator = task.assignedBy.toString() === userId.toString();
    const isAdmin = ["superadmin", "super_admin", "admin"].includes(req.user.role);
    const isManager = req.user.role === "manager";
    
    let isProjectHead = false;
    if (isManager && task.project) {
      const brandLead = await BrandLead.findById(task.project).lean();
      if (brandLead) {
        isProjectHead = 
          (brandLead.assignedTo && brandLead.assignedTo.toString() === userId.toString()) ||
          Object.values(brandLead.categoryData || {}).some(
            (cat) => cat && cat.assignedTo && cat.assignedTo.toString() === userId.toString()
          );
      }
    }

    if (!isAssignee && !isCreator && !isAdmin && !isProjectHead) {
      return res.status(403).json({ success: false, message: "Not authorized to update status" });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
      task.approvalStatus = 'pending'; // Reset approvalStatus to pending when marked completed
    } else {
      task.completedAt = null;
    }

    await task.save();

    // Sync status to BrandWorkflow reelStatuses if this is an editing task
    if (task.milestone === 'editing_assigning' && task.project) {
      const BrandWorkflowModel = require("../../models/BrandWorkflow");
      const workflow = await BrandWorkflowModel.findOne({ brandLead: task.project });
      if (workflow && workflow.editingAssigning) {
        if (!workflow.editingAssigning.reelStatuses) {
          workflow.editingAssigning.reelStatuses = [];
        }
        let modified = false;
        const currentTaskStatus = status === 'pending' ? 'assigned' : status;
        
        task.subTasks.forEach(sub => {
          // If the subtask is not 'completed' individually, its status matches the main task
          const reelStatus = (sub.status === 'completed' || sub.finalLink) ? 'completed' : currentTaskStatus;
          const reelId = `${sub.stepIndex}-${sub.itemIndex}`;
          
          const existing = workflow.editingAssigning.reelStatuses.find(r => r.reelId === reelId);
          if (existing) {
            if (existing.status !== reelStatus) {
              existing.status = reelStatus;
              modified = true;
            }
          } else {
            workflow.editingAssigning.reelStatuses.push({ reelId, status: reelStatus });
            modified = true;
          }
        });

        if (modified) {
          workflow.markModified('editingAssigning.reelStatuses');
          await workflow.save();
        }
      }
    }

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role designation department")
      .populate("assignedBy", "name email role")
      .populate("project", "brandName");

    const responseData = mapTask(populatedTask);

    if (global.io) {
      // Notify both assignee and creator
      global.io.to(`user_${task.assignedTo}`).emit("taskStatusUpdated", responseData);
      global.io.to(`user_${task.assignedBy}`).emit("taskStatusUpdated", responseData);
    }

    res.json({ success: true, task: responseData, data: responseData });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ success: false, message: "Server error updating status" });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id || req.user._id;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const isAdmin = ["superadmin", "super_admin", "admin"].includes(req.user.role);
    const isManager = req.user.role === "manager";

    if (!isAdmin) {
      if (!isManager) {
        return res.status(403).json({ success: false, message: "Not authorized to delete this task" });
      }
      
      const isCreator = task.assignedBy.toString() === userId.toString();
      let isProjectHead = false;
      if (task.project) {
        const brandLead = await BrandLead.findById(task.project).lean();
        if (brandLead) {
          isProjectHead = 
            (brandLead.assignedTo && brandLead.assignedTo.toString() === userId.toString()) ||
            Object.values(brandLead.categoryData || {}).some(
              (cat) => cat && cat.assignedTo && cat.assignedTo.toString() === userId.toString()
            );
        }
      }

      if (!isCreator && !isProjectHead) {
        return res.status(403).json({ success: false, message: "Not authorized to delete this task" });
      }
    }

    const assignedToId = task.assignedTo.toString();
    await Task.findByIdAndDelete(id);

    if (global.io) {
      global.io.to(`user_${assignedToId}`).emit("taskDeleted", id);
    }

    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ success: false, message: "Server error deleting task" });
  }
};

// Get task statistics
const getTaskStats = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const isAdmin = ["superadmin", "super_admin", "admin"].includes(req.user.role);

    // If admin, show all task stats; if employee, show only their own task stats
    const filter = isAdmin ? {} : { assignedTo: userId };

    const stats = {
      pending: await Task.countDocuments({ ...filter, status: "pending" }),
      in_progress: await Task.countDocuments({ ...filter, status: "in_progress" }),
      completed: await Task.countDocuments({ ...filter, status: "completed" }),
      overdue: await Task.countDocuments({ ...filter, status: "overdue" })
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error("Get task stats error:", error);
    res.status(500).json({ success: false, message: "Server error fetching stats" });
  }
};

const saveSubTaskLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { subTaskIndex, link } = req.body;
    const userId = req.user.userId || req.user.id || req.user._id;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (!task.subTasks || !task.subTasks[subTaskIndex]) {
      return res.status(400).json({ success: false, message: "Invalid subtask index" });
    }

    task.subTasks[subTaskIndex].finalLink = link;
    task.subTasks[subTaskIndex].status = "completed";
    task.subTasks[subTaskIndex].revisionNotes = "";

    const allCompleted = task.subTasks.every(sub => sub.status === "completed" || sub.finalLink);
    if (allCompleted) {
      task.status = "completed";
      task.completedAt = new Date();
    } else {
      task.status = "in_progress";
    }

    await task.save();

    const BrandWorkflowModel = require("../../models/BrandWorkflow");
    const workflow = await BrandWorkflowModel.findOne({ brandLead: task.project });
    if (workflow && workflow.strategy?.steps) {
      const sub = task.subTasks[subTaskIndex];
      let stepIndex = sub.stepIndex;
      let itemIndex = sub.itemIndex;

      // Fallback for legacy tasks that do not have stepIndex/itemIndex populated
      if (stepIndex === undefined || stepIndex === null) {
        const steps = workflow.strategy.steps;
        let cumulativeIdx = 0;
        let found = false;
        for (let sIdx = 0; sIdx < steps.length; sIdx++) {
          const step = steps[sIdx];
          const count = Number(step.count) || 1;
          for (let itIdx = 0; itIdx < count; itIdx++) {
            if (cumulativeIdx === Number(subTaskIndex)) {
              stepIndex = sIdx;
              itemIndex = itIdx;
              found = true;
              break;
            }
            cumulativeIdx++;
          }
          if (found) break;
        }
      }

      if (stepIndex !== undefined && stepIndex !== null) {
        const step = workflow.strategy.steps[stepIndex];
        if (step) {
          if (task.milestone === 'assigning_photographers') {
            if (!step.rawShootLinks) step.rawShootLinks = [];
            step.rawShootLinks[itemIndex] = link;
          } else {
            if (!step.links) step.links = [];
            step.links[itemIndex] = link;

            if (!step.scriptStatuses) step.scriptStatuses = [];
            step.scriptStatuses[itemIndex] = "pending";
          }

          if (task.milestone === 'editing_assigning') {
            if (!workflow.editingAssigning) workflow.editingAssigning = {};
            if (!workflow.editingAssigning.reelStatuses) workflow.editingAssigning.reelStatuses = [];
            const reelId = `${stepIndex}-${itemIndex}`;
            const existing = workflow.editingAssigning.reelStatuses.find(r => r.reelId === reelId);
            if (existing) {
              existing.status = 'completed';
            } else {
              workflow.editingAssigning.reelStatuses.push({ reelId, status: 'completed' });
            }
            workflow.markModified('editingAssigning.reelStatuses');
          }

          workflow.markModified('strategy.steps');
          await workflow.save();
        }
      }
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error("Save subtask link error:", error);
    res.status(500).json({ success: false, message: "Server error saving link" });
  }
};

// Get employee performance data (admin/manager only)
const getEmployeePerformance = async (req, res) => {
  try {
    const isAdmin = ["superadmin", "super_admin", "admin"].includes(req.user.role);
    const isManager = req.user.role === "manager";

    // Group tasks by employee
    const employeeMap = {};

    let taskQuery = { status: { $in: ['completed', 'overdue', 'pending', 'in_progress'] } };
    if (!isAdmin && !isManager) {
      const userId = req.user.userId || req.user._id;
      taskQuery.assignedTo = userId;
      // Pre-initialize employee entry so it returns even if they have no tasks assigned yet
      const empId = userId ? userId.toString() : null;
      if (empId) {
        employeeMap[empId] = {
          _id: empId,
          name: req.user.fullName || req.user.name || 'Unknown',
          email: req.user.email || '',
          designation: req.user.designation || '',
          department: req.user.department || '',
          totalTasks: 0,
          completedOnTime: 0,
          completedDelayed: 0,
          pending: 0,
          inProgress: 0,
          overdue: 0,
          credits: 0
        };
      }
    }

    // Get all completed tasks with populated assignedTo
    const allTasks = await Task.find(taskQuery)
      .populate("assignedTo", "name email role designation department")
      .lean();

    for (const task of allTasks) {
      if (!task.assignedTo) continue;
      const empId = task.assignedTo._id.toString();

      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          _id: empId,
          name: task.assignedTo.name || 'Unknown',
          email: task.assignedTo.email || '',
          designation: task.assignedTo.designation || '',
          department: task.assignedTo.department || '',
          totalTasks: 0,
          completedOnTime: 0,
          completedDelayed: 0,
          pending: 0,
          inProgress: 0,
          overdue: 0,
          credits: 0
        };
      }

      const emp = employeeMap[empId];
      emp.totalTasks++;

      if (task.status === 'completed') {
        const deadline = new Date(task.deadline);
        const completedAt = task.completedAt ? new Date(task.completedAt) : new Date();

        if (completedAt <= deadline) {
          emp.completedOnTime++;
          // Credit system: +10 for on-time, +5 bonus for high/urgent priority
          emp.credits += 10;
          if (task.priority === 'high' || task.priority === 'urgent') {
            emp.credits += 5;
          }
        } else {
          emp.completedDelayed++;
          // -3 for delayed completion
          emp.credits -= 3;
        }
      } else if (task.status === 'overdue' || (task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed')) {
        emp.overdue++;
        // -5 for overdue tasks still not completed
        emp.credits -= 5;
      } else if (task.status === 'in_progress') {
        emp.inProgress++;
      } else if (task.status === 'pending') {
        emp.pending++;
      }
    }

    const employees = Object.values(employeeMap).map(emp => {
      const totalCompleted = emp.completedOnTime + emp.completedDelayed;
      const onTimeRate = totalCompleted > 0 ? Math.round((emp.completedOnTime / totalCompleted) * 100) : 0;

      // Determine increment eligibility tier based on credits
      let incrementTier = 'needs_improvement';
      if (emp.credits >= 100) incrementTier = 'excellent';
      else if (emp.credits >= 60) incrementTier = 'good';
      else if (emp.credits >= 30) incrementTier = 'average';

      return {
        ...emp,
        onTimeRate,
        incrementTier,
        credits: Math.max(emp.credits, 0) // Don't show negative credits
      };
    });

    // Sort by credits descending
    employees.sort((a, b) => b.credits - a.credits);

    res.json({ success: true, data: employees });
  } catch (error) {
    console.error("Get employee performance error:", error);
    res.status(500).json({ success: false, message: "Server error fetching performance data" });
  }
};

const updateSubTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { subTaskIndex, status } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (!task.subTasks || !task.subTasks[subTaskIndex]) {
      return res.status(400).json({ success: false, message: "Invalid subtask index" });
    }

    task.subTasks[subTaskIndex].status = status;
    if (req.body.revisionNotes !== undefined) {
      task.subTasks[subTaskIndex].revisionNotes = req.body.revisionNotes;
    }
    await task.save();

    // Send WhatsApp notification if a subtask is sent to revision
    if (status === 'revision' && task.project) {
      try {
        const whatsappService = require('../../services/whatsappService');
        const brandLead = await BrandLead.findById(task.project).lean();
        const brandName = brandLead ? brandLead.brandName : 'Brand';
        const milestoneTitles = {
          pre_work: 'Pre-work',
          strategy: 'Strategy',
          production_deck: 'Production Deck',
          assigning_photographers: 'Photographer Shoot',
          editing_assigning: 'Editing Work',
          content_planner: 'Content Planner',
          content_calendar: 'Content Calendar'
        };
        const milestoneTitle = milestoneTitles[task.milestone] || task.milestone || 'General';
        const sub = task.subTasks[subTaskIndex];
        const subTitle = sub ? sub.title : `Subtask #${subTaskIndex + 1}`;
        const feedback = req.body.revisionNotes || 'No notes specified.';

        const messageText = `⚠️ *Revision Requested* ⚠️\n\n` +
          `*Brand:* ${brandName}\n` +
          `*Milestone:* ${milestoneTitle}\n` +
          `*Reel/Task:* ${subTitle}\n` +
          `*Feedback/Notes:* ${feedback}`;

        whatsappService.notifyWorkflowUpdate(task.project, messageText).catch(e => console.error(e));
      } catch (err) {
        console.error('Error sending WhatsApp subtask revision notification:', err);
      }
    }

    // Also sync with workflow if needed
    const BrandWorkflowModel = require("../../models/BrandWorkflow");
    const workflow = await BrandWorkflowModel.findOne({ brandLead: task.project });
    if (workflow && workflow.strategy?.steps) {
      const sub = task.subTasks[subTaskIndex];
      let stepIndex = sub.stepIndex;
      let itemIndex = sub.itemIndex;

      // Fallback for legacy tasks that do not have stepIndex/itemIndex populated
      if (stepIndex === undefined || stepIndex === null) {
        const steps = workflow.strategy.steps;
        let cumulativeIdx = 0;
        for (let sIdx = 0; sIdx < steps.length; sIdx++) {
          const step = steps[sIdx];
          const count = Number(step.count) || 1;
          for (let itIdx = 0; itIdx < count; itIdx++) {
            if (cumulativeIdx === Number(subTaskIndex)) {
              stepIndex = sIdx;
              itemIndex = itIdx;
              break;
            }
            cumulativeIdx++;
          }
        }
      }

      if (stepIndex !== undefined && itemIndex !== undefined) {
        if (!workflow.editingAssigning) {
          workflow.editingAssigning = {};
        }
        if (!workflow.editingAssigning.reelStatuses) {
          workflow.editingAssigning.reelStatuses = [];
        }
        const reelId = `${stepIndex}-${itemIndex}`;
        const existingIndex = workflow.editingAssigning.reelStatuses.findIndex(r => r.reelId === reelId);
        
        let workflowStatus = 'assigned';
        if (status === 'in_review') workflowStatus = 'in_review';
        else if (status === 'completed') workflowStatus = 'completed';
        else if (status === 'revision') workflowStatus = 'in_review';
        else if (status === 'pending') workflowStatus = 'in_progress';

        if (existingIndex > -1) {
          workflow.editingAssigning.reelStatuses[existingIndex].status = workflowStatus;
        } else {
          workflow.editingAssigning.reelStatuses.push({ reelId, status: workflowStatus });
        }
        workflow.markModified('editingAssigning.reelStatuses');
        await workflow.save();
      }
    }

    res.json({ success: true, message: "Subtask status updated successfully", task });
  } catch (error) {
    console.error("Update subtask status error:", error);
    res.status(500).json({ success: false, message: "Server error updating subtask status" });
  }
};

const updateTaskApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, revisionNotes } = req.body;
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!approvalStatus || !['pending', 'approved', 'revision'].includes(approvalStatus)) {
      return res.status(400).json({ success: false, message: "Invalid approval status" });
    }

    let task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const isCreator = task.assignedBy.toString() === userId.toString();
    const isAdmin = ["superadmin", "super_admin", "admin"].includes(req.user.role);
    const isManager = req.user.role === "manager";
    
    let isProjectHead = false;
    if (isManager && task.project) {
      const brandLead = await BrandLead.findById(task.project).lean();
      if (brandLead) {
        isProjectHead = 
          (brandLead.assignedTo && brandLead.assignedTo.toString() === userId.toString()) ||
          Object.values(brandLead.categoryData || {}).some(
            (cat) => cat && cat.assignedTo && cat.assignedTo.toString() === userId.toString()
          );
      }
    }

    if (!isCreator && !isAdmin && !isProjectHead) {
      return res.status(403).json({ success: false, message: "Not authorized to update approval status" });
    }

    task.approvalStatus = approvalStatus;
    
    if (approvalStatus === 'revision') {
      task.status = 'revision';
      task.revisionNotes = revisionNotes || '';
      if (!task.revisionHistory) {
        task.revisionHistory = [];
      }
      task.revisionHistory.push({
        notes: revisionNotes || '',
        date: new Date()
      });
    } else if (approvalStatus === 'approved') {
      task.status = 'completed';
      task.completedAt = new Date();
      task.revisionNotes = '';
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role designation department")
      .populate("assignedBy", "name email role")
      .populate("project", "brandName");

    const responseData = mapTask(populatedTask);

    if (global.io) {
      global.io.to(`user_${task.assignedTo}`).emit("taskStatusUpdated", responseData);
      global.io.to(`user_${task.assignedBy}`).emit("taskStatusUpdated", responseData);
    }

    res.json({ success: true, task: responseData, data: responseData });
  } catch (error) {
    console.error("Update approval status error:", error);
    res.status(500).json({ success: false, message: "Server error updating approval status" });
  }
};

module.exports = {
  createTask,
  getMyTasks,
  getAssignedTasks,
  getAllTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskStats,
  saveSubTaskLink,
  updateSubTaskStatus,
  getEmployeePerformance,
  updateTaskApprovalStatus
};
