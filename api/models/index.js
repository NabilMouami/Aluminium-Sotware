// models/index.js
const sequelize = require("../config/db");
const Fornisseur = require("./fornisseur");
const Client = require("./client");
const Produit = require("./Produit");
const BonLivraison = require("./BonLivraison");
const BonLivraisonProduit = require("./BonLivraisonProduit");
const Advancement = require("./Advancement");
const Devis = require("./Devis");
const DevisProduit = require("./DevisProduit");
const Facture = require("./Facture");
const FactureProduit = require("./FactureProduit");

// Define relationships

// Fornisseur - Produit relationships
Fornisseur.hasMany(Produit, {
  foreignKey: "fornisseurId",
  as: "produits",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

Produit.belongsTo(Fornisseur, {
  foreignKey: "fornisseurId",
  as: "fornisseur",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Client - Devis relationships
Client.hasMany(Devis, {
  foreignKey: "client_id",
  as: "devis",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Devis.belongsTo(Client, {
  foreignKey: "client_id",
  as: "client",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Client - BonLivraison relationships
Client.hasMany(BonLivraison, {
  foreignKey: "clientId",
  as: "bonLivraisons",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

BonLivraison.belongsTo(Client, {
  foreignKey: "clientId",
  as: "client",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Client - Facture relationships
Client.hasMany(Facture, {
  foreignKey: "client_id",
  as: "factures",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Facture.belongsTo(Client, {
  foreignKey: "client_id",
  as: "client",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// BonLivraison - Advancement relationships
BonLivraison.hasMany(Advancement, {
  foreignKey: "bonLivraisonId",
  as: "advancements",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Advancement.belongsTo(BonLivraison, {
  foreignKey: "bonLivraisonId",
  as: "bonLivraison",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Facture - Advancement relationships
Facture.hasMany(Advancement, {
  foreignKey: "factureId",
  as: "advancements",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Advancement.belongsTo(Facture, {
  foreignKey: "factureId",
  as: "facture",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Devis - BonLivraison relationships
Devis.hasOne(BonLivraison, {
  foreignKey: "devis_id",
  as: "bon_livraison",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

BonLivraison.belongsTo(Devis, {
  foreignKey: "devis_id",
  as: "devis_origine",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// BonLivraison - Facture relationships
BonLivraison.hasOne(Facture, {
  foreignKey: "bon_livraison_id",
  as: "facture",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

Facture.belongsTo(BonLivraison, {
  foreignKey: "bon_livraison_id",
  as: "bon_livraison",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Many-to-Many relationship between Devis and Produit
Devis.belongsToMany(Produit, {
  through: DevisProduit,
  foreignKey: "devis_id",
  otherKey: "produit_id",
  as: "produits",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Produit.belongsToMany(Devis, {
  through: DevisProduit,
  foreignKey: "produit_id",
  otherKey: "devis_id",
  as: "devis",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Many-to-Many relationship between BonLivraison and Produit
BonLivraison.belongsToMany(Produit, {
  through: BonLivraisonProduit,
  foreignKey: "bonLivraisonId",
  otherKey: "produitId",
  as: "produits",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Produit.belongsToMany(BonLivraison, {
  through: BonLivraisonProduit,
  foreignKey: "produitId",
  otherKey: "bonLivraisonId",
  as: "bonLivraisons",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Many-to-Many relationship between Facture and Produit
Facture.belongsToMany(Produit, {
  through: FactureProduit,
  foreignKey: "factureId",
  otherKey: "produitId",
  as: "produits",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Produit.belongsToMany(Facture, {
  through: FactureProduit,
  foreignKey: "produitId",
  otherKey: "factureId",
  as: "factures",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Direct relationships for DevisProduit
DevisProduit.belongsTo(Devis, {
  foreignKey: "devis_id",
  as: "devis",
});

DevisProduit.belongsTo(Produit, {
  foreignKey: "produit_id",
  as: "produit",
});

Devis.hasMany(DevisProduit, {
  foreignKey: "devis_id",
  as: "lignes",
  onDelete: "CASCADE",
});

Produit.hasMany(DevisProduit, {
  foreignKey: "produit_id",
  as: "devisItems",
  onDelete: "CASCADE",
});

// Direct relationships for BonLivraisonProduit
BonLivraisonProduit.belongsTo(BonLivraison, {
  foreignKey: "bonLivraisonId",
  as: "bonLivraison",
});

BonLivraisonProduit.belongsTo(Produit, {
  foreignKey: "produitId",
  as: "produit",
});

BonLivraison.hasMany(BonLivraisonProduit, {
  foreignKey: "bonLivraisonId",
  as: "lignes",
  onDelete: "CASCADE",
});

Produit.hasMany(BonLivraisonProduit, {
  foreignKey: "produitId",
  as: "bonLivraisonItems",
  onDelete: "CASCADE",
});

// Direct relationships for FactureProduit
FactureProduit.belongsTo(Facture, {
  foreignKey: "factureId",
  as: "facture",
});

FactureProduit.belongsTo(Produit, {
  foreignKey: "produitId",
  as: "produit",
});

Facture.hasMany(FactureProduit, {
  foreignKey: "factureId",
  as: "lignes",
  onDelete: "CASCADE",
});

Produit.hasMany(FactureProduit, {
  foreignKey: "produitId",
  as: "factureItems",
  onDelete: "CASCADE",
});

const db = {
  sequelize: sequelize,
  User: require("./user"),
  Client: require("./client"),
  Fornisseur: require("./fornisseur"),
  Produit: require("./Produit"),
  BonLivraison: require("./BonLivraison"),
  BonLivraisonProduit: require("./BonLivraisonProduit"),
  Advancement: Advancement,
  Devis: Devis,
  DevisProduit: DevisProduit,
  Facture: Facture,
  FactureProduit: FactureProduit,
};

module.exports = db;
