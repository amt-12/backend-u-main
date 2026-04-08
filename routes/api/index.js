const express = require("express");

const authRoutes = require("./Auth.route");
const studentsRoutes = require("./Students.route");
const courseRoutes = require("./courses.route");
const subjectRoutes = require("./subjects.route");
const demoClassRoutes = require("./DemoClass.route");
const notificationsRoutes = require("./notifications.route");
const studyMaterialsRoutes = require("./studyMaterials.route");
const testRoutes = require("./test.route");

const liveClassRoutes = require("./liveClasses.route");
const collegeRoutes = require("./colleges.route");
const internshipRoutes = require("./Internship.route");
const studentRoutesSingular = require("./student.route");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/test", testRoutes);
router.use("/study-materials", studyMaterialsRoutes);
router.use("/students", studentsRoutes);
router.use("/student", studentRoutesSingular);
router.use("/courses", courseRoutes);
router.use("/subjects", subjectRoutes);
router.use("/college", collegeRoutes);
router.use("/live-classes", liveClassRoutes);
router.use("/demo-classes", demoClassRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/internship", internshipRoutes);

module.exports = router;
