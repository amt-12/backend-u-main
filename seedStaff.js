const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/Auth/User");

dotenv.config({ path: './.env' });

const staffData = [
  {
    _id: "6a0c0ffad776bb12f4e24d16",
    name: "Amrit",
    email: "amrit0207232@gmail.com",
    password: "$2b$10$y1NAwyETj2UfSSF4OK5bKOxPsrqqlWTuua0q07lKdF1yvEcQ6KoT2",
    role: "admin",
    isTemp: false,
    status: "active",
    phone: "+919915497887",
    course: "",
    address: "",
    tempExpiry: null,
    profileImage: "profiles/6a0c0ffad776bb12f4e24d16-1779782817330-L@U - LOGO1 (1).png",
    createdAt: new Date("2026-05-19T07:23:38.758Z"),
    updatedAt: new Date("2026-06-01T03:56:23.973Z"),
    department: "Engineering",
    designation: "",
    documents: {
      identityProof: "blob:https://admin.unrealstudiozz.com/1a599895-c507-45e5-bde9-6198779b8271",
      educationalCertificate: "",
      offerLetter: "",
      medicalDocument: ""
    },
    employeeType: "full_time",
    moduleVisibility: [],
    salaryStructure: {
      baseSalary: 0,
      hra: 0,
      transport: 0,
      other: 0,
      taxDeduction: 0,
      pf: 0
    },
    permissions: [
      "Dashboard:read", "Dashboard:write", "Dashboard:delete",
      "Attendance:read", "Attendance:write", "Attendance:delete",
      "Leaves:read", "Leaves:write", "Leaves:delete",
      "Tasks:read", "Tasks:write", "Tasks:delete",
      "Courses:read", "Courses:write", "Courses:delete",
      "Trainers:read", "Trainers:write", "Trainers:delete",
      "Students:read", "Students:write", "Students:delete",
      "Staff:read", "Staff:write", "Staff:delete",
      "Colleges:read", "Colleges:write", "Colleges:delete",
      "Broadcast:read", "Broadcast:write", "Broadcast:delete",
      "TestResults:read", "TestResults:write", "TestResults:delete",
      "AccessManagement:read", "AccessManagement:write", "AccessManagement:delete",
      "Profile:read", "Profile:write", "Profile:delete",
      "Settings:read", "Settings:write", "Settings:delete",
      "Chat:read", "Chat:write", "Chat:delete",
      "Team:read", "Team:write", "Team:delete",
      "Documents:read", "Documents:write", "Documents:delete",
      "Requests:read", "Requests:write", "Requests:delete",
      "Notifications:read", "Notifications:write", "Notifications:delete",
      "Marketing:read", "Marketing:write", "Marketing:delete",
      "Sales:read", "Sales:write", "Sales:delete",
      "Bidding:read", "Bidding:write", "Bidding:delete",
      "Placement:read", "Placement:write", "Placement:delete",
      "Training:read", "Training:write", "Training:delete",
      "Admission:read", "Admission:write", "Admission:delete",
      "ChatMonitoring:read", "ChatMonitoring:write", "ChatMonitoring:delete",
      "Activities:read", "Activities:write", "Activities:delete",
      "Finance:read", "Finance:write", "Finance:delete",
      "Internships:read", "Internships:write", "Internships:delete",
      "Leads:read", "Leads:write", "Leads:delete",
      "PlacementDrives:read", "PlacementDrives:write", "PlacementDrives:delete",
      "human-resource:read", "human-resource:write", "human-resource:delete",
      "system:read", "system:write", "system:delete"
    ],
    dateOfJoining: new Date("2026-05-19T00:00:00.000Z"),
    reportingTo: null
  },
  {
    _id: "6a0c10c7d776bb12f4e24d3b",
    name: "Harman Kaur",
    email: "harmankaurgulati@gmail.com",
    password: "$2b$10$y1NAwyETj2UfSSF4OK5bKOxPsrqqlWTuua0q07lKdF1yvEcQ6KoT2",
    role: "admin",
    isTemp: false,
    status: "active",
    phone: "7009049940",
    course: "",
    address: "",
    tempExpiry: null,
    profileImage: "profiles/6a0c10c7d776bb12f4e24d3b-1779273032157-1.jpg",
    createdAt: new Date("2026-05-19T07:27:03.460Z"),
    updatedAt: new Date("2026-05-28T04:15:16.537Z"),
    department: "",
    designation: "",
    documents: {
      educationalCertificate: "",
      identityProof: "",
      medicalDocument: "",
      offerLetter: ""
    },
    employeeType: "full_time",
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
  },
  {
    _id: "6a0d8629bb12e59693d80a1e",
    name: "Jaskaran",
    email: "us.grafixkaran@gmail.com",
    password: "$2b$10$y1NAwyETj2UfSSF4OK5bKOxPsrqqlWTuua0q07lKdF1yvEcQ6KoT2",
    role: "employee",
    isTemp: false,
    status: "active",
    phone: "9915331322",
    course: "",
    address: "",
    tempExpiry: null,
    profileImage: "profiles/6a0d8629bb12e59693d80a1e-1779275941991-2bef91d50924fab6e10ff12a1fd2f9d3.png",
    department: "Design",
    designation: "Graphic",
    dateOfJoining: new Date("2026-05-20T00:00:00.000Z"),
    reportingTo: "6a0c10c7d776bb12f4e24d3b",
    employeeType: "full_time",
    salaryStructure: {
      baseSalary: 0,
      hra: 0,
      transport: 0,
      other: 0,
      taxDeduction: 0,
      pf: 0
    },
    documents: {
      identityProof: "blob:https://admin.unrealstudiozz.com/6f3487ef-b8f2-4dba-aa62-bfeb4e580371",
      educationalCertificate: "",
      offerLetter: "",
      medicalDocument: ""
    },
    createdAt: new Date("2026-05-20T10:00:09.089Z"),
    updatedAt: new Date("2026-05-27T11:15:29.800Z"),
    permissions: [
      "Finance:read", "Finance:write", "Finance:delete",
      "Attendance:read", "Attendance:write", "Attendance:delete",
      "Leaves:read", "Leaves:write", "Leaves:delete",
      "Dashboard:read", "Dashboard:write", "Dashboard:delete",
      "Tasks:read", "Tasks:write", "Tasks:delete",
      "Profile:read", "Profile:write", "Profile:delete",
      "Chat:read", "Chat:write", "Chat:delete",
      "Team:read", "Team:write", "Team:delete",
      "Documents:read", "Documents:write", "Documents:delete",
      "Notifications:read", "Notifications:write", "Notifications:delete",
      "Requests:read", "Requests:write", "Requests:delete",
      "Activities:read", "Activities:write", "Activities:delete"
    ]
  },
  {
    _id: "6a0d9cbcbc188d917eb392d2",
    name: "Suhani",
    email: "us.suhanijain@gmail.com",
    password: "$2b$10$nC0yKOFZg5YF2kFdDHVHKuMitlC00UHGgSS9cT85VjOdSbpN3.Tly",
    role: "employee",
    isTemp: false,
    status: "active",
    phone: "9877887578",
    course: "",
    address: "",
    tempExpiry: null,
    profileImage: null,
    department: "Marketing",
    designation: "Social Media Manager",
    dateOfJoining: new Date("2026-03-23T00:00:00.000Z"),
    reportingTo: "6a0c10c7d776bb12f4e24d3b",
    employeeType: "full_time",
    salaryStructure: {
      baseSalary: 20000,
      hra: 0,
      transport: 0,
      other: 0,
      taxDeduction: 0,
      pf: 0
    },
    documents: {
      identityProof: "blob:https://admin.unrealstudiozz.com/55b3ea24-3ace-493b-9786-1fdc48a76564",
      educationalCertificate: "",
      offerLetter: "blob:https://admin.unrealstudiozz.com/55a66430-661d-47cb-a38d-0b48d14512b4",
      medicalDocument: ""
    },
    createdAt: new Date("2026-05-20T11:36:28.839Z"),
    updatedAt: new Date("2026-05-27T11:15:23.464Z"),
    permissions: [
      "Finance:read", "Finance:write", "Finance:delete",
      "Attendance:read", "Attendance:write", "Attendance:delete",
      "Leaves:read", "Leaves:write", "Leaves:delete",
      "Dashboard:read", "Dashboard:write", "Dashboard:delete",
      "Tasks:read", "Tasks:write", "Tasks:delete",
      "Profile:read", "Profile:write", "Profile:delete",
      "Chat:read", "Chat:write", "Chat:delete",
      "Team:read", "Team:write", "Team:delete",
      "Documents:read", "Documents:write", "Documents:delete",
      "Notifications:read", "Notifications:write", "Notifications:delete",
      "Requests:read", "Requests:write", "Requests:delete",
      "Activities:read", "Activities:write", "Activities:delete"
    ]
  },
  {
    _id: "6a0d9e87bc188d917eb39334",
    name: "Gaurav",
    email: "us.gauravsharma@gmail.com",
    password: "$2b$10$.069Wa7exVbc7gzDDymq3uCL9qgO4cUfm9BlZ3Jt.Kq00alp1D.xC",
    role: "employee",
    isTemp: false,
    status: "active",
    phone: "9713848385",
    course: "",
    address: "",
    tempExpiry: null,
    profileImage: null,
    department: "",
    designation: "Video Editor",
    dateOfJoining: new Date("2025-08-01T00:00:00.000Z"),
    reportingTo: "6a0c10c7d776bb12f4e24d3b",
    employeeType: "part_time",
    salaryStructure: {
      baseSalary: 15000,
      hra: 0,
      transport: 0,
      other: 0,
      taxDeduction: 0,
      pf: 0
    },
    documents: {
      identityProof: "blob:https://admin.unrealstudiozz.com/5dcb903b-9c39-4074-a6d1-63cf03f4a595",
      educationalCertificate: "",
      offerLetter: "",
      medicalDocument: ""
    },
    createdAt: new Date("2026-05-20T11:44:07.200Z"),
    updatedAt: new Date("2026-05-27T11:15:18.450Z"),
    permissions: [
      "Finance:read", "Finance:write", "Finance:delete",
      "Attendance:read", "Attendance:write", "Attendance:delete",
      "Leaves:read", "Leaves:write", "Leaves:delete",
      "Dashboard:read", "Dashboard:write", "Dashboard:delete",
      "Tasks:read", "Tasks:write", "Tasks:delete",
      "Profile:read", "Profile:write", "Profile:delete",
      "Chat:read", "Chat:write", "Chat:delete",
      "Team:read", "Team:write", "Team:delete",
      "Documents:read", "Documents:write", "Documents:delete",
      "Notifications:read", "Notifications:write", "Notifications:delete",
      "Requests:read", "Requests:write", "Requests:delete",
      "Activities:read", "Activities:write", "Activities:delete"
    ]
  },
  {
    _id: "6a0ea7a17738151b6a5e10d0",
    name: "Rahul",
    email: "flawedrahul04@gmail.com",
    password: "$2b$10$y1NAwyETj2UfSSF4OK5bKOxPsrqqlWTuua0q07lKdF1yvEcQ6KoT2",
    role: "admin",
    isTemp: false,
    status: "active",
    phone: "6205397680",
    course: "",
    address: "",
    tempExpiry: null,
    profileImage: null,
    department: "HR",
    designation: "CEO",
    dateOfJoining: new Date("2026-05-21T00:00:00.000Z"),
    reportingTo: "6a0c10c7d776bb12f4e24d3b",
    employeeType: "full_time",
    salaryStructure: {
      baseSalary: 0,
      hra: 0,
      transport: 0,
      other: 0,
      taxDeduction: 0,
      pf: 0
    },
    documents: {
      identityProof: "blob:https://admin.unrealstudiozz.com/3a8765ef-5e72-488f-9b1f-ea2e58bb624f",
      educationalCertificate: "",
      offerLetter: "",
      medicalDocument: ""
    },
    createdAt: new Date("2026-05-21T06:35:13.599Z"),
    updatedAt: new Date("2026-05-27T11:14:06.590Z"),
    permissions: [
      "Attendance:read", "Attendance:write", "Attendance:delete",
      "Leaves:read", "Leaves:write", "Leaves:delete",
      "Finance:read", "Finance:write", "Finance:delete",
      "Staff:read", "Staff:write", "Staff:delete",
      "Leads:read", "Leads:write", "Leads:delete",
      "Colleges:read", "Colleges:write", "Colleges:delete",
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
  },
  {
    _id: "6a141d363540883dbd833813",
    name: "Arshpreet",
    email: "us.arshpreetkaur@gmail.com",
    password: "$2b$10$UL/0RLU9myb3zUP4LrVdeeaYRsXMGgUf7MvMS/4z0uosgxIAEUNhC",
    role: "employee",
    isTemp: false,
    status: "active",
    phone: "9878424748",
    course: "",
    address: "",
    tempExpiry: null,
    profileImage: null,
    department: "Design",
    designation: "Graphic Designer",
    dateOfJoining: new Date("2026-03-25T00:00:00.000Z"),
    reportingTo: "6a0c10c7d776bb12f4e24d3b",
    employeeType: "full_time",
    salaryStructure: {
      baseSalary: 6000,
      hra: 0,
      transport: 0,
      other: 0,
      taxDeduction: 0,
      pf: 0
    },
    documents: {
      identityProof: "blob:https://admin.unrealstudiozz.com/9809c864-90e2-44d4-857e-bd420037bf82",
      educationalCertificate: "",
      offerLetter: "blob:https://admin.unrealstudiozz.com/9b80de11-2d7e-4004-b0cf-edf55eb9f848",
      medicalDocument: ""
    },
    createdAt: new Date("2026-05-25T09:58:14.155Z"),
    updatedAt: new Date("2026-05-27T11:15:05.599Z"),
    permissions: [
      "Leaves:read", "Leaves:write", "Leaves:delete",
      "Attendance:read", "Attendance:write", "Attendance:delete",
      "Finance:read", "Finance:write", "Finance:delete",
      "Dashboard:read", "Dashboard:write", "Dashboard:delete",
      "Tasks:read", "Tasks:write", "Tasks:delete",
      "Profile:read", "Profile:write", "Profile:delete",
      "Chat:read", "Chat:write", "Chat:delete",
      "Team:read", "Team:write", "Team:delete",
      "Documents:read", "Documents:write", "Documents:delete",
      "Notifications:read", "Notifications:write", "Notifications:delete",
      "Requests:read", "Requests:write", "Requests:delete",
      "Activities:read", "Activities:write", "Activities:delete"
    ]
  },
  {
    _id: "6a1420c03540883dbd833851",
    name: "Sahil",
    email: "us.sahilsingheditor@gmail.com",
    password: "$2b$10$Wvp2pFr94MCy/y0TOkYPk.Z9k25grcmajEOoq3/vz8AHmRIFO0wN2",
    role: "employee",
    isTemp: false,
    status: "active",
    phone: "8630389190",
    course: "",
    address: "",
    tempExpiry: null,
    profileImage: null,
    department: "Marketing",
    designation: "Video Editor",
    dateOfJoining: new Date("2026-05-25T00:00:00.000Z"),
    reportingTo: "6a0c10c7d776bb12f4e24d3b",
    employeeType: "full_time",
    salaryStructure: {
      baseSalary: 33000,
      hra: 0,
      transport: 0,
      other: 0,
      taxDeduction: 0,
      pf: 0
    },
    documents: {
      identityProof: "blob:https://admin.unrealstudiozz.com/def6e8c4-df26-4b1b-a8ee-4c1dce5dedf2",
      educationalCertificate: "",
      offerLetter: "",
      medicalDocument: ""
    },
    createdAt: new Date("2026-05-25T10:13:20.877Z"),
    updatedAt: new Date("2026-05-28T07:43:33.435Z"),
    permissions: [
      "Leaves:read", "Leaves:write", "Leaves:delete",
      "Attendance:read", "Attendance:write", "Attendance:delete",
      "Finance:read", "Finance:write", "Finance:delete",
      "Dashboard:read", "Dashboard:write", "Dashboard:delete",
      "Tasks:read", "Tasks:write", "Tasks:delete",
      "Profile:read", "Profile:write", "Profile:delete",
      "Chat:read", "Chat:write", "Chat:delete",
      "Team:read", "Team:write", "Team:delete",
      "Documents:read", "Documents:write", "Documents:delete",
      "Notifications:read", "Notifications:write", "Notifications:delete",
      "Requests:read", "Requests:write", "Requests:delete",
      "Activities:read", "Activities:write", "Activities:delete"
    ]
  },
  {
    _id: "6a16c4971d699f7da72771b4",
    name: "Poras gulati",
    email: "us.porasgulati@gmail.com",
    password: "$2b$10$IrOszFZwrDNOuTJqFiLTNeUPzcQUWd.AC7fuUBpP.bsUxJH8dHQRC",
    role: "employee",
    isTemp: false,
    status: "active",
    phone: "8168819675",
    course: "",
    address: "",
    tempExpiry: null,
    profileImage: null,
    department: "Sales",
    designation: "Sales Associate",
    dateOfJoining: new Date("2025-12-10T00:00:00.000Z"),
    reportingTo: null,
    employeeType: "contract",
    salaryStructure: {
      baseSalary: 0,
      hra: 0,
      transport: 0,
      other: 0,
      taxDeduction: 0,
      pf: 0
    },
    documents: {
      identityProof: "blob:https://admin.unrealstudiozz.com/515fbe31-b9c1-463c-815a-ee398023bed5",
      educationalCertificate: "",
      offerLetter: "",
      medicalDocument: ""
    },
    moduleVisibility: [],
    permissions: [
      "Leads:read", "Leads:write", "Leads:delete",
      "Attendance:read", "Attendance:write", "Attendance:delete",
      "Colleges:read", "Colleges:write", "Colleges:delete",
      "Dashboard:read", "Dashboard:write", "Dashboard:delete",
      "Tasks:read", "Tasks:write", "Tasks:delete",
      "Profile:read", "Profile:write", "Profile:delete",
      "Chat:read", "Chat:write", "Chat:delete",
      "Team:read", "Team:write", "Team:delete",
      "Documents:read", "Documents:write", "Documents:delete",
      "Notifications:read", "Notifications:write", "Notifications:delete",
      "Requests:read", "Requests:write", "Requests:delete",
      "Activities:read", "Activities:write", "Activities:delete"
    ],
    createdAt: new Date("2026-05-27T10:16:55.980Z"),
    updatedAt: new Date("2026-06-02T11:34:44.979Z")
  }
];

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

    // Drop unique index to avoid duplication error on brandLead nulls
    try {
      await User.collection.dropIndex("brandLead_1");
      console.log("Dropped brandLead_1 unique index successfully.");
    } catch (e) {
      console.log("Unique index brandLead_1 not found or already dropped:", e.message);
    }

    for (const data of staffData) {
      const id = data._id;
      const copy = { ...data };
      delete copy._id;

      // Upsert by ID to preserve matching Mongo ObjectIds
      await User.findByIdAndUpdate(
        id,
        { $set: copy },
        { upsert: true, new: true, runValidators: false }
      );
      console.log(`Seeded user: ${copy.name} (${copy.email})`);
    }

    console.log("Seeding staff completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
