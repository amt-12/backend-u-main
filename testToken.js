const mongoose = require('mongoose');
const dotenv = require('dotenv');
const College = require('./models/College');

dotenv.config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to DB');
    const colleges = await College.find({});
    console.log(`Found ${colleges.length} total colleges.`);
    
    colleges.forEach(c => {
      console.log(`College: ${c.name}, Status: ${c.inviteStatus}, Token: ${c.inviteToken}, Expiry: ${c.inviteTokenExpiry}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to DB:', err);
    process.exit(1);
  });
