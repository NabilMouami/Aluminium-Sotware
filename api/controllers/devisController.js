// controllers/devisController.js
const { Op } = require("sequelize");
const sequelize = require("../config/db");
const { Devis, DevisProduit, Client, Produit } = require("../models");

// Generate unique quote number
const generateNumeroDevis = async () => {
  const prefix = "DEV";

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

// Get all quotes
const getAllDevis = async (req, res) => {
  try {
    const { startDate, endDate, status, clientId } = req.query;

    const whereClause = {};

    // Filter by creation date
    if (startDate && endDate) {
      whereClause.date_creation = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    // Filter by status
    if (status && status !== "all") {
      whereClause.status = status;
    }

    // Filter by client
    if (clientId && clientId !== "all") {
      whereClause.client_id = clientId;
    }

    const devisList = await Devis.findAll({
      where: whereClause,
      include: [
        {
          model: Client,
          as: "client",
          attributes: ["id", "nom_complete", "telephone", "address", "ville"],
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
              "description",
              "unite",
            ],
          },
          attributes: ["id", "reference", "designation"],
        },
      ],
      order: [["date_creation", "DESC"]],
    });

    res.json({
      success: true,
      devis: devisList,
      totalCount: devisList.length,
    });
  } catch (error) {
    console.error("Erreur récupération devis:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des devis",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get specific quote by ID
const getDevisById = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await Devis.findByPk(id, {
      include: [
        {
          model: Client,
          as: "client",
          attributes: ["id", "nom_complete", "telephone", "address", "ville"],
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
              "description",
              "unite",
            ],
          },
          attributes: ["id", "reference", "designation", "qty", "prix_achat"],
        },
      ],
    });

    if (!devis) {
      return res.status(404).json({
        success: false,
        message: "Devis non trouvé",
      });
    }

    res.json({
      success: true,
      devis: devis,
    });
  } catch (error) {
    console.error("Erreur récupération devis:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du devis",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Create new quote
const createDevis = async (req, res) => {
  let transaction;

  try {
    const {
      client_id,
      produits,
      mode_reglement,
      remise = 0,
      notes = "",
      conditions_reglement,
      objet,
      conditions_generales,
      date_creation,
    } = req.body;

    console.log("Devis Items:" + JSON.stringify(req.body));

    // Validation
    if (!client_id) {
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

    // Generate quote number
    const num_devis = await generateNumeroDevis();

    // Calculate totals
    let montant_ht = 0;

    // Verify all products and calculate totals
    const produitsVerifies = [];
    for (const item of produits) {
      const produit = await Produit.findByPk(item.produit_id, { transaction });

      if (!produit) {
        throw new Error(`Produit ${item.produit_id} non trouvé`);
      }

      const prix_unitaire = item.prix_unitaire || produit.prix_vente;
      const remise_ligne = item.remise_ligne || 0;
      const total_ligne = prix_unitaire * item.quantite - remise_ligne;

      montant_ht += total_ligne;

      // Store verified product data
      produitsVerifies.push({
        produit,
        item,
        prix_unitaire,
        remise_ligne,
        total_ligne,
      });
    }

    // Apply global discount
    const remiseValue = parseFloat(remise) || 0;
    montant_ht -= remiseValue;

    const montant_ttc = montant_ht;

    // Create the quote
    const devis = await Devis.create(
      {
        num_devis,
        client_id,
        mode_reglement: mode_reglement || "espèces",
        remise: remiseValue,
        montant_ht,
        montant_ttc,
        notes,
        conditions_reglement,
        objet,
        conditions_generales,
        date_creation: date_creation ? new Date(date_creation) : new Date(),
        status: "brouillon",
      },
      { transaction },
    );

    // Add products
    for (const produitVerifie of produitsVerifies) {
      const { produit, item, prix_unitaire, remise_ligne, total_ligne } =
        produitVerifie;

      // Create association
      await DevisProduit.create(
        {
          devis_id: devis.id,
          produit_id: item.produit_id,
          quantite: item.quantite,
          prix_unitaire,
          remise_ligne,
          total_ligne,
          description: item.description || null,
          unite: item.unite || "unité",
        },
        { transaction },
      );
    }

    // Commit transaction
    await transaction.commit();

    // Retrieve created quote with relations
    const createdDevis = await Devis.findByPk(devis.id, {
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
              "description",
              "unite",
            ],
          },
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Devis créé avec succès",
      devis: createdDevis,
    });
  } catch (error) {
    // Rollback transaction if it exists and hasn't been committed
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur création devis:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Erreur lors de la création du devis",
    });
  }
};

// Update a quote
const updateDevis = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      produits,
      mode_reglement,
      remise,
      notes,
      conditions_reglement,
      objet,
      conditions_generales,
      status,
    } = req.body;

    const devis = await Devis.findByPk(id, { transaction });

    if (!devis) {
      return res.status(404).json({
        success: false,
        message: "Devis non trouvé",
      });
    }

    // Check if quote can be modified
    if (
      devis.status === "accepté" ||
      devis.status === "transformé_en_commande"
    ) {
      throw new Error(`Impossible de modifier un devis ${devis.status}`);
    }

    // If products are provided, recalculate
    if (produits && produits.length > 0) {
      // Delete old associations
      await DevisProduit.destroy({
        where: { devis_id: id },
        transaction,
      });

      // Calculate totals with new products
      let montant_ht = 0;

      for (const item of produits) {
        const produit = await Produit.findByPk(item.produit_id, {
          transaction,
        });

        if (!produit) {
          throw new Error(`Produit ${item.produit_id} non trouvé`);
        }

        const prix_unitaire = item.prix_unitaire || produit.prix_vente;
        const remise_ligne = item.remise_ligne || 0;
        const total_ligne = prix_unitaire * item.quantite - remise_ligne;

        montant_ht += total_ligne;

        // Create new association
        await DevisProduit.create(
          {
            devis_id: id,
            produit_id: item.produit_id,
            quantite: item.quantite,
            prix_unitaire,
            remise_ligne,
            total_ligne,
            description: item.description || null,
            unite: item.unite || "unité",
          },
          { transaction },
        );
      }

      // Apply discount
      montant_ht -= remise !== undefined ? remise : devis.remise;

      const montant_ttc = montant_ht;

      // Update totals
      devis.montant_ht = montant_ht;
      devis.montant_ttc = montant_ttc;
    }

    // Update other fields
    if (mode_reglement) devis.mode_reglement = mode_reglement;
    if (remise !== undefined) devis.remise = remise;
    if (notes !== undefined) devis.notes = notes;
    if (conditions_reglement !== undefined)
      devis.conditions_reglement = conditions_reglement;
    if (objet !== undefined) devis.objet = objet;
    if (conditions_generales !== undefined)
      devis.conditions_generales = conditions_generales;
    if (status) devis.status = status;

    await devis.save({ transaction });
    await transaction.commit();

    const updatedDevis = await Devis.findByPk(id, {
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
              "description",
              "unite",
            ],
          },
        },
      ],
    });

    res.json({
      success: true,
      message: "Devis mis à jour avec succès",
      devis: updatedDevis,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erreur mise à jour devis:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Erreur lors de la mise à jour du devis",
    });
  }
};

// Change quote status
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatus = [
      "brouillon",
      "envoyé",
      "accepté",
      "refusé",
      "expiré",
      "transformé_en_commande",
      "en_attente",
    ];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Statut invalide",
      });
    }

    const devis = await Devis.findByPk(id);

    if (!devis) {
      return res.status(404).json({
        success: false,
        message: "Devis non trouvé",
      });
    }

    // Update status
    devis.status = status;

    // If accepted, set acceptance date
    if (status === "accepté") {
      devis.date_acceptation = new Date();
    }

    await devis.save();

    res.json({
      success: true,
      message: `Statut mis à jour: ${status}`,
      devis: devis,
    });
  } catch (error) {
    console.error("Erreur changement statut:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Erreur lors du changement de statut",
    });
  }
};

// Delete a quote
const deleteDevis = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const devis = await Devis.findByPk(id, { transaction });

    if (!devis) {
      return res.status(404).json({
        success: false,
        message: "Devis non trouvé",
      });
    }

    // Check if quote can be deleted
    if (
      devis.status === "accepté" ||
      devis.status === "transformé_en_commande"
    ) {
      throw new Error(`Impossible de supprimer un devis ${devis.status}`);
    }

    // Delete associations
    await DevisProduit.destroy({
      where: { devis_id: id },
      transaction,
    });

    // Delete the quote
    await devis.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Devis supprimé avec succès",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erreur suppression devis:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Erreur lors de la suppression du devis",
    });
  }
};

// Get statistics
const getStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = {};

    if (startDate && endDate) {
      whereClause.date_creation = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const stats = await Devis.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "total"],
        [sequelize.fn("SUM", sequelize.col("montant_ttc")), "total_montant"],
        [sequelize.fn("SUM", sequelize.col("remise")), "total_remise"],
      ],
      raw: true,
    });

    // Statistics by status
    const statsByStatus = await Devis.findAll({
      where: whereClause,
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("SUM", sequelize.col("montant_ttc")), "total_montant"],
      ],
      group: ["status"],
      raw: true,
    });

    // Accepted quotes statistics
    const acceptedStats = await Devis.findAll({
      where: {
        ...whereClause,
        status: "accepté",
      },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("SUM", sequelize.col("montant_ttc")), "total_montant"],
      ],
      raw: true,
    });

    res.json({
      success: true,
      stats: stats[0],
      statsByStatus,
      acceptedStats: acceptedStats[0],
    });
  } catch (error) {
    console.error("Erreur statistiques:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du calcul des statistiques",
    });
  }
};

// Convert quote to delivery note
const convertToBonLivraison = async (req, res) => {
  let transaction;

  try {
    const { id } = req.params;
    const { mode_reglement, notes, date_livraison } = req.body;

    // Get the quote
    const devis = await Devis.findByPk(id, {
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
      ],
      transaction,
    });

    if (!devis) {
      return res.status(404).json({
        success: false,
        message: "Devis non trouvé",
      });
    }

    // Check if quote is accepted
    if (devis.status !== "accepté") {
      return res.status(400).json({
        success: false,
        message:
          "Seuls les devis acceptés peuvent être transformés en bon de livraison",
      });
    }

    // Start transaction
    transaction = await sequelize.transaction();

    // Import the BonLivraison model (you might need to adjust this)
    const BonLivraison = require("../models/BonLivraison");
    const BonLivraisonProduit = require("../models/BonLivraisonProduit");

    // Generate delivery note number
    const generateNumeroBL = async () => {
      const prefix = "BL";
      const lastBon = await BonLivraison.findOne({
        where: {
          num_bon_livraison: {
            [Op.like]: `${prefix}%`,
          },
        },
        order: [["createdAt", "DESC"]],
        transaction,
      });

      let sequence = 1;
      if (lastBon) {
        const lastNum = lastBon.num_bon_livraison;
        const lastSeq = parseInt(lastNum.slice(-4)) || 0;
        sequence = lastSeq + 1;
      }

      return `${prefix}${sequence.toString().padStart(4, "0")}`;
    };

    const num_bon_livraison = await generateNumeroBL();

    // Check product stock
    for (const produit of devis.produits) {
      const productDevis = produit.DevisProduit;
      const stockProduct = await Produit.findByPk(produit.id, { transaction });

      if (stockProduct.qty < productDevis.quantite) {
        throw new Error(
          `Stock insuffisant pour ${stockProduct.designation}. Stock disponible: ${stockProduct.qty}`,
        );
      }
    }

    // Create delivery note
    const bonLivraison = await BonLivraison.create(
      {
        num_bon_livraison,
        clientId: devis.client_id,
        devis_id: devis.id, // Link to original quote
        mode_reglement: mode_reglement || devis.mode_reglement || "espèces",
        remise: devis.remise,
        montant_ht: devis.montant_ht,
        montant_ttc: devis.montant_ttc,
        notes: notes || devis.notes,
        date_livraison: date_livraison ? new Date(date_livraison) : null,
        date_creation: new Date(),
        statut: "brouillon",
      },
      { transaction },
    );

    // Add products and update stock
    for (const produit of devis.produits) {
      const productDevis = produit.DevisProduit;
      const stockProduct = await Produit.findByPk(produit.id, { transaction });

      // Create association
      await BonLivraisonProduit.create(
        {
          bonLivraisonId: bonLivraison.id,
          produitId: produit.id,
          quantite: productDevis.quantite,
          prix_unitaire: productDevis.prix_unitaire,
          remise_ligne: productDevis.remise_ligne,
          total_ligne: productDevis.total_ligne,
        },
        { transaction },
      );

      // Decrease product quantity
      stockProduct.qty -= productDevis.quantite;
      await stockProduct.save({ transaction });
    }

    // Update quote status
    devis.status = "transformé_en_commande";
    await devis.save({ transaction });

    // Commit transaction
    await transaction.commit();

    // Get created delivery note
    const createdBL = await BonLivraison.findByPk(bonLivraison.id, {
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
      ],
    });

    res.status(201).json({
      success: true,
      message: "Devis transformé en bon de livraison avec succès",
      bonLivraison: createdBL,
      devis: devis,
    });
  } catch (error) {
    // Rollback transaction
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur conversion devis:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Erreur lors de la conversion du devis",
    });
  }
};

module.exports = {
  getAllDevis,
  getDevisById,
  createDevis,
  updateDevis,
  updateStatus,
  deleteDevis,
  getStats,
  convertToBonLivraison,
};
