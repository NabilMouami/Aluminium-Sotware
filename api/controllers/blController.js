// controllers/blController.js
const { Op } = require("sequelize");
const sequelize = require("../config/db");
const BonLivraison = require("../models/BonLivraison");
const Produit = require("../models/Produit");
const Advancement = require("../models/Advancement");

const { Client } = require("../models");

const BonLivraisonProduit = require("../models/BonLivraisonProduit");

// Générer un numéro unique de bon de livraison
const generateNumeroBL = async () => {
  const prefix = "BL";

  // Trouver le dernier BL
  const lastBon = await BonLivraison.findOne({
    where: {
      num_bon_livraison: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [["createdAt", "DESC"]],
  });

  let sequence = 1;
  if (lastBon) {
    // Extraire seulement les 4 derniers chiffres
    const lastNum = lastBon.num_bon_livraison;
    const lastSeq = parseInt(lastNum.slice(-4)) || 0; // <-- ici slice(-4)
    sequence = lastSeq + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, "0")}`;
};

// Récupérer tous les bons de livraison
// Récupérer tous les bons de livraison
const getAllBons = async (req, res) => {
  try {
    const { startDate, endDate, status, clientId } = req.query;

    const whereClause = {};

    // Filtrer par date
    if (startDate && endDate) {
      whereClause.date_creation = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    // Filtrer par status
    if (status && status !== "all") {
      whereClause.status = status;
    }

    // Filtrer par client
    if (clientId && clientId !== "all") {
      whereClause.clientId = clientId;
    }

    const bons = await BonLivraison.findAll({
      where: whereClause,
      include: [
        {
          model: Client,
          as: "client",
          attributes: ["id", "nom_complete", "telephone", "address"],
        },
        {
          model: Produit,
          as: "produits",
          through: {
            attributes: [
              "quantite",
              "prix_unitaire",
              "remise_ligne",
              "total_ligne",
            ],
          },
          attributes: ["id", "reference", "designation"],
        },
        {
          model: Advancement, // Ajouter cette inclusion
          as: "advancements",
          attributes: [
            "id",
            "amount",
            "paymentDate",
            "paymentMethod",
            "reference",
            "notes",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
      order: [["date_creation", "DESC"]],
    });

    // Optionnel: Calculer le total des acomptes pour chaque bon
    const bonsWithTotals = bons.map((bon) => {
      const bonJSON = bon.toJSON();

      // Calculer le total des acomptes
      let totalAdvancements = 0;
      if (bonJSON.advancements && bonJSON.advancements.length > 0) {
        totalAdvancements = bonJSON.advancements.reduce((sum, advance) => {
          return sum + (parseFloat(advance.amount) || 0);
        }, 0);
      }

      // Calculer le montant restant
      const montantTTC = parseFloat(bonJSON.montant_ttc) || 0;
      const remainingAmount = montantTTC - totalAdvancements;

      // Ajouter les totaux calculés au bon
      return {
        ...bonJSON,
        totalAdvancements: totalAdvancements.toFixed(2),
        remainingAmount:
          remainingAmount > 0 ? remainingAmount.toFixed(2) : "0.00",
        isFullyPaid: remainingAmount <= 0,
      };
    });

    res.json({
      success: true,
      bons: bonsWithTotals,
      totalCount: bonsWithTotals.length,
    });
  } catch (error) {
    console.error("Erreur récupération bons:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des bons de livraison",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// Récupérer un bon de livraison spécifique
// controllers/blController.js
const getBonById = async (req, res) => {
  try {
    const { id } = req.params;

    const bon = await BonLivraison.findByPk(id, {
      include: [
        {
          model: Client,
          as: "client", // Add this line
          attributes: ["id", "nom_complete", "telephone", "address", "ville"],
        },
        {
          model: Produit,
          as: "produits", // Add this line
          through: {
            attributes: [
              "quantite",
              "prix_unitaire",
              "remise_ligne",
              "total_ligne",
            ],
          },
          attributes: ["id", "reference", "designation", "qty", "prix_achat"],
        },
        {
          model: Advancement,
          as: "advancements", // Add this line if you want to include advancements
          attributes: [
            "id",
            "amount",
            "paymentDate",
            "paymentMethod",
            "reference",
            "notes",
            "createdAt",
          ],
        },
      ],
    });

    if (!bon) {
      return res.status(404).json({
        success: false,
        message: "Bon de livraison non trouvé",
      });
    }

    // Optional: Calculate total advancements and remaining amount
    const bonJSON = bon.toJSON();
    let totalAdvancements = 0;
    if (bonJSON.advancements && bonJSON.advancements.length > 0) {
      totalAdvancements = bonJSON.advancements.reduce((sum, advance) => {
        return sum + (parseFloat(advance.amount) || 0);
      }, 0);
    }

    const montantTTC = parseFloat(bonJSON.montant_ttc) || 0;
    const remainingAmount = montantTTC - totalAdvancements;

    res.json({
      success: true,
      bon: {
        ...bonJSON,
        totalAdvancements: totalAdvancements.toFixed(2),
        remainingAmount:
          remainingAmount > 0 ? remainingAmount.toFixed(2) : "0.00",
        isFullyPaid: remainingAmount <= 0,
      },
    });
  } catch (error) {
    console.error("Erreur récupération bon:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du bon de livraison",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// Créer un nouveau bon de livraison
const createBon = async (req, res) => {
  let transaction;

  try {
    const {
      clientId,
      produits,
      mode_reglement,
      remise = 0,
      notes = "",
      date_livraison,
      advancements = [], // Array of advancements from request
    } = req.body;

    console.log("Bon Livr Items:" + JSON.stringify(req.body));

    // Validation
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client requis",
      });
    }

    if (!produits || produits.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Au moins un produit est requis",
      });
    }

    // Start transaction
    transaction = await sequelize.transaction();

    // Générer le numéro de bon
    const num_bon_livraison = await generateNumeroBL();

    // Calculer les totaux et vérifier le stock
    let montant_ht = 0;

    // Vérifier d'abord tous les produits et calculer les totaux
    const produitsVerifies = [];
    for (const item of produits) {
      const produit = await Produit.findByPk(item.produitId, { transaction });

      if (!produit) {
        throw new Error(`Produit ${item.produitId} non trouvé`);
      }

      if (produit.qty < item.quantite) {
        throw new Error(
          `Stock insuffisant pour ${produit.designation}. Stock disponible: ${produit.qty}`,
        );
      }

      const prix_unitaire = item.prix_unitaire || produit.prix_vente;
      const remise_ligne = item.remise_ligne || 0;
      const total_ligne = prix_unitaire * item.quantite - remise_ligne;

      montant_ht += total_ligne;

      // Stocker les données du produit vérifié
      produitsVerifies.push({
        produit,
        item,
        prix_unitaire,
        remise_ligne,
        total_ligne,
      });
    }

    // Appliquer la remise globale
    const remiseValue = parseFloat(remise) || 0;
    montant_ht -= remiseValue;

    const montant_ttc = montant_ht;

    // Créer le bon de livraison
    const bonLivraison = await BonLivraison.create(
      {
        num_bon_livraison,
        client_id: clientId,
        mode_reglement: mode_reglement || "espèces",
        remise: remiseValue,
        montant_ht,
        montant_ttc,
        notes,
        date_livraison: date_livraison ? new Date(date_livraison) : null,
        date_creation: new Date(),
        status: "brouillon",
      },
      { transaction },
    );

    // Ajouter les produits et mettre à jour le stock
    for (const produitVerifie of produitsVerifies) {
      const { produit, item, prix_unitaire, remise_ligne, total_ligne } =
        produitVerifie;

      // Créer l'association - FIXED: Use correct field names from your associations
      await BonLivraisonProduit.create(
        {
          bon_livraison_id: bonLivraison.id, // Changed from bonLivraisonId
          produit_id: item.produitId, // Changed from produitId
          quantite: item.quantite,
          prix_unitaire,
          remise_ligne,
          total_ligne,
        },
        { transaction },
      );

      // Diminuer la quantité du produit
      produit.qty -= item.quantite;
      await produit.save({ transaction });
    }
    // Create advancements if provided
    const createdAdvancements = [];
    let totalAdvancements = 0;

    if (advancements && advancements.length > 0) {
      // Validate advancements
      for (const advance of advancements) {
        if (!advance.amount || advance.amount <= 0) {
          throw new Error("Le montant d'acompte doit être positif");
        }
        if (!advance.paymentMethod) {
          throw new Error("Méthode de paiement requise pour les acomptes");
        }
      }

      // Create advancements
      for (const advance of advancements) {
        const newAdvancement = await Advancement.create(
          {
            amount: advance.amount,
            paymentDate: advance.paymentDate || new Date(),
            paymentMethod: advance.paymentMethod,
            reference: advance.reference || null,
            notes: advance.notes || null,
            bonLivraisonId: bonLivraison.id,
          },
          { transaction },
        );

        createdAdvancements.push(newAdvancement);
        totalAdvancements += parseFloat(advance.amount);
      }

      // Update bonLivraison status based on advancements
      let newStatus = "brouillon";
      if (totalAdvancements >= bonLivraison.montant_ttc) {
        newStatus = "payé";
      } else if (totalAdvancements > 0) {
        newStatus = "partiellement payé";
      }

      // Update status if changed
      if (newStatus !== bonLivraison.status) {
        bonLivraison.status = newStatus;
        await bonLivraison.save({ transaction });
      }
    }

    // Commit transaction
    await transaction.commit();

    // Récupérer le bon créé avec ses relations
    const createdBon = await BonLivraison.findByPk(bonLivraison.id, {
      include: [
        {
          model: Client,
          as: "client",
        },
        {
          model: Produit,
          as: "produits",
          through: {
            attributes: [
              "quantite",
              "prix_unitaire",
              "remise_ligne",
              "total_ligne",
            ],
          },
        },
        {
          model: Advancement,
          as: "advancements",
          attributes: [
            "id",
            "amount",
            "paymentDate",
            "paymentMethod",
            "reference",
            "notes",
            "createdAt",
          ],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Bon de livraison créé avec succès",
      bon: createdBon,
      totalAdvancements: totalAdvancements,
      advancements: createdAdvancements,
    });
  } catch (error) {
    // Rollback transaction only if it exists and hasn't been committed
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur création bon:", error);
    res.status(400).json({
      success: false,
      message:
        error.message || "Erreur lors de la création du bon de livraison",
    });
  }
};

// Mettre à jour un bon de livraison
// Update Bon de Livraison
const updateBon = async (req, res) => {
  let transaction;

  try {
    const { id } = req.params;
    const { produits, mode_reglement, remise, notes, date_livraison, status } =
      req.body;

    transaction = await sequelize.transaction();

    const bonLivraison = await BonLivraison.findByPk(id, { transaction });

    if (!bonLivraison) {
      throw new Error("Bon de livraison non trouvé");
    }

    if (["livré", "annulé"].includes(bonLivraison.status)) {
      throw new Error(`Impossible de modifier un bon ${bonLivraison.status}`);
    }

    if (Array.isArray(produits) && produits.length > 0) {
      const oldProduits = await BonLivraisonProduit.findAll({
        where: { bonLivraisonId: id },
        transaction,
      });

      // Restore stock from old products
      for (const oldItem of oldProduits) {
        const produit = await Produit.findByPk(oldItem.produitId, {
          transaction,
        });
        if (produit) {
          produit.qty += oldItem.quantite;
          await produit.save({ transaction });
        }
      }

      // Remove old products
      await BonLivraisonProduit.destroy({
        where: { bonLivraisonId: id },
        transaction,
      });

      let montant_ht = 0;

      // Add new products
      for (const item of produits) {
        const produit = await Produit.findByPk(item.produitId, { transaction });
        if (!produit) {
          throw new Error(`Produit ${item.produitId} non trouvé`);
        }

        if (produit.qty < item.quantite) {
          throw new Error(
            `Stock insuffisant pour ${produit.designation}. Stock disponible: ${produit.qty}`,
          );
        }

        const prix_unitaire = parseFloat(
          item.prix_unitaire || produit.prix_vente,
        );
        const quantite = parseFloat(item.quantite);
        const remise_ligne = parseFloat(item.remise_ligne || 0);

        const total_ligne = +(prix_unitaire * quantite - remise_ligne).toFixed(
          2,
        );

        montant_ht += total_ligne;

        await BonLivraisonProduit.create(
          {
            bonLivraisonId: id,
            produitId: item.produitId,
            quantite,
            prix_unitaire,
            remise_ligne,
            total_ligne,
          },
          { transaction },
        );

        // Decrease stock
        produit.qty -= quantite;
        await produit.save({ transaction });
      }

      // Calculate discounts
      const remiseValue =
        remise !== undefined
          ? parseFloat(remise)
          : parseFloat(bonLivraison.remise || 0);

      // Apply discount
      montant_ht = Math.max(montant_ht - remiseValue, 0);

      // Update bon amounts
      // If you want to add TVA later, you can add these fields:
      // const tva = 0; // Or get from bonLivraison.tva if it exists
      // const montant_tva = (montant_ht * tva) / 100;
      // const montant_ttc = montant_ht + montant_tva;

      // For now, without TVA:
      bonLivraison.montant_ht = montant_ht;
      bonLivraison.montant_ttc = montant_ht; // TTC = HT when no TVA
      bonLivraison.remise = remiseValue;
    }

    // Update other fields if provided
    if (mode_reglement !== undefined)
      bonLivraison.mode_reglement = mode_reglement;
    if (notes !== undefined) bonLivraison.notes = notes;
    if (date_livraison) bonLivraison.date_livraison = new Date(date_livraison);
    if (status) bonLivraison.status = status;

    console.log("Status Bon Livr:", status);

    await bonLivraison.save({ transaction });
    await transaction.commit();

    // Get updated bon with related data
    const updatedBon = await BonLivraison.findByPk(id, {
      include: [
        { model: Client, as: "client" },
        {
          model: Produit,
          as: "produits",
          through: {
            attributes: [
              "quantite",
              "prix_unitaire",
              "remise_ligne",
              "total_ligne",
            ],
          },
        },
      ],
    });

    return res.json({
      success: true,
      message: "Bon de livraison mis à jour avec succès",
      bon: updatedBon,
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();

    console.error("Erreur mise à jour bon:", error);
    return res.status(400).json({
      success: false,
      message:
        error.message || "Erreur lors de la mise à jour du bon de livraison",
    });
  }
};
// Changer le status d'un bon
const updateStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatus = ["brouillon", "validé", "livré", "annulé", "facturé"];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status invalide",
      });
    }

    const bonLivraison = await BonLivraison.findByPk(id, { transaction });

    if (!bonLivraison) {
      return res.status(404).json({
        success: false,
        message: "Bon de livraison non trouvé",
      });
    }

    // Si on annule le bon, restaurer le stock
    if (status === "annulé" && bonLivraison.status !== "annulé") {
      const produits = await BonLivraisonProduit.findAll({
        where: { bonLivraisonId: id },
        transaction,
      });

      for (const item of produits) {
        const produit = await Produit.findByPk(item.produitId, { transaction });
        produit.qty += item.quantite;
        await produit.save({ transaction });
      }
    }

    // Si on passe de annulé à un autre status, diminuer le stock
    if (bonLivraison.status === "annulé" && status !== "annulé") {
      const produits = await BonLivraisonProduit.findAll({
        where: { bonLivraisonId: id },
        transaction,
      });

      for (const item of produits) {
        const produit = await Produit.findByPk(item.produitId, { transaction });

        if (produit.qty < item.quantite) {
          throw new Error(
            `Stock insuffisant pour ${produit.designation}. Stock disponible: ${produit.qty}`,
          );
        }

        produit.qty -= item.quantite;
        await produit.save({ transaction });
      }
    }

    // Mettre à jour le status
    bonLivraison.status = status;

    // Si livré, mettre la date de livraison
    if (status === "livré" && !bonLivraison.date_livraison) {
      bonLivraison.date_livraison = new Date();
    }

    await bonLivraison.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: `status mis à jour: ${status}`,
      bon: bonLivraison,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erreur changement status:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Erreur lors du changement de status",
    });
  }
};

// Supprimer un bon de livraison
const deleteBon = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const bonLivraison = await BonLivraison.findByPk(id, { transaction });

    if (!bonLivraison) {
      return res.status(404).json({
        success: false,
        message: "Bon de livraison non trouvé",
      });
    }

    // Vérifier si le bon peut être supprimé
    if (bonLivraison.status === "livré" || bonLivraison.status === "facturé") {
      throw new Error(`Impossible de supprimer un bon ${bonLivraison.status}`);
    }

    // Restaurer le stock
    const produits = await BonLivraisonProduit.findAll({
      where: { bonLivraisonId: id },
      transaction,
    });

    for (const item of produits) {
      const produit = await Produit.findByPk(item.produitId, { transaction });
      produit.qty += item.quantite;
      await produit.save({ transaction });
    }

    // Supprimer les associations
    await BonLivraisonProduit.destroy({
      where: { bonLivraisonId: id },
      transaction,
    });

    // Supprimer le bon
    await bonLivraison.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Bon de livraison supprimé avec succès",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erreur suppression bon:", error);
    res.status(400).json({
      success: false,
      message:
        error.message || "Erreur lors de la suppression du bon de livraison",
    });
  }
};

// Obtenir les statistiques
const getStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = {};

    if (startDate && endDate) {
      whereClause.date_creation = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const stats = await BonLivraison.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "total"],
        [sequelize.fn("SUM", sequelize.col("montant_ttc")), "total_montant"],
        [sequelize.fn("SUM", sequelize.col("remise")), "total_remise"],
      ],
      raw: true,
    });

    // Statistiques par status
    const statsByStatus = await BonLivraison.findAll({
      where: whereClause,
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    res.json({
      success: true,
      stats: stats[0],
      statsByStatus,
    });
  } catch (error) {
    console.error("Erreur statistiques:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du calcul des statistiques",
    });
  }
};
// Récupérer les bons de livraison d'un client spécifique
const getBonsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "ID client requis",
      });
    }

    const bons = await BonLivraison.findAll({
      where: {
        client_id: clientId,
        // Optionnel: exclure les bons annulés si vous voulez
        // status: {
        //   [Op.not]: "annulée"
        // }
      },
      include: [
        {
          model: Client,
          as: "client",
          attributes: ["id", "nom_complete", "telephone"],
        },
        {
          model: Produit,
          as: "produits",
          through: {
            attributes: ["quantite"],
          },
          attributes: ["id", "reference", "designation"],
        },
        {
          model: Advancement,
          as: "advancements",
          attributes: ["amount"],
        },
      ],
      order: [["date_creation", "DESC"]],
    });

    // Calculer les totaux et statuts
    const bonsWithDetails = bons.map((bon) => {
      const bonJSON = bon.toJSON();

      // Calculer le total des acomptes
      let totalAdvancements = 0;
      if (bonJSON.advancements && bonJSON.advancements.length > 0) {
        totalAdvancements = bonJSON.advancements.reduce((sum, advance) => {
          return sum + (parseFloat(advance.amount) || 0);
        }, 0);
      }

      // Calculer le montant restant
      const montantTTC = parseFloat(bonJSON.montant_ttc) || 0;
      const remainingAmount = montantTTC - totalAdvancements;

      // Statut de paiement
      let paymentStatus = "non_payé";
      if (totalAdvancements >= montantTTC) {
        paymentStatus = "payé";
      } else if (totalAdvancements > 0) {
        paymentStatus = "partiellement_payé";
      }

      // Nombre de produits
      const productCount = bonJSON.produits?.length || 0;

      return {
        ...bonJSON,
        totalAdvancements: totalAdvancements.toFixed(2),
        remainingAmount:
          remainingAmount > 0 ? remainingAmount.toFixed(2) : "0.00",
        paymentStatus,
        productCount,
        isFullyPaid: remainingAmount <= 0,
      };
    });

    res.json({
      success: true,
      clientId,
      bons: bonsWithDetails,
      totalCount: bons.length,
    });
  } catch (error) {
    console.error("Erreur récupération bons client:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des bons de livraison du client",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
module.exports = {
  getAllBons,
  getBonById,
  createBon,
  updateBon,
  updateStatus,
  deleteBon,
  getStats,
  getBonsByClient,
};
