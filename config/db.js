const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://amrit0207232_db_user:q7VVID0N2PL8IoD1@ac-xevjxqj-shard-00-00.uc6gevo.mongodb.net:27017,ac-xevjxqj-shard-00-01.uc6gevo.mongodb.net:27017,ac-xevjxqj-shard-00-02.uc6gevo.mongodb.net:27017/?ssl=true&replicaSet=atlas-y1ysj8-shard-0&authSource=admin&appName=job-engine");

    console.log("MongoDB Connected");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;