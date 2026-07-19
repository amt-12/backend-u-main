const mongoose = require("mongoose");
const BrandLead = require("./models/BrandLead");
const BookCall = require("./models/BookCall");

async function run() {
  try {
    await mongoose.connect("mongodb+srv://amrit0207232_db_user:qK6Vp5GdsmICTsKk@unrealstudioz.pvoc22n.mongodb.net/");
    console.log("Database connected.");
    const brandLeadsCount = await BrandLead.countDocuments({});
    const bookingsCount = await BookCall.countDocuments({});
    console.log(`BrandLeads Count: ${brandLeadsCount}`);
    console.log(`Bookings (Website Leads) Count: ${bookingsCount}`);
    
    if (brandLeadsCount > 0) {
      const leads = await BrandLead.find({});
      leads.forEach((l, i) => {
        console.log(`Lead #${i+1}: ${l.brandName} | Est: ${l.estimatedDealValue} | Final: ${l.finalDealValue} | Status: ${l.status}`);
        console.log(`  CatData:`, JSON.stringify(l.categoryData));
      });
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
