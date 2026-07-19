const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandLead', default: null },
    milestone: { type: String, default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue', 'revision'],
      default: 'pending'
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'revision'],
      default: 'pending'
    },
    revisionNotes: { type: String, default: '' },
    revisionHistory: [
      {
        notes: { type: String, default: '' },
        date: { type: Date, default: Date.now }
      }
    ],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
    deckLink: { type: String, default: '' },
    subTasks: [
      {
        title: { type: String, default: '' },
        scriptLink: { type: String, default: '' },
        finalLink: { type: String, default: '' },
        rawShootLink: { type: String, default: '' },
        status: { type: String, enum: ['pending', 'completed', 'in_review', 'revision'], default: 'pending' },
        stepIndex: { type: Number, default: 0 },
        itemIndex: { type: Number, default: 0 },
        revisionNotes: { type: String, default: '' }
      }
    ]
  },
  { timestamps: true }
);

taskSchema.pre('save', function () {
  this._wasNew = this.isNew;
  this._isStatusModified = this.isModified('status');
  this._isAssignedToModified = this.isModified('assignedTo');
  this._isApprovalStatusModified = this.isModified('approvalStatus');
});

taskSchema.post('save', async function (doc) {
  const fs = require('fs');
  const path = require('path');
  const logPath = path.join(__dirname, '../scratch_error.log');
  const logDebug = (msg) => {
    try {
      fs.appendFileSync(logPath, `[DEBUG ${new Date().toISOString()}] ${msg}\n`, 'utf8');
    } catch (e) {
      console.error('Failed to write debug log:', e);
    }
  };

  try {
    logDebug(`Task post-save triggered for task ID: ${doc._id}, title: "${doc.title}"`);
    logDebug(`- project: ${doc.project}`);
    logDebug(`- milestone: ${doc.milestone}`);
    logDebug(`- _wasNew: ${this._wasNew}`);
    logDebug(`- _isStatusModified: ${this._isStatusModified}`);
    logDebug(`- _isAssignedToModified: ${this._isAssignedToModified}`);

    // Run this update notifications asynchronously so it doesn't block the HTTP request execution
    const whatsappService = require('../services/whatsappService');
    const BrandLead = require('./BrandLead');
    const User = require('./Auth/User');

    if (!doc.project) {
      logDebug(`- Skipping: no project associated with task.`);
      return;
    }

    const brandLead = await BrandLead.findById(doc.project).lean();
    if (!brandLead) {
      logDebug(`- Skipping: BrandLead project not found for ID: ${doc.project}`);
      return;
    }
    logDebug(`- Found BrandLead: "${brandLead.brandName}", groupLink: "${brandLead.whatsAppGroupLink}"`);

    if (!brandLead.whatsAppGroupLink) {
      logDebug(`- Skipping: BrandLead has no whatsAppGroupLink configured.`);
      return;
    }

    const milestoneTitles = {
      pre_work: 'Pre-work',
      strategy: 'Strategy',
      production_deck: 'Production Deck',
      assigning_photographers: 'Photographer Shoot',
      editing_assigning: 'Editing Work',
      content_planner: 'Content Planner',
      content_calendar: 'Content Calendar'
    };

    const milestoneTitle = milestoneTitles[doc.milestone] || doc.milestone || 'General';
    const brandName = brandLead.brandName || 'Brand';
    let messageText = '';

    if (this._wasNew) {
      // Task Assigned / Created
      const assignedToUser = await User.findById(doc.assignedTo).lean();
      const assigneeName = assignedToUser ? (assignedToUser.fullName || assignedToUser.name) : 'Someone';
      const deadlineStr = doc.deadline ? new Date(doc.deadline).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }) : 'No deadline';

      messageText = ` *New Task Assigned* \n\n` +
        `*Brand:* ${brandName}\n` +
        `*Milestone:* ${milestoneTitle}\n` +
        `*Task:* ${doc.title}\n` +
        `*Assignee:* ${assigneeName}\n` +
        `*Deadline:* ${deadlineStr}\n` +
        `*Description:* ${doc.description || 'No description provided'}`;
    } else if ((this._isStatusModified && doc.status === 'revision') || (this._isApprovalStatusModified && doc.approvalStatus === 'revision')) {
      // Revision Requested
      messageText = ` *Revision Requested* \n\n` +
        `*Brand:* ${brandName}\n` +
        `*Milestone:* ${milestoneTitle}\n` +
        `*Task:* ${doc.title}\n` +
        `*Feedback/Notes:* ${doc.revisionNotes || 'No notes specified.'}`;
    } else if (this._isAssignedToModified) {
      // Re-assignment
      const assignedToUser = await User.findById(doc.assignedTo).lean();
      const assigneeName = assignedToUser ? (assignedToUser.fullName || assignedToUser.name) : 'Someone';
      const deadlineStr = doc.deadline ? new Date(doc.deadline).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }) : 'No deadline';

      messageText = ` *Task Re-assigned* \n\n` +
        `*Brand:* ${brandName}\n` +
        `*Milestone:* ${milestoneTitle}\n` +
        `*Task:* ${doc.title}\n` +
        `*New Assignee:* ${assigneeName}\n` +
        `*Deadline:* ${deadlineStr}`;
    }

    if (messageText) {
      logDebug(`- Generated WhatsApp message: ${messageText.replace(/\n/g, ' [NL] ')}`);
      whatsappService.notifyWorkflowUpdate(doc.project, messageText).catch(err => {
        logDebug(`- WhatsApp send error: ${err.message}`);
        console.error('[Mongoose Hook WhatsApp Error]:', err.message);
      });
    } else {
      logDebug(`- Skipping: No matching notification condition met (not new, not revision, not reassigned).`);
    }
  } catch (error) {
    logDebug(`- CRITICAL ERROR inside post-save hook: ${error.message}\n${error.stack}`);
    console.error('Error in Task post-save hook:', error);
  }
});

module.exports = mongoose.model('Task', taskSchema);

