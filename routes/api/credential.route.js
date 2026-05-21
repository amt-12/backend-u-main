const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getAllCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
  revealPassword,
} = require("../../controller/Credential/credentialController");

// Credentials management routes (all protected for authenticated users)
router.get("/", protect, getAllCredentials);
router.post("/", protect, createCredential);
router.get("/:id/reveal/:accountId", protect, revealPassword);
router.put("/:id", protect, updateCredential);
router.delete("/:id", protect, deleteCredential);

module.exports = router;
