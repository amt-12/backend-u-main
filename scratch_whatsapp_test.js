const whatsappService = require('./services/whatsappService');

whatsappService.initWhatsApp();

setTimeout(async () => {
  try {
    const status = whatsappService.getStatus();
    console.log('--- WhatsApp Status ---');
    console.log(status);
    
    if (status.status === 'connected') {
      console.log('--- WhatsApp Groups ---');
      const groups = await whatsappService.getGroups();
      console.log(`Fetched ${groups.length} groups successfully:`);
      console.log(groups);
    } else {
      console.log('WhatsApp is not in "connected" state yet.');
    }
  } catch (err) {
    console.error('Error fetching details:', err);
  }
  process.exit(0);
}, 6000);
