const mongoose = require("mongoose");
const BookCall = require("./models/BookCall");

async function run() {
  try {
    await mongoose.connect("mongodb+srv://amrit0207232_db_user:qK6Vp5GdsmICTsKk@unrealstudioz.pvoc22n.mongodb.net/");
    console.log("Database connected.");
    const bookings = await BookCall.find({ movedToOnboarded: { $ne: true } }).lean();
    console.log(`Bookings (Website Leads) Count: ${bookings.length}`);
    bookings.forEach((b, i) => {
      console.log(`Booking #${i+1}: _id: ${b._id} | name: ${b.name} | tags: ${JSON.stringify(b.tags)} | status: ${b.status}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
