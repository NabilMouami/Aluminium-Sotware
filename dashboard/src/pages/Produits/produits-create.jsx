import React, { useState, useEffect } from "react";
import {
  FiSave,
  FiPackage,
  FiHash,
  FiTag,
  FiBarChart2,
  FiDollarSign,
  FiUser,
} from "react-icons/fi";
import topTost from "@/utils/topTost";
import axios from "axios";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const MySwal = withReactContent(Swal);

function ProduitsCreate() {
  // Form state
  const [reference, setReference] = useState("");
  const [designation, setDesignation] = useState("");
  const [observation, setObservation] = useState("");
  const [qty, setQty] = useState(0);
  const [prixAchat, setPrixAchat] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [fornisseurId, setFornisseurId] = useState("");

  // Additional state
  const [fornisseurs, setFornisseurs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingFornisseurs, setLoadingFornisseurs] = useState(true);
  const [calculations, setCalculations] = useState({
    marge: 0,
    margePourcentage: 0,
  });

  // Fetch fornisseurs on component mount
  useEffect(() => {
    fetchFornisseurs();
  }, []);

  // Calculate margin when prices change
  useEffect(() => {
    if (prixAchat && prixVente) {
      const achat = parseFloat(prixAchat);
      const vente = parseFloat(prixVente);
      const marge = vente - achat;
      const margePourcentage = achat > 0 ? (marge / achat) * 100 : 0;

      setCalculations({
        marge: marge.toFixed(2),
        margePourcentage: margePourcentage.toFixed(2),
      });
    }
  }, [prixAchat, prixVente]);

  const fetchFornisseurs = async () => {
    try {
      setLoadingFornisseurs(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/fornisseurs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setFornisseurs(response.data?.fornisseurs || []);
    } catch (error) {
      console.error("Error fetching fornisseurs:", error);
      topTost("Erreur lors du chargement des fournisseurs", "error");
    } finally {
      setLoadingFornisseurs(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!reference || !designation || !prixAchat || !prixVente) {
        throw new Error("Veuillez remplir tous les champs obligatoires");
      }

      const achat = parseFloat(prixAchat);
      const vente = parseFloat(prixVente);

      if (vente <= achat) {
        throw new Error("Le prix de vente doit être supérieur au prix d'achat");
      }

      const produitData = {
        reference,
        designation,
        observation,
        qty: parseInt(qty) || 0,
        prix_achat: achat,
        prix_vente: vente,
        fornisseurId: fornisseurId || null,
      };

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const response = await axios.post(
        `${config_url}/api/produits`,
        produitData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      MySwal.fire({
        title: "Succès!",
        text: "Produit créé avec succès",
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        // Reset form
        setReference("");
        setDesignation("");
        setObservation("");
        setQty(0);
        setPrixAchat("");
        setPrixVente("");
        setFornisseurId("");
        setCalculations({ marge: 0, margePourcentage: 0 });
      });
    } catch (error) {
      console.error("Error creating produit:", error);

      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors
          .map((err) => err.message)
          .join(", ");
        topTost(errorMessages, "error");
      } else if (error.response?.data?.field === "reference") {
        topTost(
          "Cette référence est déjà utilisée par un autre produit",
          "error"
        );
      } else {
        topTost(
          error.response?.data?.message ||
            error.message ||
            "Erreur lors de la création du produit",
          "error"
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReferenceChange = (e) => {
    const value = e.target.value;
    // Allow alphanumeric and common separators
    const formattedValue = value.replace(/[^a-zA-Z0-9-_.]/g, "");
    setReference(formattedValue.toUpperCase()); // Auto uppercase for consistency
  };

  const handlePriceChange = (setter) => (e) => {
    const value = e.target.value;
    // Allow numbers and one decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const handleQtyChange = (e) => {
    const value = e.target.value;
    // Allow only positive integers
    if (value === "" || /^\d+$/.test(value)) {
      setQty(value === "" ? 0 : parseInt(value));
    }
  };

  // Find selected fornisseur
  const selectedFornisseur = fornisseurs.find((f) => f.id == fornisseurId);

  return (
    <>
      <div className="main-content">
        <div className="row">
          <form className="col-xl-9" onSubmit={handleSubmit}>
            <div className="card stretch stretch-full">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <FiPackage className="me-2" />
                  Nouveau Produit
                </h5>
              </div>
              <div className="card-body">
                {/* Reference and Designation */}
                <div className="row">
                  <div className="col-md-6 mb-4">
                    <label className="form-label">
                      <FiHash size={16} className="me-1" />
                      Référence <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: PROD-001, SKU-2024"
                      value={reference}
                      onChange={handleReferenceChange}
                      required
                      maxLength="100"
                    />
                    <small className="text-muted">
                      Doit être unique (max 100 caractères)
                    </small>
                  </div>

                  <div className="col-md-6 mb-4">
                    <label className="form-label">
                      <FiTag size={16} className="me-1" />
                      Quantité initiale
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={qty}
                      onChange={handleQtyChange}
                      min="0"
                      step="1"
                    />
                    <small className="text-muted">
                      Quantité en stock initiale
                    </small>
                  </div>
                </div>

                {/* Designation */}
                <div className="mb-4">
                  <label className="form-label">
                    <FiPackage size={16} className="me-1" />
                    Désignation <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    placeholder="Description détaillée du produit..."
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    rows="3"
                    required
                  />
                  <small className="text-muted">
                    Description complète du produit
                  </small>
                </div>

                {/* Prices */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">
                      <FiDollarSign size={16} className="me-1" />
                      Prix d'achat <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">DH</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="0.00"
                        value={prixAchat}
                        onChange={handlePriceChange(setPrixAchat)}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      <FiDollarSign size={16} className="me-1" />
                      Prix de vente <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">DH</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="0.00"
                        value={prixVente}
                        onChange={handlePriceChange(setPrixVente)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Margin calculation */}
                {prixAchat && prixVente && (
                  <div className="row mb-4">
                    <div className="col-md-12">
                      <div className="alert alert-light">
                        <div className="d-flex justify-content-between">
                          <div>
                            <strong>Marge unitaire:</strong>{" "}
                            {calculations.marge} DH
                          </div>
                          <div>
                            <strong>Marge:</strong>{" "}
                            {calculations.margePourcentage}%
                          </div>
                          <div>
                            <strong>Valeur stock:</strong>{" "}
                            {(qty * parseFloat(prixAchat)).toFixed(2)} DH
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fornisseur Selection */}
                <div className="mb-4">
                  <label className="form-label">
                    <FiUser size={16} className="me-1" />
                    Fournisseur (optionnel)
                  </label>
                  <select
                    className="form-select"
                    value={fornisseurId}
                    onChange={(e) => setFornisseurId(e.target.value)}
                  >
                    <option value="">Sélectionnez un fournisseur</option>
                    {loadingFornisseurs ? (
                      <option disabled>Chargement des fournisseurs...</option>
                    ) : (
                      fornisseurs.map((fornisseur) => (
                        <option key={fornisseur.id} value={fornisseur.id}>
                          {fornisseur.nom_complete}
                          {fornisseur.reference && ` (${fornisseur.reference})`}
                          {fornisseur.telephone && ` - ${fornisseur.telephone}`}
                        </option>
                      ))
                    )}
                  </select>
                  {selectedFornisseur && (
                    <div className="mt-2 p-2 bg-light rounded">
                      <small className="text-muted">
                        <strong>Fournisseur sélectionné:</strong>{" "}
                        {selectedFornisseur.nom_complete}
                        {selectedFornisseur.ville &&
                          ` - ${selectedFornisseur.ville}`}
                      </small>
                    </div>
                  )}
                </div>

                {/* Observation */}
                <div className="mb-4">
                  <label className="form-label">
                    <FiBarChart2 size={16} className="me-1" />
                    Observations (optionnel)
                  </label>
                  <textarea
                    className="form-control"
                    placeholder="Notes supplémentaires, spécifications techniques, etc."
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    rows="3"
                  />
                  <small className="text-muted">
                    Informations complémentaires sur le produit
                  </small>
                </div>

                {/* Form Actions */}
                <div className="d-flex justify-content-between mt-4">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setReference("");
                      setDesignation("");
                      setObservation("");
                      setQty(0);
                      setPrixAchat("");
                      setPrixVente("");
                      setFornisseurId("");
                      setCalculations({ marge: 0, margePourcentage: 0 });
                    }}
                  >
                    Réinitialiser
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    <FiSave size={16} className="me-2" />
                    <span>
                      {isSubmitting
                        ? "Création en cours..."
                        : "Enregistrer le produit"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Instructions Panel */}
          <div className="col-xl-3">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <FiPackage className="me-2" />
                  Informations Produit
                </h5>
              </div>
              <div className="card-body">
                <h6 className="mb-3">Champs obligatoires:</h6>
                <ul className="list-unstyled mb-4">
                  <li className="mb-2">
                    <small className="text-muted d-flex align-items-center">
                      <FiHash size={12} className="me-2" />
                      <strong>Référence:</strong> Unique, identifiant du produit
                    </small>
                  </li>
                  <li className="mb-2">
                    <small className="text-muted d-flex align-items-center">
                      <FiPackage size={12} className="me-2" />
                      <strong>Désignation:</strong> Description complète
                    </small>
                  </li>
                  <li className="mb-2">
                    <small className="text-muted d-flex align-items-center">
                      <FiDollarSign size={12} className="me-2" />
                      <strong>Prix d'achat:</strong> Coût d'acquisition
                    </small>
                  </li>
                  <li>
                    <small className="text-muted d-flex align-items-center">
                      <FiDollarSign size={12} className="me-2" />
                      <strong>Prix de vente:</strong> Supérieur au prix d'achat
                    </small>
                  </li>
                </ul>

                <h6 className="mb-3">Champs optionnels:</h6>
                <ul className="list-unstyled mb-4">
                  <li className="mb-2">
                    <small className="text-muted d-flex align-items-center">
                      <FiBarChart2 size={12} className="me-2" />
                      <strong>Quantité:</strong> Stock initial (0 par défaut)
                    </small>
                  </li>
                  <li className="mb-2">
                    <small className="text-muted d-flex align-items-center">
                      <FiUser size={12} className="me-2" />
                      <strong>Fournisseur:</strong> Source du produit
                    </small>
                  </li>
                  <li>
                    <small className="text-muted d-flex align-items-center">
                      <FiBarChart2 size={12} className="me-2" />
                      <strong>Observations:</strong> Notes supplémentaires
                    </small>
                  </li>
                </ul>

                <div className="mt-4 p-3 bg-light rounded">
                  <small className="text-muted">
                    <strong>Note importante:</strong>
                    <ul className="mt-2 mb-0">
                      <li>
                        Le prix de vente doit être supérieur au prix d'achat
                      </li>
                      <li>La référence doit être unique dans le système</li>
                      <li>La marge est calculée automatiquement</li>
                    </ul>
                  </small>
                </div>

                {/* Quick Stats */}
                <div className="mt-4">
                  <h6 className="mb-3">Aperçu:</h6>
                  <div className="d-flex justify-content-between mb-2">
                    <small>Marge unitaire:</small>
                    <small className="fw-bold text-success">
                      {calculations.marge} DH
                    </small>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <small>Taux de marge:</small>
                    <small className="fw-bold text-primary">
                      {calculations.margePourcentage}%
                    </small>
                  </div>
                  <div className="d-flex justify-content-between">
                    <small>Valeur du stock:</small>
                    <small className="fw-bold text-info">
                      {(qty * (parseFloat(prixAchat) || 0)).toFixed(2)} DH
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProduitsCreate;
