const express = require("express");
const { protect } = require("../../middleware/authMiddleware");
const {
  getAllBrandLeads,
  getBrandLeadById,
  createBrandLead,
  updateBrandLead,
  deleteBrandLead,
  addFollowUp,
  getClientBrandLead,
  submitClientBrandLead,
  reOnboardBrandLead,
} = require("../../controller/BrandLead/brandLeadController");

const router = express.Router();

// Public routes for clients
router.get("/client/:id", getClientBrandLead);
router.put("/client/:id", submitClientBrandLead);

// All other brand lead routes are protected
router.use(protect);

router.get("/", getAllBrandLeads);
router.post("/", createBrandLead);
router.get("/:id", getBrandLeadById);
router.put("/:id", updateBrandLead);
router.delete("/:id", deleteBrandLead);
router.post("/:id/follow-up", addFollowUp);
router.post("/:id/re-onboard", reOnboardBrandLead);

module.exports = router;
