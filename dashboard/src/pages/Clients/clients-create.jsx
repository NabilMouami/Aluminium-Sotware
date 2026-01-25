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
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!nom_complete.trim()) {
      newErrors.nom_complete = "Nom complet is required";
    } else if (nom_complete.length < 2 || nom_complete.length > 200) {
      newErrors.nom_complete =
        "Nom complet must be between 2 and 200 characters";
    }

    if (!telephone.trim()) {
      newErrors.telephone = "Telephone is required";
    } else if (!/^[0-9+\-\s()]{8,20}$/.test(telephone)) {
      newErrors.telephone = "Invalid telephone format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      topTost("Please fix the errors in the form", "error");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const clientData = {
        nom_complete: nom_complete.trim(),
        reference: reference.trim(),
        ville: ville.trim(),
        address: address.trim(),
        telephone: telephone.trim(),
      };

      console.log("Sending data:", clientData); // Debug log

      // Get token
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await axios.post(
        `${config_url}/api/clients`,
        clientData,
      );

      console.log("Response:", response.data); // Debug log

      MySwal.fire({
        title: "Success!",
        text: response.data.message || "Client created successfully",
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
      console.error("Error response:", error.response); // Debug log

      // Handle validation errors from server
      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach((err) => {
          serverErrors[err.field] = err.message;
        });
        setErrors(serverErrors);

        const errorMessages = error.response.data.errors
          .map((err) => err.message)
          .join(", ");
        topTost(errorMessages, "error");
      } else if (error.response?.data?.message) {
        topTost(error.response.data.message, "error");
      } else if (error.message === "Network Error") {
        topTost(
          "Cannot connect to server. Please check your connection.",
          "error",
        );
      } else if (error.response?.status === 401) {
        topTost("Authentication required. Please login again.", "error");
        // Redirect to login
        window.location.href = "/login";
      } else {
        topTost("Error creating client. Please try again.", "error");
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
                    className={`form-control ${errors.nom_complete ? "is-invalid" : ""}`}
                    placeholder="Entrez le nom complet du client"
                    value={nom_complete}
                    onChange={(e) => {
                      setNomComplete(e.target.value);
                      if (errors.nom_complete)
                        setErrors((prev) => ({
                          ...prev,
                          nom_complete: undefined,
                        }));
                    }}
                    required
                    minLength="2"
                    maxLength="200"
                  />
                  {errors.nom_complete && (
                    <div className="invalid-feedback d-block">
                      {errors.nom_complete}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label">Refrence (Code)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Entrez le Refrence ou Code du client"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
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
                    className={`form-control ${errors.telephone ? "is-invalid" : ""}`}
                    placeholder="Ex: +212 6XX-XXXXXX ou 06XXXXXXXX"
                    value={telephone}
                    onChange={handleTelephoneChange}
                    required
                  />
                  {errors.telephone && (
                    <div className="invalid-feedback d-block">
                      {errors.telephone}
                    </div>
                  )}
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
