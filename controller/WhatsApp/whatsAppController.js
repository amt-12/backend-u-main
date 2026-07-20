const whatsappService = require('../../services/whatsappService');
const fs = require('fs');
const path = require('path');

const logError = (context, error) => {
  try {
    const logPath = path.join(__dirname, '../../scratch_error.log');
    const details = `[${new Date().toISOString()}] Context: ${context}\n` +
                    `Error: ${error}\n` +
                    `Error Message: ${error?.message}\n` +
                    `Error Stack: ${error?.stack}\n` +
                    `JSON: ${JSON.stringify(error)}\n\n`;
    fs.appendFileSync(logPath, details, 'utf8');
  } catch (err) {
    console.error('Failed to write log file:', err);
  }
};

const getStatus = async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    logError('getStatus', error);
    res.status(500).json({ success: false, message: 'Server error retrieving status' });
  }
};

const getGroups = async (req, res) => {
  try {
    const groups = await whatsappService.getGroups();
    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Error getting WhatsApp groups:', error);
    logError('getGroups', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to retrieve groups. Ensure WhatsApp is linked.' });
  }
};

const sendMessage = async (req, res) => {
  const { groupId, message } = req.body;
  if (!groupId || !message) {
    return res.status(400).json({ success: false, message: 'Group ID and Message are required' });
  }

  try {
    await whatsappService.sendMessage(groupId, message);
    res.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    logError('sendMessage', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to send message.' });
  }
};

// Resolve a WhatsApp invite link to a group ID so we can send messages to it.
// Accepts full URL like https://chat.whatsapp.com/XXXXX or just the code.
const resolveInviteLink = async (req, res) => {
  const { inviteLink } = req.body;
  if (!inviteLink) {
    return res.status(400).json({ success: false, message: 'inviteLink is required' });
  }

  try {
    // Extract the invite code from the URL (handles ?mode=... query params too)
    let code = inviteLink.trim();
    const urlMatch = code.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (urlMatch) {
      code = urlMatch[1];
    }

    const info = await whatsappService.resolveInviteLink(code);
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('Error resolving invite link:', error);
    logError('resolveInviteLink', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to resolve invite link. Ensure WhatsApp is connected.' });
  }
};

const sendCalendarExcel = async (req, res) => {
  const { brandLeadId, whatsAppGroupLink } = req.body;
  if (!brandLeadId || !whatsAppGroupLink) {
    return res.status(400).json({ success: false, message: 'Brand Lead ID and WhatsApp Group Link are required' });
  }

  try {
    let targetGroupId = whatsAppGroupLink;
    if (whatsAppGroupLink && whatsAppGroupLink.includes('chat.whatsapp.com')) {
      try {
        targetGroupId = await whatsappService.getGroupIdFromLink(whatsAppGroupLink);
      } catch (resolveErr) {
        console.error('Failed to resolve invite link:', resolveErr);
        return res.status(400).json({ success: false, message: resolveErr.message || 'Invalid WhatsApp invite link.' });
      }
    }

    const BrandWorkflow = require('../../models/BrandWorkflow');
    const XLSX = require('xlsx');
    const { MessageMedia } = require('whatsapp-web.js');
    const dayjs = require('dayjs');

    // 1. Fetch the workflow and populate the brandLead
    const workflow = await BrandWorkflow.findOne({ brandLead: brandLeadId }).populate('brandLead');
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found for this brand' });
    }

    const scheduledReels = workflow.contentCalendar?.scheduledReels || [];
    if (scheduledReels.length === 0) {
      return res.status(400).json({ success: false, message: 'No reels are scheduled on the calendar yet.' });
    }

    // 2. Prepare worksheet data
    const data = [
      ['Date', 'Day', 'ACTIVITY', 'TYPE', 'Post Plan', 'STATUS']
    ];

    scheduledReels.forEach((item) => {
      const reelId = item.reelId;
      const scheduledDate = item.scheduledDate;

      // Parse reelId (stepIndex-itemIndex)
      const parts = reelId.split('-');
      const stepIdx = parseInt(parts[0], 10);
      const itemIdx = parseInt(parts[1], 10);

      const step = workflow.strategy?.steps?.[stepIdx];
      if (step) {
        const dateObj = dayjs(scheduledDate);
        const dateStr = dateObj.format('DD-MMMM-YYYY'); // e.g. 23-July-2026
        const dayStr = dateObj.format('dddd'); // e.g. Thursday (use dddd for full day name)
        
        // ACTIVITY: SHOOT or POST based on step type
        const activity = (step.type === 'Posts' || step.type === 'Meta') ? 'POST' : 'SHOOT';
        
        const typeStr = (step.type || '').toUpperCase();
        const postPlan = step.description || '';
        const status = 'Scheduled';

        data.push([dateStr, dayStr, activity, typeStr, postPlan, status]);
      }
    });

    // 3. Create Excel workbook and sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths for better presentation
    const colWidths = [
      { wch: 18 }, // Date
      { wch: 12 }, // Day
      { wch: 12 }, // ACTIVITY
      { wch: 12 }, // TYPE
      { wch: 40 }, // Post Plan
      { wch: 12 }  // STATUS
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Content Calendar');

    // Write to a buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 4. Create WhatsApp media object
    const media = new MessageMedia(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      excelBuffer.toString('base64'),
      'content_calendar.xlsx'
    );

    const brandName = workflow.brandLead?.brandName || 'Brand';
    const caption = `Hello Team,\n\nHere is the Content Calendar Excel sheet for *${brandName}*. Please review the scheduled plans.`;

    // 5. Send media message
    await whatsappService.sendMediaMessage(targetGroupId, media, caption);

    res.json({
      success: true,
      message: 'Excel sheet sent to WhatsApp group successfully'
    });
  } catch (error) {
    console.error('Error sending calendar excel:', error);
    logError('sendCalendarExcel', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send Excel sheet to WhatsApp group.' });
  }
};

const disconnect = async (req, res) => {
  try {
    await whatsappService.disconnectWhatsApp();
    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully. Generating new QR code...'
    });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    logError('disconnect', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect WhatsApp.' });
  }
};

module.exports = {
  getStatus,
  getGroups,
  sendMessage,
  resolveInviteLink,
  sendCalendarExcel,
  disconnect
};
