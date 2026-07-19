const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const LiveClass = require('../models/LiveClass');
const BrandWorkflow = require('../models/BrandWorkflow');
const { sendEmail } = require('./emailService');

let cronJob = null;

const startReminderCron = () => {
  // Run every minute: check for due reminders
  cronJob = cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find unsent reminders due now (±1min tolerance)
      const dueReminders = await Reminder.find({
        reminderTime: { $lte: new Date(now.getTime() + 60 * 1000) }, // +1min
        sent: false
      }).populate('studentId', 'email name').populate('liveClassId', 'title subject joinUrl password startTime');

      for (const reminder of dueReminders) {
        const { studentId, liveClassId } = reminder;
        const classTitle = liveClassId.title;
        const startTime = new Date(liveClassId.startTime).toLocaleString();
        const joinUrl = liveClassId.joinUrl;
        const password = liveClassId.password;

        // Send email
        await sendEmail(
          studentId.email,
          `🔔 Live Class Reminder: ${classTitle} starts in 10 minutes!`,
          {
            name: studentId.name,
            subject: 'Live Class Reminder - 10 Minutes Left!',
            message: `
              <h2>⏰ Your class is starting in 10 minutes!</h2>
              <p><strong>${classTitle}</strong></p>
              <p>📅 <strong>Starts:</strong> ${startTime}</p>
              <p>👉 <strong>Join Now:</strong></p>
              <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin:15px 0;">
                <p><strong>Zoom Link:</strong> <a href="${joinUrl}" style="color:#2563eb;">${joinUrl}</a></p>
                <p><strong>Meeting ID:</strong> ${liveClassId.zoomMeetingId}</p>
                <p><strong>Passcode:</strong> ${password}</p>
              </div>
              <p>Don't miss this interactive session!</p>
              <p>Best,<br>Abhishek's Academy Team</p>
            `
          }
        );

        // Mark as sent
        reminder.sent = true;
        await reminder.save();

        console.log(`✅ Reminder sent to ${studentId.email} for ${classTitle}`);
      }

      // Check upcoming shoot reminders for photographers (1 day before)
      try {
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const shootWorkflows = await BrandWorkflow.find({
          currentMilestone: 'assigning_photographers',
          'assigningPhotographers.shootDate': { $ne: null, $lte: oneDayFromNow },
          'assigningPhotographers.reminderSent': { $ne: true }
        }).populate('brandLead', 'brandName').populate('assigningPhotographers.photographers', 'name email');

        for (const wf of shootWorkflows) {
          const brandName = wf.brandLead?.brandName || 'Brand';
          const shootDateStr = new Date(wf.assigningPhotographers.shootDate).toLocaleString();
          const shootLocation = wf.assigningPhotographers.shootLocation || 'Decided location';
          const photographers = wf.assigningPhotographers.photographers || [];

          for (const photo of photographers) {
            if (!photo.email) continue;
            
            // Send Email
            try {
              await sendEmail(
                photo.email,
                `📸 Shoot Reminder: Shoot for ${brandName} is scheduled tomorrow!`,
                {
                  name: photo.name,
                  subject: `Shoot Reminder - ${brandName}`,
                  message: `
                    <h2>📸 Shoot Reminder!</h2>
                    <p>Hello <strong>${photo.name}</strong>,</p>
                    <p>This is a reminder that you are scheduled for a shoot for <strong>${brandName}</strong> tomorrow.</p>
                    <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin:15px 0;">
                      <p>📅 <strong>Time:</strong> ${shootDateStr}</p>
                      <p>📍 <strong>Location:</strong> ${shootLocation}</p>
                    </div>
                    <p>Please make sure to check the production deck and arrive on time.</p>
                    <p>Best regards,<br>Unreal Studio Operations Team</p>
                  `
                }
              );
              console.log(`✅ Photographer shoot email sent to ${photo.email} for ${brandName}`);
            } catch (err) {
              console.error(`Failed to send shoot email to ${photo.email}:`, err);
            }

            // Create Notification
            try {
              const NotificationModel = require('../models/Notification');
              const notification = new NotificationModel({
                title: `📸 Shoot Scheduled: ${brandName}`,
                message: `Reminder: You have a shoot scheduled for ${brandName} tomorrow at ${shootLocation} (${shootDateStr}).`,
                type: 'reminder',
                target: 'all',
                recipients: [{ userId: photo._id, isRead: false }]
              });
              await notification.save();

              if (global.io) {
                global.io.to(`user_${photo._id}`).emit('newNotification', {
                  _id: notification._id.toString(),
                  title: notification.title,
                  message: notification.message,
                  type: notification.type,
                  createdAt: notification.createdAt.toISOString()
                });
              }
            } catch (err) {
              console.error(`Failed to create db notification for photographer ${photo.email}:`, err);
            }
          }

          // Mark reminder as sent
          wf.assigningPhotographers.reminderSent = true;
          await wf.save();
        }
      } catch (err) {
        console.error('Error checking photographer shoot reminders in cron:', err);
      }

    } catch (error) {
      console.error('Reminder cron error:', error);
    }
  });

  console.log('🔄 Reminder cron started (every minute)');
};

const stopReminderCron = () => {
  if (cronJob) {
    cronJob.stop();
    console.log('⏹️ Reminder cron stopped');
  }
};

module.exports = { startReminderCron, stopReminderCron };

