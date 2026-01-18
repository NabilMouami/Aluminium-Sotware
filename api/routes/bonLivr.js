// routes/bonLivr.js
const express = require("express");
const router = express.Router();

const {
  getAllBons,
  getStats,
  getBonById,
  createBon,
  updateBon,
  updateStatus,
  deleteBon,
} = require("../controllers/blController");

// const authMiddleware = require("../middleware/authMiddleware");

// // Appliquer l'authentification à toutes les routes
// router.use(authMiddleware);

// Routes pour les bons de livraison
router.get("/", getAllBons);
router.get("/stats", getStats);
router.get("/:id", getBonById);
router.post("/", createBon);
router.put("/:id", updateBon);
router.patch("/:id/status", updateStatus);
router.delete("/:id", deleteBon);

module.exports = router;
