const express = require("express");
const { protect } = require("../../middleware/authMiddleware");
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} = require("../../controller/ClientOperations/clientOperationsController");

const router = express.Router();

// All client operations endpoints are protected
router.use(protect);

router.get("/", getClients);
router.post("/", createClient);
router.get("/:id", getClientById);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);

module.exports = router;
