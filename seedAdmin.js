const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("./models/Auth/User");

dotenv.config({ path: './.env' });

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not found in environment variables");
      process.exit(1);
    }

    console.log(`Connecting to: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log("Database connected successfully.");

    // 1. First admin user
    const email1 = "admin@gmail.com";
    const password1 = "admin@unreal123";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword1 = await bcrypt.hash(password1, salt);

    let user1 = await User.findOne({ email: email1 });
    if (user1) {
      user1.password = hashedPassword1;
      user1.role = "admin";
      user1.status = "active";
      user1.isTemp = false;
      await user1.save();
      console.log(`Updated existing admin user: ${email1}`);
    } else {
      user1 = await User.create({
        name: "System Admin",
        email: email1,
        password: hashedPassword1,
        role: "admin",
        status: "active",
        isTemp: false
      });
      console.log(`Created new admin user: ${email1}`);
    }

    // 2. Harman Kaur user
    const email2 = "harmankaurgulati@gmail.com";
    const harmanData = {
      name: "Harman Kaur",
      email: email2,
      password: "$2b$10$y1NAwyETj2UfSSF4OK5bKOxPsrqqlWTuua0q07lKdF1yvEcQ6KoT2",
      role: "admin",
      isTemp: false,
      status: "active",
      phone: "7009049940",
      course: "",
      address: "",
      profileImage: "profiles/6a0c10c7d776bb12f4e24d3b-1779273032157-1.jpg",
      department: "",
      designation: "",
      employeeType: "full_time",
      documents: {
        educationalCertificate: "",
        identityProof: "",
        medicalDocument: "",
        offerLetter: ""
      },
      salaryStructure: {
        baseSalary: 0,
        hra: 0,
        other: 0,
        pf: 0,
        taxDeduction: 0,
        transport: 0
      },
      permissions: [
        "Finance:read", "Finance:write", "Finance:delete",
        "Staff:read", "Staff:write", "Staff:delete",
        "Colleges:read", "Colleges:write", "Colleges:delete",
        "Leads:read", "Leads:write", "Leads:delete",
        "Attendance:read", "Attendance:write", "Attendance:delete",
        "Leaves:read", "Leaves:write", "Leaves:delete",
        "AccessManagement:read", "AccessManagement:write", "AccessManagement:delete",
        "Settings:read", "Settings:write", "Settings:delete",
        "Dashboard:read", "Dashboard:write", "Dashboard:delete",
        "Tasks:read", "Tasks:write", "Tasks:delete",
        "Profile:read", "Profile:write", "Profile:delete",
        "Chat:read", "Chat:write", "Chat:delete",
        "Team:read", "Team:write", "Team:delete",
        "Documents:read", "Documents:write", "Documents:delete",
        "Notifications:read", "Notifications:write", "Notifications:delete",
        "Requests:read", "Requests:write", "Requests:delete",
        "Activities:read", "Activities:write", "Activities:delete",
        "human-resource:read", "human-resource:write", "human-resource:delete",
        "system:read", "system:write", "system:delete"
      ]
    };

    let user2 = await User.findOne({ email: email2 });
    if (user2) {
      Object.assign(user2, harmanData);
      await user2.save();
      console.log(`Updated existing user: ${email2}`);
    } else {
      user2 = await User.create(harmanData);
      console.log(`Created new user: ${email2}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
