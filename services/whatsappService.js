const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

let client = null;
let qrCodeData = null;
let status = 'disconnected'; // 'disconnected', 'qr_ready', 'connecting', 'connected'

const killStrayChrome = () => {
  try {
    const { execSync } = require('child_process');
    // Forcefully kill any lingering chromium processes on Linux to prevent CPU/RAM leaks
    execSync('pkill -f "chrome|chromium"', { stdio: 'ignore' });
  } catch (e) {}
};

const initWhatsApp = () => {
  if (client) return;

  console.log('🔮 Initializing WhatsApp Client...');
  status = 'connecting';
  
  killStrayChrome();
  
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '../.wwebjs_auth')
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-gpu',
        '--disable-dev-shm-usage', // Prevent shared memory issues on low RAM
        '--single-process',        // Run in a single process to save RAM
        '--no-zygote',
        '--disable-accelerated-2d-canvas',
        '--disable-software-rasterizer'
      ]
    }
  });

  client.on('qr', async (qr) => {
    console.log('📸 WhatsApp QR code received, generating image...');
    try {
      qrCodeData = await qrcode.toDataURL(qr);
      status = 'qr_ready'; // Set status only AFTER image is ready to prevent race conditions
    } catch (err) {
      console.error('Error generating QR code data URL:', err);
    }
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp Client is READY!');
    status = 'connected';
    qrCodeData = null;
  });

  client.on('authenticated', () => {
    console.log('🔑 WhatsApp Client authenticated!');
  });

  client.on('auth_failure', async (msg) => {
    console.error('❌ WhatsApp Authentication failure:', msg);
    status = 'disconnected';
    qrCodeData = null;
    
    // Auth failed (e.g. user logged out from phone). We must delete the session and re-initialize.
    try {
      if (client) {
        await Promise.race([
          client.destroy(),
          new Promise(res => setTimeout(res, 5000))
        ]).catch(() => {});
      }
    } catch (err) {
      console.log('Error destroying client on auth_failure:', err.message);
    }
    
    killStrayChrome();
    
    const authPath = path.join(__dirname, '../.wwebjs_auth');
    const fs = require('fs');
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('🗑️ Deleted invalid WhatsApp session data.');
    }
    
    client = null;
    console.log('🔄 Re-initializing WhatsApp after auth failure...');
    setTimeout(() => initWhatsApp(), 3000);
  });

  client.on('disconnected', async (reason) => {
    console.log('🔌 WhatsApp Client disconnected:', reason);
    status = 'disconnected';
    qrCodeData = null;
    
    try {
      if (client) {
        await Promise.race([
          client.destroy(),
          new Promise(res => setTimeout(res, 5000))
        ]).catch(() => {});
      }
    } catch (err) {
      console.log('Error destroying client on disconnected:', err.message);
    }

    killStrayChrome();

    // Re-initialize client after disconnection to retry
    client = null;
    setTimeout(() => initWhatsApp(), 5000);
  });

  client.initialize().catch(err => {
    console.error('❌ Error initializing WhatsApp client:', err);
    status = 'disconnected';
    killStrayChrome();
    client = null;
    setTimeout(() => initWhatsApp(), 5000);
  });
};

const getStatus = () => {
  return {
    status,
    qrCode: qrCodeData
  };
};

const getGroups = async () => {
  if (!client || status !== 'connected') {
    throw new Error('WhatsApp is not connected');
  }
  try {
    const chats = await client.getChats();
    if (!Array.isArray(chats)) return [];
    const groups = chats
      .filter(chat => chat && chat.isGroup)
      .map(chat => ({
        id: chat.id._serialized,
        name: chat.name || 'Unnamed Group'
      }));
    return groups;
  } catch (err) {
    console.error('Error fetching chats from Puppeteer:', err);
    return [];
  }
};

const sendMessage = async (chatIdOrInvite, messageText) => {
  if (!client || status !== 'connected') {
    throw new Error('WhatsApp is not connected');
  }
  
  let targetChatId = chatIdOrInvite;
  
  // If it's an invite link
  if (chatIdOrInvite.includes('chat.whatsapp.com')) {
    let code = chatIdOrInvite.trim();
    const urlMatch = code.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (urlMatch) {
      code = urlMatch[1];
    }
    
    try {
      // First try to resolve invite info to get the group ID
      const info = await client.getInviteInfo(code);
      if (info && info.id && info.id._serialized) {
        targetChatId = info.id._serialized;
      }
    } catch (err) {
      console.log('Error resolving invite info:', err.message);
    }
    
    try {
      // Accept invite (join the group)
      const joinedId = await client.acceptInvite(code);
      if (joinedId) {
        targetChatId = joinedId;
      }
    } catch (err) {
      console.log('Error accepting invite (already joined or invalid):', err.message);
    }
  }
  
  const response = await client.sendMessage(targetChatId, messageText);
  return response;
};

const sendMediaMessage = async (chatIdOrInvite, media, caption) => {
  if (!client || status !== 'connected') {
    throw new Error('WhatsApp is not connected');
  }
  
  let targetChatId = chatIdOrInvite;
  
  if (chatIdOrInvite.includes('chat.whatsapp.com')) {
    let code = chatIdOrInvite.trim();
    const urlMatch = code.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (urlMatch) {
      code = urlMatch[1];
    }
    
    try {
      const info = await client.getInviteInfo(code);
      if (info && info.id && info.id._serialized) {
        targetChatId = info.id._serialized;
      }
    } catch (err) {
      console.log('Error resolving invite info:', err.message);
    }
    
    try {
      const joinedId = await client.acceptInvite(code);
      if (joinedId) {
        targetChatId = joinedId;
      }
    } catch (err) {
      console.log('Error accepting invite (already joined or invalid):', err.message);
    }
  }
  
  const response = await client.sendMessage(targetChatId, media, { caption });
  return response;
};

// Resolve a WhatsApp invite code → group info (id + name) without joining
const resolveInviteLink = async (code) => {
  if (!client || status !== 'connected') {
    throw new Error('WhatsApp is not connected');
  }
  try {
    // getInviteInfo returns group metadata including id._serialized and subject
    const info = await client.getInviteInfo(code);
    if (!info) throw new Error('Could not resolve invite link. It may be invalid or expired.');
    return {
      id: info.id._serialized,
      name: info.subject || 'Unknown Group'
    };
  } catch (err) {
    throw new Error(err.message || 'Failed to resolve invite link.');
  }
};

// Resolve a WhatsApp invite code → group ID without joining


// New helper: get group JID from a full invite URL
const getGroupIdFromLink = async (inviteUrl) => {
  if (!inviteUrl) throw new Error('Invite URL is required');
  // Extract the code part after /
  const match = inviteUrl.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
  if (!match) throw new Error('Invalid WhatsApp invite URL');
  const code = match[1];
  const info = await resolveInviteLink(code);
  return info.id; // Serialized JID
};

// Send automatic notifications about workflow updates to the brand's WhatsApp group
const notifyWorkflowUpdate = async (brandLeadId, messageText) => {
  const fs = require('fs');
  const path = require('path');
  const logPath = path.join(__dirname, '../scratch_error.log');
  const logDebug = (msg) => {
    try {
      fs.appendFileSync(logPath, `[DEBUG-WA ${new Date().toISOString()}] ${msg}\n`, 'utf8');
    } catch (e) {
      console.error('Failed to write debug log:', e);
    }
  };

  logDebug(`notifyWorkflowUpdate triggered for brandLeadId: ${brandLeadId}`);
  logDebug(`- Client initialized: ${!!client}, Status: ${status}`);

  if (!client || status !== 'connected') {
    logDebug(`- Skipping: WhatsApp client is not connected.`);
    console.log('[WhatsApp Auto-Update] WhatsApp client is not connected. Skipping notification.');
    return;
  }

  try {
    const BrandLead = require('../models/BrandLead');
    const brandLead = await BrandLead.findById(brandLeadId);
    if (!brandLead) {
      logDebug(`- Skipping: BrandLead not found for ID: ${brandLeadId}`);
      return;
    }
    logDebug(`- Found BrandLead: "${brandLead.brandName}", groupLink: "${brandLead.whatsAppGroupLink}"`);

    if (!brandLead.whatsAppGroupLink) {
      logDebug(`- Skipping: No group link configured.`);
      console.log(`[WhatsApp Auto-Update] No WhatsApp group link configured for brandLeadId: ${brandLeadId}`);
      return;
    }

    const inviteUrl = brandLead.whatsAppGroupLink.trim();
    let targetGroupId = inviteUrl;

    if (inviteUrl.includes('chat.whatsapp.com')) {
      const match = inviteUrl.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
      if (match) {
        const code = match[1];
        const info = await resolveInviteLink(code);
        targetGroupId = info.id;
      }
    }

    logDebug(`- Sending message to group: ${targetGroupId}, message length: ${messageText.length}`);
    console.log(`[WhatsApp Auto-Update] Sending automatic notification to group: ${targetGroupId}`);
    await client.sendMessage(targetGroupId, messageText);
    logDebug(`- Message sent successfully!`);
  } catch (error) {
    logDebug(`- ERROR sending notification: ${error.message}\n${error.stack}`);
    console.error(`[WhatsApp Auto-Update] Failed to send notification for brand ${brandLeadId}:`, error.message);
  }
};

const disconnectWhatsApp = async () => {
  console.log('🛑 Forcing WhatsApp disconnection by user request...');
  try {
    if (client) {
      await Promise.race([
        client.logout().catch(() => {}),
        new Promise(res => setTimeout(res, 3000))
      ]);
      await Promise.race([
        client.destroy().catch(() => {}),
        new Promise(res => setTimeout(res, 3000))
      ]);
    }
  } catch (err) {
    console.log('Error destroying client on forced disconnect:', err.message);
  }
  
  killStrayChrome();
  
  const authPath = path.join(__dirname, '../.wwebjs_auth');
  const fs = require('fs');
  if (fs.existsSync(authPath)) {
    fs.rmSync(authPath, { recursive: true, force: true });
    console.log('🗑️ Deleted WhatsApp session data.');
  }
  
  status = 'disconnected';
  qrCodeData = null;
  client = null;
  
  console.log('🔄 Re-initializing WhatsApp after forced disconnect...');
  setTimeout(() => initWhatsApp(), 1000);
  return { success: true };
};

module.exports = {
  initWhatsApp,
  getStatus,
  getGroups,
  sendMessage,
  sendMediaMessage,
  resolveInviteLink,
  getGroupIdFromLink,
  notifyWorkflowUpdate,
  disconnectWhatsApp
};

