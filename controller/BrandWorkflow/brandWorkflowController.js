const BrandWorkflow = require('../../models/BrandWorkflow');
const BrandLead = require('../../models/BrandLead');
const Task = require('../../models/Task');
const mongoose = require('mongoose');

// Sequence of milestones
const MILESTONE_SEQUENCE = [
  'pre_work',
  'strategy',
  'production_deck',
  'assigning_photographers',
  'upload',
  'editing_assigning',
  'content_planner',
  'content_calendar'
];

// Get or initialize workflow
const getWorkflowByBrandLead = async (req, res) => {
  try {
    const { brandLeadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(brandLeadId)) {
      return res.status(400).json({ success: false, message: 'Invalid Brand Lead ID' });
    }

    let workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId })
      .populate('assigningPhotographers.photographers', 'name email role designation')
      .populate('editingAssigning.editors', 'name email role designation')
      .populate('strategy.steps.assignedEditors', 'name email role designation fullName');

    if (!workflow) {
      workflow = await BrandWorkflow.create({ brandLead: brandLeadId });

      // Send WhatsApp notification for workflow start (Stage 1/7)
      try {
        const whatsappService = require('../../services/whatsappService');
        const brandLead = await BrandLead.findById(brandLeadId).lean();
        const brandName = brandLead ? brandLead.brandName : 'Brand';
        const messageText = `🚀 *Pre-work Stage Started (1/7)* 🚀\n\n` +
          `*Brand:* ${brandName}\n` +
          `*Current Stage:* Pre-work (1/7)\n` +
          `*Next Stage:* Strategy (2/7)`;
        whatsappService.notifyWorkflowUpdate(brandLeadId, messageText).catch(e => console.error(e));
      } catch (err) {
        console.error('Error sending WhatsApp for workflow start:', err);
      }

      workflow = await BrandWorkflow.findById(workflow._id)
        .populate('assigningPhotographers.photographers', 'name email role designation')
        .populate('editingAssigning.editors', 'name email role designation')
        .populate('strategy.steps.assignedEditors', 'name email role designation fullName');
    }

    res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching workflow' });
  }
};

// Update workflow details
const updateWorkflow = async (req, res) => {
  try {
    const { brandLeadId } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(brandLeadId)) {
      return res.status(400).json({ success: false, message: 'Invalid Brand Lead ID' });
    }

    let workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId });
    if (!workflow) {
      workflow = await BrandWorkflow.create({ brandLead: brandLeadId });

      // Send WhatsApp notification for workflow start (Stage 1/7)
      try {
        const whatsappService = require('../../services/whatsappService');
        const brandLead = await BrandLead.findById(brandLeadId).lean();
        const brandName = brandLead ? brandLead.brandName : 'Brand';
        const messageText = `🚀 *Pre-work Stage Started (1/7)* 🚀\n\n` +
          `*Brand:* ${brandName}\n` +
          `*Current Stage:* Pre-work (1/7)\n` +
          `*Next Stage:* Strategy (2/7)`;
        whatsappService.notifyWorkflowUpdate(brandLeadId, messageText).catch(e => console.error(e));
      } catch (err) {
        console.error('Error sending WhatsApp for workflow start:', err);
      }
    }

    // Update fields selectively
    if (updateData.strategy) {
      if (updateData.strategy.planNotes !== undefined) workflow.strategy.planNotes = updateData.strategy.planNotes;
      if (updateData.strategy.clientConfirmed !== undefined) workflow.strategy.clientConfirmed = updateData.strategy.clientConfirmed;
      if (updateData.strategy.finalized !== undefined) workflow.strategy.finalized = updateData.strategy.finalized;
      if (updateData.strategy.steps !== undefined) {
        workflow.strategy.steps = updateData.strategy.steps;
      }
    }
    if (updateData.productionDeck) {
      workflow.productionDeck = { ...workflow.productionDeck.toObject(), ...updateData.productionDeck };

      const assignee = workflow.productionDeck.assignee;
      const deadline = workflow.productionDeck.deadline;

      if (assignee && deadline) {
        const brandLead = await BrandLead.findById(brandLeadId).lean();
        const brandName = brandLead ? brandLead.brandName : 'Brand';
        const formattedDate = new Date(deadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

        await Task.deleteMany({
          project: brandLeadId,
          milestone: 'production_item'
        });

        const existingTask = await Task.findOne({
          project: brandLeadId,
          milestone: 'production_deck'
        });

        if (!existingTask) {
          await Task.create({
            title: `Prepare Production Deck & Scripts - ${brandName}`,
            description: `Please prepare the production deck slides and detailed content scripts for each launch sequence step. Deadline: ${formattedDate}.`,
            project: brandLeadId,
            milestone: 'production_deck',
            assignedTo: assignee,
            assignedBy: req.user.userId || req.user.id || req.user._id,
            deadline: deadline,
            priority: 'high',
            status: 'pending'
          });
        } else {
          existingTask.assignedTo = assignee;
          existingTask.deadline = deadline;
          existingTask.description = `Please prepare the production deck slides and detailed content scripts for each launch sequence step. Deadline: ${formattedDate}.`;
          await existingTask.save();

          // Clear any duplicate production_deck tasks for this project
          await Task.deleteMany({
            _id: { $ne: existingTask._id },
            project: brandLeadId,
            milestone: 'production_deck'
          });
        }
      }

      if (updateData.productionDeck.deckLink) {
        await Task.updateMany(
          {
            project: brandLeadId,
            milestone: 'production_deck'
          },
          {
            status: 'completed',
            completedAt: new Date(),
            notes: updateData.productionDeck.deckLink
          }
        );
      }
    }
    if (updateData.assigningPhotographers) {
      // If shootDate is changing and was previously marked sent, reset reminderSent flag so it can send again
      const oldShootDate = workflow.assigningPhotographers.shootDate;
      const newShootDate = updateData.assigningPhotographers.shootDate;
      
      workflow.assigningPhotographers = { 
        ...workflow.assigningPhotographers.toObject(), 
        ...updateData.assigningPhotographers 
      };

      if (newShootDate && (!oldShootDate || newShootDate !== oldShootDate)) {
        workflow.assigningPhotographers.reminderSent = false;
      }
    }
    if (updateData.upload) {
      workflow.upload = { ...workflow.upload.toObject(), ...updateData.upload };
    }
    if (updateData.editingAssigning) {
      workflow.editingAssigning = { ...workflow.editingAssigning.toObject(), ...updateData.editingAssigning };
    }
    if (updateData.contentPlanner) {
      workflow.contentPlanner = { ...workflow.contentPlanner.toObject(), ...updateData.contentPlanner };
    }
    if (updateData.contentCalendar) {
      workflow.contentCalendar = { ...workflow.contentCalendar.toObject(), ...updateData.contentCalendar };
    }

    await workflow.save();

    // Automate photographer upload tasks creation
    if (updateData.assigningPhotographers) {
      const photographers = workflow.assigningPhotographers.photographers;
      const shootDate = workflow.assigningPhotographers.shootDate;
      const shootLocation = workflow.assigningPhotographers.shootLocation || '';

      if (photographers && photographers.length > 0 && shootDate) {
        const brandLead = await BrandLead.findById(brandLeadId).lean();
        const brandName = brandLead ? brandLead.brandName : 'Brand';
        const formattedDate = new Date(shootDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

        for (const photoId of photographers) {
          const existingTask = await Task.findOne({
            project: brandLeadId,
            milestone: 'upload',
            assignedTo: photoId
          });

          if (!existingTask) {
            await Task.create({
              title: `Upload Raw Assets Drive Link - ${brandName}`,
              description: `Upload the google drive link containing raw assets from the shoot on ${formattedDate} at ${shootLocation}.`,
              project: brandLeadId,
              milestone: 'upload',
              assignedTo: photoId,
              assignedBy: req.user.userId || req.user.id || req.user._id,
              deadline: shootDate,
              priority: 'high',
              status: 'pending'
            });
          } else {
            existingTask.deadline = shootDate;
            existingTask.description = `Upload the google drive link containing raw assets from the shoot on ${formattedDate} at ${shootLocation}.`;
            await existingTask.save();
          }
        }
      }
    }

    // If drive link is uploaded, mark uploader's task as completed and delete all other photographers' tasks
    if (updateData.upload && updateData.upload.driveLink) {
      const uploaderId = req.user.userId || req.user.id || req.user._id;

      await Task.updateMany(
        {
          project: brandLeadId,
          milestone: 'upload',
          assignedTo: uploaderId
        },
        {
          status: 'completed',
          completedAt: new Date(),
          notes: updateData.upload.driveLink
        }
      );

      await Task.deleteMany({
        project: brandLeadId,
        milestone: 'upload',
        assignedTo: { $ne: uploaderId }
      });
    }

    const populated = await BrandWorkflow.findById(workflow._id)
      .populate('assigningPhotographers.photographers', 'name email role designation')
      .populate('editingAssigning.editors', 'name email role designation')
      .populate('strategy.steps.assignedEditors', 'name email role designation fullName');

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({ success: false, message: 'Server error updating workflow' });
  }
};

// Advance workflow milestone
const advanceMilestone = async (req, res) => {
  try {
    const { brandLeadId } = req.params;
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(brandLeadId)) {
      return res.status(400).json({ success: false, message: 'Invalid Brand Lead ID' });
    }

    const workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    const current = workflow.currentMilestone;
    const currentIndex = MILESTONE_SEQUENCE.indexOf(current);

    if (currentIndex === -1 || currentIndex === MILESTONE_SEQUENCE.length - 1) {
      return res.status(400).json({ success: false, message: 'Workflow is already at the final milestone' });
    }

    // Validation checks for each step
    if (current === 'pre_work') {
      // Check if admin
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Only admin can mark Pre-work as completed' });
      }
      
      // Check if any incomplete pre-work tasks exist
      const pendingTasks = await Task.countDocuments({
        project: brandLeadId,
        milestone: 'pre_work',
        status: { $ne: 'completed' }
      });

      if (pendingTasks > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot advance. There are still ${pendingTasks} incomplete pre-work tasks assigned.` 
        });
      }

      workflow.preWork.completed = true;
      workflow.preWork.completedAt = new Date();
      workflow.preWork.completedBy = userId;
    }

    else if (current === 'strategy') {
      if (!workflow.strategy.clientConfirmed || !workflow.strategy.finalized) {
        return res.status(400).json({ 
          success: false, 
          message: 'Strategy must be confirmed with client and finalized before moving to Production Deck.' 
        });
      }
      workflow.strategy.completed = true;
      workflow.strategy.completedAt = new Date();
      workflow.strategy.completedBy = userId;
    }

    else if (current === 'production_deck') {
      workflow.productionDeck.completed = true;
      workflow.productionDeck.completedAt = new Date();
      workflow.productionDeck.completedBy = userId;
    }

    else if (current === 'assigning_photographers') {
      if (!workflow.assigningPhotographers.photographers || workflow.assigningPhotographers.photographers.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please assign at least one photographer.' 
        });
      }
      if (!workflow.assigningPhotographers.shootDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please specify the shoot date & time.' 
        });
      }
      if (!workflow.upload.driveLink) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide the shared drive link.' 
        });
      }
      workflow.assigningPhotographers.completed = true;
      workflow.assigningPhotographers.completedAt = new Date();
      workflow.assigningPhotographers.completedBy = userId;

      // Mark upload as completed inline (it is collected at the same step)
      workflow.upload.completed = true;
      workflow.upload.completedAt = new Date();
      workflow.upload.completedBy = userId;

      // Skip 'upload' milestone and go directly to 'editing_assigning'
      workflow.currentMilestone = 'editing_assigning';
      await workflow.save();

      // Send WhatsApp notification for photographer shoot completion (Stage 4/7)
      try {
        const whatsappService = require('../../services/whatsappService');
        const brandLead = await BrandLead.findById(brandLeadId).lean();
        const brandName = brandLead ? brandLead.brandName : 'Brand';

        const completedTasks = await Task.find({
          project: brandLeadId,
          milestone: 'assigning_photographers',
          status: 'completed'
        }).populate('assignedTo', 'name fullName').lean();

        let tasksListText = '';
        if (completedTasks.length > 0) {
          tasksListText = '\n\n*Tasks Completed:*\n' + completedTasks.map(t => {
            const userName = t.assignedTo ? (t.assignedTo.fullName || t.assignedTo.name) : 'Someone';
            return `- ${t.title} (Completed by ${userName})`;
          }).join('\n');
        }

        const messageText = ` *Photographer Shoot Stage Completed (4/7)* \n\n` +
          `*Brand:* ${brandName}\n` +
          `*Current Stage:* Completed\n` +
          `*Next Stage:* Editing Work (5/7)` + tasksListText;
        whatsappService.notifyWorkflowUpdate(brandLeadId, messageText).catch(e => console.error(e));
      } catch (err) {
        console.error('Error sending WhatsApp for photographer shoot progression:', err);
      }

      const populated = await BrandWorkflow.findById(workflow._id)
        .populate('assigningPhotographers.photographers', 'name email role designation')
        .populate('editingAssigning.editors', 'name email role designation')
        .populate('strategy.steps.assignedEditors', 'name email role designation fullName');

      return res.json({ success: true, data: populated, message: 'Advanced to milestone: editing_assigning' });
    }

    // Handle legacy documents stuck on 'upload' — advance them to 'editing_assigning'
    else if (current === 'upload') {
      workflow.upload.completed = true;
      workflow.upload.completedAt = new Date();
      workflow.upload.completedBy = userId;
    }


    else if (current === 'editing_assigning') {
      if (!workflow.editingAssigning.editors || workflow.editingAssigning.editors.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Assign at least one editor before advancing.' 
        });
      }
      
      let totalReels = 0;
      if (workflow.strategy && workflow.strategy.steps) {
        workflow.strategy.steps.forEach(step => {
          totalReels += Number(step.count) || 1;
        });
      }

      const pendingReels = (workflow.editingAssigning.reelStatuses || []).some(s => s.status === 'pending');
      
      if ((workflow.editingAssigning.reelStatuses || []).length < totalReels || pendingReels) {
        return res.status(400).json({ 
          success: false, 
          message: 'All reels must have a status assigned (not Pending) before advancing.' 
        });
      }

      workflow.editingAssigning.completed = true;
      workflow.editingAssigning.completedAt = new Date();
      workflow.editingAssigning.completedBy = userId;
    }

    else if (current === 'content_planner') {
      workflow.contentPlanner.completed = true;
      workflow.contentPlanner.completedAt = new Date();
      workflow.contentPlanner.completedBy = userId;
    }

    else if (current === 'content_calendar') {
      if (!workflow.contentCalendar.clientApproved) {
        return res.status(400).json({ 
          success: false, 
          message: 'Client approval is required to finalize onboarding.' 
        });
      }
      workflow.contentCalendar.completed = true;
      workflow.contentCalendar.completedAt = new Date();
      workflow.contentCalendar.completedBy = userId;
    }

    // Move to next milestone
    const nextMilestone = MILESTONE_SEQUENCE[currentIndex + 1];
    workflow.currentMilestone = nextMilestone;

    await workflow.save();

    // Send WhatsApp notification for milestone progression
    try {
      const whatsappService = require('../../services/whatsappService');
      const brandLead = await BrandLead.findById(brandLeadId).lean();
      const brandName = brandLead ? brandLead.brandName : 'Brand';

      const completedTasks = await Task.find({
        project: brandLeadId,
        milestone: current,
        status: 'completed'
      }).populate('assignedTo', 'name fullName').lean();

      let tasksListText = '';
      if (completedTasks.length > 0) {
        tasksListText = '\n\n*Tasks Completed:*\n' + completedTasks.map(t => {
          const userName = t.assignedTo ? (t.assignedTo.fullName || t.assignedTo.name) : 'Someone';
          return `- ${t.title} (Completed by ${userName})`;
        }).join('\n');
      }

      const milestoneDetails = {
        pre_work: { name: 'Pre-work', index: 1 },
        strategy: { name: 'Strategy', index: 2 },
        production_deck: { name: 'Production Deck', index: 3 },
        assigning_photographers: { name: 'Photographer Shoot', index: 4 },
        upload: { name: 'Photographer Shoot', index: 4 },
        editing_assigning: { name: 'Editing Work', index: 5 },
        content_planner: { name: 'Content Planner', index: 6 },
        content_calendar: { name: 'Content Calendar', index: 7 }
      };

      const currentDetails = milestoneDetails[current] || { name: current, index: 0 };
      const nextDetails = milestoneDetails[nextMilestone] || { name: nextMilestone, index: 0 };

      const messageText = ` *${currentDetails.name} Stage Completed (${currentDetails.index}/7)* \n\n` +
        `*Brand:* ${brandName}\n` +
        `*Current Stage:* Completed\n` +
        `*Next Stage:* ${nextDetails.name} (${nextDetails.index}/7)` + tasksListText;

      whatsappService.notifyWorkflowUpdate(brandLeadId, messageText).catch(e => console.error(e));
    } catch (err) {
      console.error('Error sending WhatsApp for milestone progression:', err);
    }

    const populated = await BrandWorkflow.findById(workflow._id)
      .populate('assigningPhotographers.photographers', 'name email role designation')
      .populate('editingAssigning.editors', 'name email role designation')
      .populate('strategy.steps.assignedEditors', 'name email role designation fullName');

    res.json({ success: true, data: populated, message: `Advanced to milestone: ${nextMilestone}` });
  } catch (error) {
    console.error('Advance milestone error:', error);
    res.status(500).json({ success: false, message: 'Server error transitioning milestone' });
  }
};

const assignProductionTasks = async (req, res) => {
  try {
    const { brandLeadId } = req.params;
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(brandLeadId)) {
      return res.status(400).json({ success: false, message: 'Invalid Brand Lead ID' });
    }

    const workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    const assignee = workflow.productionDeck.assignee;
    const deadline = workflow.productionDeck.deadline;

    if (!assignee) {
      return res.status(400).json({ success: false, message: 'Please assign a Production Planner first.' });
    }

    const brandLead = await BrandLead.findById(brandLeadId).lean();
    const brandName = brandLead ? brandLead.brandName : 'Brand';
    let steps = workflow.strategy?.steps || [];

    // Clear out any old separate production item tasks to prevent duplicates
    await Task.deleteMany({ project: brandLeadId, milestone: 'production_item' });

    const mainTaskTitle = `Prepare Production Deck & Scripts - ${brandName}`;

    let mainTask = await Task.findOne({
      project: brandLeadId,
      milestone: 'production_deck',
      title: mainTaskTitle
    });

    // Self-healing migration for legacy/unsynced links inside existing mainTask
    if (mainTask && mainTask.subTasks) {
      let modified = false;
      mainTask.subTasks.forEach((sub, subIdx) => {
        if (sub.finalLink) {
          let sIdx = sub.stepIndex;
          let itIdx = sub.itemIndex;

          if (sIdx === undefined || sIdx === null) {
            let cumulativeIdx = 0;
            let found = false;
            for (let stepI = 0; stepI < steps.length; stepI++) {
              const step = steps[stepI];
              const count = Number(step.count) || 1;
              for (let itemI = 0; itemI < count; itemI++) {
                if (cumulativeIdx === Number(subIdx)) {
                  sIdx = stepI;
                  itIdx = itemI;
                  found = true;
                  break;
                }
                cumulativeIdx++;
              }
              if (found) break;
            }
          }

          if (sIdx !== undefined && sIdx !== null) {
            const step = steps[sIdx];
            if (step) {
              if (!step.links) step.links = [];
              if (!step.links[itIdx]) {
                step.links[itIdx] = sub.finalLink;
                modified = true;
              }
            }
          }
        }
      });

      if (modified) {
        workflow.markModified('strategy.steps');
        await workflow.save();
        // Reload steps
        steps = workflow.strategy?.steps || [];
      }
    }

    const subTasks = [];
    for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
      const step = steps[stepIdx];
      const type = step.type || 'Content';
      const count = Number(step.count) || 1;
      const scripts = step.scripts || [];
      const links = step.links || [];
      const scriptStatuses = step.scriptStatuses || [];
      const scriptRevisions = step.scriptRevisions || [];

      for (let i = 1; i <= count; i++) {
        const scriptLink = scripts[i - 1] || step.script || '';
        const finalLink = links[i - 1] || '';
        const scriptStatus = scriptStatuses[i - 1] || 'pending';
        const revisionNote = scriptRevisions[i - 1] || '';

        let subStatus = 'pending';
        if (finalLink) {
          subStatus = 'completed';
        } else if (scriptStatus === 'revision') {
          subStatus = 'revision';
        }

        subTasks.push({
          title: `Step ${stepIdx + 1}: ${brandName} - ${type.charAt(0).toUpperCase() + type.slice(1)} #${i}`,
          scriptLink,
          finalLink,
          status: subStatus,
          revisionNotes: revisionNote,
          stepIndex: stepIdx,
          itemIndex: i - 1
        });
      }
    }

    if (!mainTask) {
      mainTask = await Task.create({
        title: mainTaskTitle,
        description: `Please prepare the production deck slides and detailed content scripts for each launch sequence step.`,
        project: brandLeadId,
        milestone: 'production_deck',
        assignedTo: assignee,
        assignedBy: userId,
        deadline: deadline || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        status: 'pending',
        subTasks
      });
    } else {
      mainTask.assignedTo = assignee;
      mainTask.subTasks = subTasks;
      mainTask.deadline = deadline || mainTask.deadline;
      await mainTask.save();

      // Clear any duplicate production_deck tasks for this project
      await Task.deleteMany({ _id: { $ne: mainTask._id }, project: brandLeadId, milestone: 'production_deck' });
    }

    res.json({ 
      success: true, 
      message: `Successfully created/updated Production Deck task with ${subTasks.length} planned sequence items.` 
    });
  } catch (error) {
    console.error('Assign production tasks error:', error);
    res.status(500).json({ success: false, message: 'Server error assigning tasks' });
  }
};

const requestScriptRevision = async (req, res) => {
  try {
    const { brandLeadId } = req.params;
    const { stepIndex, scriptIndex, revisionNotes } = req.body;

    const workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    const steps = workflow.strategy?.steps || [];
    const step = steps[stepIndex];
    if (step) {
      if (!step.scriptStatuses) step.scriptStatuses = [];
      step.scriptStatuses[scriptIndex] = 'revision';

      if (!step.scriptRevisions) step.scriptRevisions = [];
      step.scriptRevisions[scriptIndex] = revisionNotes;

      workflow.markModified('strategy.steps');
      await workflow.save();
    }

    const Task = require('../../models/Task');
    const mainTask = await Task.findOne({
      project: brandLeadId,
      milestone: 'production_deck'
    });

    if (mainTask && mainTask.subTasks) {
      let sub = mainTask.subTasks.find(s => s.stepIndex === Number(stepIndex) && s.itemIndex === Number(scriptIndex));
      
      if (!sub) {
        let targetSubTaskIndex = -1;
        let currentIdx = 0;
        for (let sIdx = 0; sIdx < steps.length; sIdx++) {
          const step = steps[sIdx];
          const count = Number(step.count) || 1;
          for (let itemIdx = 0; itemIdx < count; itemIdx++) {
            if (sIdx === Number(stepIndex) && itemIdx === Number(scriptIndex)) {
              targetSubTaskIndex = currentIdx;
              break;
            }
            currentIdx++;
          }
          if (targetSubTaskIndex !== -1) break;
        }
        if (targetSubTaskIndex !== -1) {
          sub = mainTask.subTasks[targetSubTaskIndex];
        }
      }

      if (sub) {
        sub.revisionNotes = revisionNotes;
        sub.status = 'revision';
        sub.finalLink = '';
        await mainTask.save();
      }
    }

    // Send WhatsApp notification for script revision
    try {
      const whatsappService = require('../../services/whatsappService');
      const brandLead = await BrandLead.findById(brandLeadId).lean();
      const brandName = brandLead ? brandLead.brandName : 'Brand';
      const stepType = step ? (step.type || 'Script') : 'Script';
      const messageText = ` *Script Revision Requested* \n\n` +
        `*Brand:* ${brandName}\n` +
        `*Milestone:* Production Deck\n` +
        `*Script:* Step ${Number(stepIndex) + 1} - ${stepType} #${Number(scriptIndex) + 1}\n` +
        `*Feedback/Notes:* ${revisionNotes || 'No notes specified.'}`;

      whatsappService.notifyWorkflowUpdate(brandLeadId, messageText).catch(e => console.error(e));
    } catch (err) {
      console.error('Error sending WhatsApp notification for script revision:', err);
    }

    res.json({ success: true, message: 'Revision request successfully sent and assigned' });
  } catch (error) {
    console.error('Request script revision error:', error);
    res.status(500).json({ success: false, message: 'Server error requesting revision' });
  }
};

const assignShootTasks = async (req, res) => {
  try {
    const { brandLeadId } = req.params;
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(brandLeadId)) {
      return res.status(400).json({ success: false, message: 'Invalid Brand ID' });
    }

    const workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    const photographers = workflow.assigningPhotographers?.photographers || [];
    const shootLocation = workflow.assigningPhotographers?.shootLocation || '';
    const shootDate = workflow.assigningPhotographers?.shootDate;

    if (photographers.length === 0) {
      return res.status(400).json({ success: false, message: 'Please assign at least one Photographer first.' });
    }

    const brandLead = await BrandLead.findById(brandLeadId).lean();
    const brandName = brandLead ? brandLead.brandName : 'Brand';
    const steps = workflow.strategy?.steps || [];

    const subTasks = [];
    for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
      const step = steps[stepIdx];
      const type = step.type || 'Content';
      const count = Number(step.count) || 1;
      const scripts = step.scripts || [];
      const rawShootLinks = step.rawShootLinks || [];

      for (let i = 1; i <= count; i++) {
        const scriptLink = scripts[i - 1] || step.script || '';
        const finalLink = rawShootLinks[i - 1] || '';
        subTasks.push({
          title: `Step ${stepIdx + 1}: ${brandName} - ${type.charAt(0).toUpperCase() + type.slice(1)} #${i}`,
          scriptLink,
          finalLink,
          status: finalLink ? 'completed' : 'pending',
          stepIndex: stepIdx,
          itemIndex: i - 1
        });
      }
    }

    const taskTitle = `Photographer Shoot - ${brandName}`;

    // Clean up other photographer tasks that are assigned to anyone else
    await Task.deleteMany({
      project: brandLeadId,
      milestone: 'assigning_photographers',
      assignedTo: { $nin: photographers }
    });

    const deckLink = workflow.productionDeck?.deckLink || '';

    let tasksCreated = 0;
    for (const photographerId of photographers) {
      let task = await Task.findOne({
        project: brandLeadId,
        milestone: 'assigning_photographers',
        assignedTo: photographerId
      });

      if (!task) {
        task = await Task.create({
          title: taskTitle,
          description: `Shoot Location: ${shootLocation || 'Not specified'}. Please verify coordinates and upload the raw shoot assets drive link.`,
          project: brandLeadId,
          milestone: 'assigning_photographers',
          assignedTo: photographerId,
          assignedBy: userId,
          deadline: shootDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          priority: 'high',
          status: 'pending',
          deckLink: deckLink,
          subTasks
        });
      } else {
        task.assignedTo = photographerId;
        task.subTasks = subTasks;
        task.deadline = shootDate || task.deadline;
        task.deckLink = deckLink;
        task.description = `Shoot Location: ${shootLocation || 'Not specified'}. Please verify coordinates and upload the raw shoot assets drive link.`;
        await task.save();
      }
      tasksCreated++;
    }

    // Send WhatsApp notification for shoot assignment
    try {
      const whatsappService = require('../../services/whatsappService');
      const User = require('../../models/Auth/User');

      const photographerUsers = await User.find({ _id: { $in: photographers } }).lean();
      const photographerNames = photographerUsers.map(u => u.fullName || u.name).join(', ');

      const formattedDate = shootDate ? new Date(shootDate).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }) : 'Not scheduled';

      const messageText = `📸 *Photographer Shoot Scheduled* 📸\n\n` +
        `*Brand:* ${brandName}\n` +
        `*Milestone:* Photographer Shoot\n` +
        `*Shoot Date:* ${formattedDate}\n` +
        `*Location:* ${shootLocation || 'Not specified'}\n` +
        `*Photographers:* ${photographerNames || 'None assigned'}`;

      whatsappService.notifyWorkflowUpdate(brandLeadId, messageText).catch(e => console.error(e));
    } catch (err) {
      console.error('Error sending WhatsApp notification for shoot assignment:', err);
    }

    res.json({ 
      success: true, 
      message: `Successfully created/updated Photographer Shoot tasks for ${tasksCreated} photographers.` 
    });
  } catch (error) {
    console.error('Assign shoot tasks error:', error);
    res.status(500).json({ success: false, message: 'Server error assigning shoot tasks' });
  }
};

const updateEditingStatus = async (req, res) => {
  try {
    const { brandLeadId } = req.params;
    const { reelId, status, caption, collabs, specialNeeds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(brandLeadId)) {
      return res.status(400).json({ success: false, message: 'Invalid Brand Lead ID' });
    }

    const workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    if (!workflow.editingAssigning.reelStatuses) {
      workflow.editingAssigning.reelStatuses = [];
    }

    const existingIndex = workflow.editingAssigning.reelStatuses.findIndex(r => r.reelId === reelId);
    if (existingIndex > -1) {
      if (status) workflow.editingAssigning.reelStatuses[existingIndex].status = status;
      if (caption !== undefined) workflow.editingAssigning.reelStatuses[existingIndex].caption = caption;
      if (collabs !== undefined) workflow.editingAssigning.reelStatuses[existingIndex].collabs = collabs;
      if (specialNeeds !== undefined) workflow.editingAssigning.reelStatuses[existingIndex].specialNeeds = specialNeeds;
    } else {
      workflow.editingAssigning.reelStatuses.push({ 
        reelId, 
        status: status || 'pending',
        caption: caption || '',
        collabs: collabs || '',
        specialNeeds: specialNeeds || ''
      });
    }

    await workflow.save();

    // Send WhatsApp notification if status changed to 'sent_to_client'
    if (status === 'sent_to_client') {
      try {
        const whatsappService = require('../../services/whatsappService');
        const BrandLead = require('../../models/BrandLead');
        const brandLead = await BrandLead.findById(brandLeadId).lean();
        const brandName = brandLead ? brandLead.brandName : 'Brand';

        const [stepIndexStr, itemIndexStr] = reelId.split('-');
        const stepIndex = Number(stepIndexStr);
        const itemIndex = Number(itemIndexStr);

        const step = workflow.strategy?.steps?.[stepIndex];
        const stepType = step ? (step.type || 'Reel') : 'Reel';
        const reelName = `Step ${stepIndex + 1} - ${stepType} #${itemIndex + 1}`;

        // Compute access key
        const cleanBrand = brandLead && brandLead.brandName ? brandLead.brandName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'brand';
        const cleanPhone = brandLead && brandLead.phone ? brandLead.phone.replace(/[^0-9]/g, '') : '';
        const lastFour = cleanPhone ? cleanPhone.slice(-4) : '1234';
        const accessKey = `${cleanBrand}${lastFour}`;

        const messageText = `🎥 *Reel Uploaded for Review* 🎥\n\n` +
          `*Brand:* ${brandName}\n` +
          `*Reel:* ${reelName}\n\n` +
          `The reel has been uploaded to the Client Review Portal. Please check and approve!\n\n` +
          `*Review Portal:* https://unrealstudiozz.com/review\n` +
          `*Your Access Key:* \`${accessKey}\``;

        whatsappService.notifyWorkflowUpdate(brandLeadId, messageText).catch(e => console.error(e));
      } catch (err) {
        console.error('Error sending WhatsApp for editing client review upload:', err);
      }
    }

    const populated = await BrandWorkflow.findById(workflow._id)
      .populate('assigningPhotographers.photographers', 'name email role designation')
      .populate('editingAssigning.editors', 'name email role designation')
      .populate('strategy.steps.assignedEditors', 'name email role designation fullName');

    res.json({ success: true, data: populated, message: 'Reel status updated successfully' });
  } catch (error) {
    console.error('Update editing status error:', error);
    res.status(500).json({ success: false, message: 'Server error updating reel status' });
  }
};

const assignEditingTask = async (req, res) => {
  try {
    const { brandLeadId } = req.params;
    const { stepIndex, itemIndex, editorId } = req.body;
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(brandLeadId)) {
      return res.status(400).json({ success: false, message: 'Invalid Brand Lead ID' });
    }

    const workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    const brandLead = await BrandLead.findById(brandLeadId).lean();
    const brandName = brandLead ? brandLead.brandName : 'Brand';

    // Update the assigned editor for this specific reel
    const steps = workflow.strategy?.steps || [];
    const step = steps[stepIndex];
    if (!step) {
      return res.status(404).json({ success: false, message: 'Step not found' });
    }

    if (!step.assignedEditors) {
      step.assignedEditors = [];
    }
    // Ensure array length matches count
    const count = Number(step.count) || 1;
    while (step.assignedEditors.length < count) {
      step.assignedEditors.push(null);
    }

    const oldEditorId = step.assignedEditors[itemIndex];
    step.assignedEditors[itemIndex] = editorId || null;

    workflow.markModified('strategy.steps');
    await workflow.save();

    // Now, synchronize tasks in the database for the editors involved
    const editorsToSync = new Set();
    if (editorId) editorsToSync.add(editorId.toString());
    if (oldEditorId) editorsToSync.add(oldEditorId.toString());

    for (const edId of editorsToSync) {
      // Find all items assigned to this editor in this project's workflow
      const editorSubTasks = [];
      for (let sIdx = 0; sIdx < steps.length; sIdx++) {
        const s = steps[sIdx];
        const sType = s.type || 'Reel';
        const sCount = Number(s.count) || 1;
        const sScripts = s.scripts || [];
        const sRawLinks = s.rawShootLinks || [];
        const sEditors = s.assignedEditors || [];
        const sLinks = s.links || [];

        for (let idx = 0; idx < sCount; idx++) {
          if (sEditors[idx] && sEditors[idx].toString() === edId) {
            const rawLink = sRawLinks[idx] || '';
            const scriptLink = sScripts[idx] || s.script || '';
            const finalLink = sLinks[idx] || '';
            editorSubTasks.push({
              title: `Step ${sIdx + 1}: ${brandName} - ${sType.charAt(0).toUpperCase() + sType.slice(1)} #${idx + 1}`,
              scriptLink,
              finalLink,
              rawShootLink: rawLink,
              status: finalLink ? 'completed' : 'pending',
              stepIndex: sIdx,
              itemIndex: idx
            });
          }
        }
      }

      if (editorSubTasks.length === 0) {
        // No items left for this editor, delete their task
        await Task.deleteMany({
          project: brandLeadId,
          milestone: 'editing_assigning',
          assignedTo: edId
        });
      } else {
        // Create or update task
        const taskTitle = `Video Editing - ${brandName}`;
        let task = await Task.findOne({
          project: brandLeadId,
          milestone: 'editing_assigning',
          assignedTo: edId
        });

        if (!task) {
          await Task.create({
            title: taskTitle,
            description: `Please edit the assigned reels and upload final links.`,
            project: brandLeadId,
            milestone: 'editing_assigning',
            assignedTo: edId,
            assignedBy: userId,
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Default 3 days deadline
            priority: 'high',
            status: 'pending',
            subTasks: editorSubTasks
          });
        } else {
          task.subTasks = editorSubTasks;
          const allCompleted = editorSubTasks.every(sub => sub.status === 'completed');
          task.status = allCompleted ? 'completed' : 'pending';
          if (allCompleted) task.completedAt = new Date();
          await task.save();
        }
      }
    }

    // Send WhatsApp notification for editor assignment
    try {
      const whatsappService = require('../../services/whatsappService');
      const User = require('../../models/Auth/User');

      let editorName = 'None';
      if (editorId) {
        const editorUser = await User.findById(editorId).lean();
        editorName = editorUser ? (editorUser.fullName || editorUser.name) : 'Editor';
      }

      const stepType = step ? (step.type || 'Reel') : 'Reel';
      const reelName = `Step ${Number(stepIndex) + 1} - ${stepType} #${Number(itemIndex) + 1}`;

      const messageText = `🎬 *Video Assigned to Editor* 🎬\n\n` +
        `*Brand:* ${brandName}\n` +
        `*Milestone:* Editing Work\n` +
        `*Reel:* ${reelName}\n` +
        `*Assignee:* ${editorName}`;

      whatsappService.notifyWorkflowUpdate(brandLeadId, messageText).catch(e => console.error(e));
    } catch (err) {
      console.error('Error sending WhatsApp notification for editing assignment:', err);
    }

    const populated = await BrandWorkflow.findOne({ brandLead: brandLeadId })
      .populate('assigningPhotographers.photographers', 'name email role designation')
      .populate('editingAssigning.editors', 'name email role designation')
      .populate('strategy.steps.assignedEditors', 'name email role designation fullName');

    res.json({ success: true, data: populated, message: 'Editor assigned and daily task synchronized successfully.' });
  } catch (error) {
    console.error('Assign editing task error:', error);
    res.status(500).json({ success: false, message: 'Server error assigning editing task' });
  }
};

const getAllWorkflows = async (req, res) => {
  try {
    const workflows = await BrandWorkflow.find()
      .populate('brandLead', 'brandName')
      .populate('editingAssigning.editors', 'name email role designation')
      .populate('assigningPhotographers.photographers', 'name email role designation fullName')
      .populate('strategy.steps.assignedEditors', 'name email role designation fullName');
    res.json({ success: true, data: workflows });
  } catch (error) {
    console.error('Get all workflows error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching all workflows' });
  }
};

const verifyClientAccess = async (req, res) => {
  try {
    const { accessKey } = req.body;
    if (!accessKey || !accessKey.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your Brand Access Key' });
    }

    const cleanInput = accessKey.trim();
    // Match letters/alphanumeric prefix followed by numbers
    const match = cleanInput.match(/^(.*?)([0-9]+)$/);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid Access Key format. Should be like: nectar9449' });
    }

    const brandInput = match[1].trim();
    const phoneInput = match[2].trim();

    if (!brandInput || !phoneInput) {
      return res.status(400).json({ success: false, message: 'Access Key must contain brand name and phone suffix (e.g. nectar9449)' });
    }

    const cleanBrandInput = brandInput.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPhoneInput = phoneInput.replace(/[^0-9]/g, '');

    const leads = await BrandLead.find({}).lean();
    const matchedLead = leads.find(lead => {
      if (!lead.brandName) return false;
      const cleanDbBrand = lead.brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Typo-tolerant matching: matches if brand name matches, is a substring of, or has same first 3 letters
      const isBrandMatch = cleanDbBrand.includes(cleanBrandInput) || 
                           cleanBrandInput.includes(cleanDbBrand) || 
                           (cleanDbBrand.substring(0, 3) === cleanBrandInput.substring(0, 3));
      
      if (!isBrandMatch) return false;

      if (!lead.phone) return false;
      const cleanDbPhone = lead.phone.replace(/[^0-9]/g, '');
      return cleanDbPhone.endsWith(cleanPhoneInput);
    });

    if (!matchedLead) {
      return res.status(404).json({ success: false, message: 'Workspace not found. Check your Access Key.' });
    }

    return res.status(200).json({
      success: true,
      brandLeadId: matchedLead._id,
      brandName: matchedLead.brandName
    });
  } catch (err) {
    console.error('Error verifying client access:', err);
    return res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

const getClientReviewWorkflow = async (req, res) => {
  try {
    const { brandLeadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(brandLeadId)) {
      return res.status(400).json({ success: false, message: 'Invalid Brand Lead ID' });
    }

    const workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId })
      .populate('brandLead', 'brandName companyName contactPerson email')
      .lean();

    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Brand workflow not found' });
    }

    // Fetch the editing tasks for this brand to map the actual status & final links from editor subtasks
    const tasks = await Task.find({
      project: brandLeadId,
      milestone: 'editing_assigning'
    }).lean();

    const steps = workflow.strategy?.steps || [];
    const reviewReels = [];

    steps.forEach((step, stepIdx) => {
      const count = Number(step.count) || 1;
      const sScripts = step.scripts || [];
      const sRawLinks = step.rawShootLinks || [];
      const sLinks = step.links || [];

      for (let itemIdx = 0; itemIdx < count; itemIdx++) {
        const finalLink = sLinks[itemIdx] || '';

        // Only show reels where the video final link has been uploaded by the editor
        if (finalLink) {
          const reelId = `${stepIdx}-${itemIdx}`;
          const statusObj = workflow.editingAssigning?.reelStatuses?.find(r => r.reelId === reelId);
          const reelStatus = statusObj?.status || 'pending';

          // Only show reels to the client if they have been sent to the client (or approved/revisioned)
          if (['sent_to_client', 'client_approved', 'client_revision'].includes(reelStatus)) {
            // Find the review log from workflow
            let review = workflow.reelReviews?.find(r => r.reelId === reelId);
            if (!review) {
              review = {
                status: reelStatus === 'sent_to_client' ? 'pending' : reelStatus,
                feedbackHistory: []
              };
            }

            // Sync status from tasks
            let taskStatus = review.status;
            tasks.forEach(t => {
              const sub = t.subTasks?.find(s => s.stepIndex === stepIdx && s.itemIndex === itemIdx);
              if (sub) {
                if (sub.status === 'revision') {
                  taskStatus = 'client_revision';
                } else if (sub.status === 'completed' && taskStatus === 'client_revision') {
                  taskStatus = 'pending'; // Editor solved it, ready for review again
                }
              }
            });

            reviewReels.push({
              reelId,
              stepIdx,
              itemIdx,
              type: step.type || 'Reel',
              description: step.description || '',
              scriptLink: sScripts[itemIdx] || '',
              rawShootLink: sRawLinks[itemIdx] || '',
              finalLink,
              status: taskStatus,
              feedbackHistory: review.feedbackHistory || [],
              caption: statusObj?.caption || '',
              collabs: statusObj?.collabs || '',
              specialNeeds: statusObj?.specialNeeds || ''
            });
          }
        }
      }
    });

    res.json({
      success: true,
      brandName: workflow.brandLead?.brandName || 'Brand',
      reels: reviewReels
    });
  } catch (error) {
    console.error('Get client review workflow error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching client review details' });
  }
};

const submitClientReview = async (req, res) => {
  try {
    const { brandLeadId } = req.params;
    const { stepIndex, itemIndex, status, feedback } = req.body;

    if (!mongoose.Types.ObjectId.isValid(brandLeadId)) {
      return res.status(400).json({ success: false, message: 'Invalid Brand Lead ID' });
    }

    const workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    if (!workflow.reelReviews) {
      workflow.reelReviews = [];
    }

    const reelId = `${stepIndex}-${itemIndex}`;
    let review = workflow.reelReviews.find(r => r.reelId === reelId);
    if (!review) {
      workflow.reelReviews.push({ reelId, status: 'pending', feedbackHistory: [] });
      // Re-find to get reference
      review = workflow.reelReviews.find(r => r.reelId === reelId);
    }

    if (status === 'approved') {
      review.status = 'client_approved';

      // Update workflow's editing status
      if (!workflow.editingAssigning) workflow.editingAssigning = {};
      if (!workflow.editingAssigning.reelStatuses) workflow.editingAssigning.reelStatuses = [];
      const rStatObj = workflow.editingAssigning.reelStatuses.find(r => r.reelId === reelId);
      if (rStatObj) rStatObj.status = 'client_approved';
      else workflow.editingAssigning.reelStatuses.push({ reelId, status: 'client_approved' });

      // Update Daily Tasks subtask
      const tasks = await Task.find({ project: brandLeadId, milestone: 'editing_assigning' });
      for (const task of tasks) {
        const sub = task.subTasks?.find(s => s.stepIndex === Number(stepIndex) && s.itemIndex === Number(itemIndex));
        if (sub) {
          sub.status = 'completed';
          await task.save();
        }
      }
    } else if (status === 'revision') {
      review.status = 'client_revision';
      review.feedbackHistory.push({
        feedback,
        createdAt: new Date()
      });

      // Update workflow's editing status
      if (!workflow.editingAssigning) workflow.editingAssigning = {};
      if (!workflow.editingAssigning.reelStatuses) workflow.editingAssigning.reelStatuses = [];
      const rStatObj = workflow.editingAssigning.reelStatuses.find(r => r.reelId === reelId);
      if (rStatObj) rStatObj.status = 'client_revision';
      else workflow.editingAssigning.reelStatuses.push({ reelId, status: 'client_revision' });

      // Update Daily Tasks subtask to revision state
      const tasks = await Task.find({ project: brandLeadId, milestone: 'editing_assigning' });
      for (const task of tasks) {
        const sub = task.subTasks?.find(s => s.stepIndex === Number(stepIndex) && s.itemIndex === Number(itemIndex));
        if (sub) {
          sub.status = 'revision';
          sub.revisionNotes = feedback;
          task.status = 'in_progress';
          await task.save();
        }
      }
    }

    workflow.markModified('reelReviews');
    workflow.markModified('editingAssigning.reelStatuses');
    await workflow.save();

    // Send WhatsApp notification for client review
    try {
      const whatsappService = require('../../services/whatsappService');
      const brandLead = await BrandLead.findById(brandLeadId).lean();
      const brandName = brandLead ? brandLead.brandName : 'Brand';

      const step = workflow.strategy?.steps?.[stepIndex];
      const stepType = step ? (step.type || 'Reel') : 'Reel';
      const reelName = `Step ${Number(stepIndex) + 1} - ${stepType} #${Number(itemIndex) + 1}`;

      let messageText = '';
      if (status === 'approved') {
        messageText = ` *Reel Approved by Client* \n\n` +
          `*Brand:* ${brandName}\n` +
          `*Milestone:* Editing Work (Client Review)\n` +
          `*Reel:* ${reelName}`;
      } else if (status === 'revision') {
        messageText = ` *Client Revision Requested* \n\n` +
          `*Brand:* ${brandName}\n` +
          `*Milestone:* Editing Work (Client Review)\n` +
          `*Reel:* ${reelName}\n` +
          `*Feedback/Notes:* ${feedback || 'No feedback provided.'}`;
      }

      if (messageText) {
        whatsappService.notifyWorkflowUpdate(brandLeadId, messageText).catch(e => console.error(e));
      }
    } catch (err) {
      console.error('Error sending WhatsApp notification for client review:', err);
    }

    res.json({ success: true, message: 'Client review updated successfully' });
  } catch (error) {
    console.error('Submit client review error:', error);
    res.status(500).json({ success: false, message: 'Server error updating client review' });
  }
};

module.exports = {
  getWorkflowByBrandLead,
  updateWorkflow,
  advanceMilestone,
  assignProductionTasks,
  requestScriptRevision,
  assignShootTasks,
  assignEditingTask,
  updateEditingStatus,
  getAllWorkflows,
  getClientReviewWorkflow,
  submitClientReview,
  verifyClientAccess
};
