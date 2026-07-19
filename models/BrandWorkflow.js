const mongoose = require('mongoose');

const brandWorkflowSchema = new mongoose.Schema(
  {
    brandLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BrandLead',
      required: true,
      unique: true,
      index: true
    },
    currentMilestone: {
      type: String,
      enum: [
        'pre_work',
        'strategy',
        'production_deck',
        'assigning_photographers',
        'upload',
        'editing_assigning',
        'content_planner',
        'content_calendar'
      ],
      default: 'pre_work'
    },
    preWork: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    },
    strategy: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      planNotes: { type: String, default: '' },
      clientConfirmed: { type: Boolean, default: false },
      finalized: { type: Boolean, default: false },
      steps: [
        {
          type: { type: String, default: '' },
          count: { type: Number, default: 0 },
          description: { type: String, default: '' },
          script: { type: String, default: '' },
          scripts: [{ type: String, default: '' }],
          links: [{ type: String, default: '' }],
          rawShootLinks: [{ type: String, default: '' }],
          assignedEditors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }],
          scriptStatuses: [{ type: String, default: 'pending' }],
          scriptRevisions: [{ type: String, default: '' }]
        }
      ]
    },
    productionDeck: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      deckLink: { type: String, default: '' },
      notes: { type: String, default: '' },
      assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      deadline: { type: Date, default: null }
    },
    assigningPhotographers: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      photographers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      shootLocation: { type: String, default: '' },
      shootDate: { type: Date, default: null },
      calendarUpdated: { type: Boolean, default: false },
      reminderSent: { type: Boolean, default: false }
    },
    upload: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      driveLink: { type: String, default: '' }
    },
    editingAssigning: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      editors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      notes: { type: String, default: '' },
      reelStatuses: [
        {
          reelId: { type: String, required: true },
          status: { type: String, enum: ['pending', 'assigned', 'completed', 'in_review', 'sent_to_client', 'client_approved', 'client_revision'], default: 'pending' },
          caption: { type: String, default: '' },
          collabs: { type: String, default: '' },
          specialNeeds: { type: String, default: '' }
        }
      ]
    },
    contentPlanner: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      plannerLink: { type: String, default: '' },
      notes: { type: String, default: '' }
    },
    contentCalendar: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      calendarLink: { type: String, default: '' },
      clientApproved: { type: Boolean, default: false },
      scheduledReels: [
        {
          reelId: { type: String, required: true },
          scheduledDate: { type: Date, required: true }
        }
      ]
    },
    reelReviews: [
      {
        reelId: { type: String, required: true },
        status: { type: String, enum: ['pending', 'completed', 'client_approved', 'client_revision'], default: 'pending' },
        feedback: { type: String, default: '' },
        feedbackHistory: [
          {
            feedback: { type: String },
            createdAt: { type: Date, default: Date.now }
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('BrandWorkflow', brandWorkflowSchema);
