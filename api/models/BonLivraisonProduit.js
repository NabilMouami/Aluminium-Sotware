// models/BonLivraisonProduit.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BonLivraisonProduit = sequelize.define(
  "BonLivraisonProduit",
  {
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    prix_unitaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    remise_ligne: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    total_ligne: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: "bon_livraison_produits",
  }
);

module.exports = BonLivraisonProduit;
