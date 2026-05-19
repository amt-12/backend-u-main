const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = "mongodb+srv://amrit0207232_db_user:qK6Vp5GdsmICTsKk@unrealstudioz.pvoc22n.mongodb.net/";

    if (!mongoUri) {
      throw new Error('Missing environment variable: MONGODB_URI');
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB Connected");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;