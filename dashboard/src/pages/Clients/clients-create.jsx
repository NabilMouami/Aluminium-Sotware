import React, { useState } from "react";
import { FiSave } from "react-icons/fi";
import topTost from "@/utils/topTost";
import axios from "axios";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const MySwal = withReactContent(Swal);

function ClientsCreate() {
  const [nom_complete, setNomComplete] = useState("");
  const [reference, setReference] = useState("");
  const [ville, setVille] = useState("");
  const [address, setAddress] = useState("");
  const [telephone, setTelephone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const clientData = {
        nom_complete,
        reference,
        ville,
        address,
        telephone,
      };

      // Get token from localStorage or wherever you store it
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const response = await axios.post(
        `${config_url}/api/clients`,
        clientData,
      );

      MySwal.fire({
        title: "Success!",
        text: "Client created successfully",
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        // Reset form
        setNomComplete("");
        setReference("");
        setVille("");
        setAddress("");
        setTelephone("");
      });
    } catch (error) {
      console.error("Error creating client:", error);

      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors
          .map((err) => err.message)
          .join(", ");
        topTost(errorMessages, "error");
      } else {
        topTost(
          error.response?.data?.message || "Error creating client",
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

  return (
    <>
      <div className="main-content">
        <div className="row">
          <form className="col-xl-9" onSubmit={handleSubmit}>
            <div className="card stretch stretch-full">
              <div className="card-body">
                <div className="mb-4">
                  <label className="form-label">
                    Nom Complet <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Entrez le nom complet du client"
                    value={nom_complete}
                    onChange={(e) => setNomComplete(e.target.value)}
                    required
                    minLength="2"
                    maxLength="200"
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label">
                    Refrence (Code) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Entrez le Refrence ou Code du client"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                    minLength="2"
                    maxLength="200"
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">
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

                <div className="mb-4">
                  <label className="form-label">Ville</label>
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

                <div className="mb-4">
                  <label className="form-label">Adresse</label>
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

                <button
                  type="submit"
                  className="w-25 btn btn-primary m-4"
                  disabled={isSubmitting}
                >
                  <FiSave size={16} className="me-2" />
                  <span>{isSubmitting ? "Creating..." : "Save"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default ClientsCreate;
