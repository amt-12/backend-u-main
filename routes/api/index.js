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
const attendanceRoutes = require("./attendance.route");
const leaveRoutes = require("./leave.route");
const staffRoutes = require("./staff.route");
const trainersRoutes = require("./trainers.route");
const batchesRoutes = require("./batches.route");
const bookCallRoutes = require("./bookCall.route");
const anyApplyInternshipRoutes = require("./anyApplyInternship.route");
const brandLeadRoutes = require("./brandLeads.route");
const payrollRoutes = require('./payroll.route');
const menuRoutes = require('./menu.route');
const credentialRoutes = require("./credential.route");
const clientOperationsRoutes = require("./clientOperations.route");
const scheduledPostRoutes = require("./scheduledPost.route");
const brandWorkflowRoutes = require("./brandWorkflow.route");
const whatsAppRoutes = require("./whatsApp.route");
const performanceRoutes = require("./performance.route");
const developmentRoutes = require("./development.route");
const broadcastRoutes = require("./broadcast.route");

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
router.use("/attendance", attendanceRoutes);
router.use("/leave", leaveRoutes);
router.use("/staff", staffRoutes);
router.use("/trainers", trainersRoutes);
router.use("/batches", batchesRoutes);
router.use("/bookCall", bookCallRoutes);
router.use("/internship-any", anyApplyInternshipRoutes);
router.use("/brand-lead", brandLeadRoutes);
router.use('/payroll', payrollRoutes);
router.use("/credentials", credentialRoutes);
router.use("/client-operations", clientOperationsRoutes);
router.use("/scheduled-posts", scheduledPostRoutes);
router.use("/brand-workflow", brandWorkflowRoutes);
router.use("/whatsapp", whatsAppRoutes);
router.use("/performance", performanceRoutes);
router.use("/development", developmentRoutes);
router.use("/broadcast", broadcastRoutes);

router.use('/menu', menuRoutes);

module.exports = router;


