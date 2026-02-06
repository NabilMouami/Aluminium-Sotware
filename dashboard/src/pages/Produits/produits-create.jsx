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

  // Additional state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculations, setCalculations] = useState({
    marge: 0,
    margePourcentage: 0,
  });

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
        },
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
          "error",
        );
      } else {
        topTost(
          error.response?.data?.message ||
            error.message ||
            "Erreur lors de la création du produit",
          "error",
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

  return (
    <>
      <div className="main-content">
        <div className="row">
          <form className="col-xl-12" onSubmit={handleSubmit}>
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
        </div>
      </div>
    </>
  );
}

export default ProduitsCreate;
