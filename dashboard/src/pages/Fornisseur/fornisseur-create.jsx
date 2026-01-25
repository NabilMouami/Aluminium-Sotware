import React, { useState } from "react";
import {
  FiSave,
  FiUser,
  FiPhone,
  FiMapPin,
  FiHome,
  FiHash,
} from "react-icons/fi";
import topTost from "@/utils/topTost";
import axios from "axios";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const MySwal = withReactContent(Swal);

function FornisseurCreate() {
  const [nom_complete, setNomComplete] = useState("");
  const [ville, setVille] = useState("");
  const [address, setAddress] = useState("");
  const [telephone, setTelephone] = useState("");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fornisseurData = {
        nom_complete,
        ville,
        address,
        telephone,
        reference: reference.trim() || null, // Send null if empty
      };

      // Get token from localStorage or wherever you store it
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const response = await axios.post(
        `${config_url}/api/fornisseurs`,
        fornisseurData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      MySwal.fire({
        title: "Success!",
        text: "Fournisseur créé avec succès",
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        // Reset form
        setNomComplete("");
        setVille("");
        setAddress("");
        setTelephone("");
        setReference("");
      });
    } catch (error) {
      console.error("Error creating fornisseur:", error);

      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors
          .map((err) => err.message)
          .join(", ");
        topTost(errorMessages, "error");
      } else if (error.response?.data?.field === "reference") {
        topTost(
          "Cette référence est déjà utilisée par un autre fournisseur",
          "error",
        );
      } else if (error.response?.data?.field === "telephone") {
        topTost(
          "Ce numéro de téléphone est déjà utilisé par un autre fournisseur",
          "error",
        );
      } else {
        topTost(
          error.response?.data?.message ||
            "Erreur lors de la création du fournisseur",
          "error",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format telephone input
  const handleTelephoneChange = (e) => {
    const value = e.target.value;
    // Allow only numbers, spaces, plus, hyphen, and parentheses
    const formattedValue = value.replace(/[^\d\s+\-()]/g, "");
    setTelephone(formattedValue);
  };

  // Format reference input (alphanumeric and some special chars)
  const handleReferenceChange = (e) => {
    const value = e.target.value;
    // Allow alphanumeric, hyphens, underscores
    const formattedValue = value.replace(/[^a-zA-Z0-9-_]/g, "");
    setReference(formattedValue);
  };

  return (
    <>
      <div className="main-content">
        <div className="row">
          <form className="col-xl-9" onSubmit={handleSubmit}>
            <div className="card stretch stretch-full">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <FiUser className="me-2" />
                  Nouveau Fournisseur
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <label className="form-label">
                    <FiUser size={16} className="me-1" />
                    Nom Complet <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Entrez le nom complet du fournisseur"
                    value={nom_complete}
                    onChange={(e) => setNomComplete(e.target.value)}
                    required
                    minLength="2"
                    maxLength="200"
                  />
                  <small className="text-muted">
                    Entre 2 et 200 caractères
                  </small>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-4">
                    <label className="form-label">
                      <FiPhone size={16} className="me-1" />
                      Téléphone <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Ex: +212 6XX-XXXXXX ou 06XXXXXXXX"
                      value={telephone}
                      onChange={handleTelephoneChange}
                      required
                      pattern="^[0-9+\-\s()]{8,20}$"
                      title="Format de téléphone: 8-20 chiffres, peut contenir +, -, espaces, parentheses"
                    />
                    <small className="text-muted">
                      Format: 8-20 chiffres, peut contenir +, -, espaces
                    </small>
                  </div>

                  <div className="col-md-6 mb-4">
                    <label className="form-label">
                      <FiHash size={16} className="me-1" />
                      Référence
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: FRN-001, SUP-2024"
                      value={reference}
                      onChange={handleReferenceChange}
                      maxLength="50"
                    />
                    <small className="text-muted">
                      Optionnel, doit être unique (max 50 caractères)
                    </small>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-4">
                    <label className="form-label">
                      <FiMapPin size={16} className="me-1" />
                      Ville
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Entrez la ville"
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                      maxLength="100"
                    />
                    <small className="text-muted">Maximum 100 caractères</small>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">
                    <FiHome size={16} className="me-1" />
                    Adresse
                  </label>
                  <textarea
                    className="form-control"
                    placeholder="Entrez l'adresse complète"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows="3"
                    maxLength="500"
                  />
                  <small className="text-muted">Maximum 500 caractères</small>
                </div>

                <div className="d-flex justify-content-between mt-4">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setNomComplete("");
                      setVille("");
                      setAddress("");
                      setTelephone("");
                      setReference("");
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
                      {isSubmitting ? "Création en cours..." : "Enregistrer"}
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

export default FornisseurCreate;
