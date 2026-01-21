const { Client } = require("../models");

// Create a new client
const createClient = async (req, res) => {
  try {
    const { nom_complete, reference, ville, address, telephone } = req.body;

    // Validation
    if (!nom_complete || !telephone) {
      return res.status(400).json({
        message: "Nom complet and telephone are required",
      });
    }

    // Check if telephone already exists
    const existingClient = await Client.findOne({ where: { telephone } });
    if (existingClient) {
      return res.status(409).json({
        message: "Telephone number already in use",
      });
    }

    // Create client
    const client = await Client.create({
      nom_complete,
      reference,
      ville,
      address,
      telephone,
    });

    return res.status(201).json({
      message: "Client created successfully",
      client: {
        id: client.id,
        nom_complete: client.nom_complete,
        reference: client.reference,
        ville: client.ville,
        address: client.address,
        telephone: client.telephone,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);

    // Handle Sequelize validation errors
    if (err.name === "SequelizeValidationError") {
      const errors = err.errors.map((error) => ({
        field: error.path,
        message: error.message,
      }));
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// Get all clients
const getAllClients = async (req, res) => {
  try {
    const { search } = req.query;

    // Build where clause for search
    const whereCondition = {};
    if (search) {
      whereCondition.nom_complete = {
        [Op.like]: `%${search}%`,
      };
    }

    // Get all clients without pagination
    const clients = await Client.findAll({
      where: whereCondition,
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      message: "Clients retrieved successfully",
      clients,
      count: clients.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// Get client by ID
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    return res.json({
      message: "Client retrieved successfully",
      client,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// Update client
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom_complete, reference, ville, address, telephone } = req.body;

    // Check if client exists
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    // Check if telephone is being changed and if it's already in use
    if (telephone && telephone !== client.telephone) {
      const existingClient = await Client.findOne({ where: { telephone } });
      if (existingClient && existingClient.id !== parseInt(id)) {
        return res.status(409).json({
          message: "Telephone number already in use",
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (nom_complete) updateData.nom_complete = nom_complete;
    if (reference) updateData.reference = reference;
    if (ville !== undefined) updateData.ville = ville;
    if (address !== undefined) updateData.address = address;
    if (telephone) updateData.telephone = telephone;

    // Update client
    await client.update(updateData);

    // Refresh to get updated data
    await client.reload();

    return res.json({
      message: "Client updated successfully",
      client,
    });
  } catch (err) {
    console.error(err);

    // Handle Sequelize validation errors
    if (err.name === "SequelizeValidationError") {
      const errors = err.errors.map((error) => ({
        field: error.path,
        message: error.message,
      }));
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// Delete client
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    // Delete client
    await client.destroy();

    return res.json({
      message: "Client deleted successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// Search clients (by name or telephone)
const searchClients = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const clients = await Client.findAll({
      where: {
        [Op.or]: [
          {
            nom_complete: {
              [Op.like]: `%${q}%`,
            },
          },
          {
            telephone: {
              [Op.like]: `%${q}%`,
            },
          },
        ],
      },
      order: [["nom_complete", "ASC"]],
      limit: 50,
    });

    return res.json({
      message: "Search results",
      clients,
      count: clients.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// Get client statistics
const getClientStats = async (req, res) => {
  try {
    // Count total clients
    const totalClients = await Client.count();

    // Count clients by city (if ville field is populated)
    const clientsByCity = await Client.findAll({
      attributes: [
        "ville",
        [sequelize.fn("COUNT", sequelize.col("ville")), "count"],
      ],
      group: ["ville"],
      order: [[sequelize.fn("COUNT", sequelize.col("ville")), "DESC"]],
      limit: 10,
    });

    // Count clients created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newClientsThisMonth = await Client.count({
      where: {
        createdAt: {
          [Op.gte]: startOfMonth,
        },
      },
    });

    return res.json({
      message: "Client statistics",
      statistics: {
        totalClients,
        newClientsThisMonth,
        clientsByCity,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  searchClients,
  getClientStats,
};
