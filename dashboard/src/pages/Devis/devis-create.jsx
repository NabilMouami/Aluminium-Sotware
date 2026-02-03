import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { config_url } from "@/utils/config";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import {
  FiUser,
  FiShoppingCart,
  FiPlus,
  FiMinus,
  FiDollarSign,
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiSave,
  FiX,
  FiCreditCard as FiCard,
  FiDollarSign as FiCash,
  FiXCircle,
  FiFile,
} from "react-icons/fi";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import api from "@/utils/axiosConfig";
import { useNavigate } from "react-router-dom";

const MySwal = withReactContent(Swal);

const DevisCreate = () => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [allProduits, setAllProduits] = useState([]);
  const [selectedProduits, setSelectedProduits] = useState([]);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [formData, setFormData] = useState({
    client_id: "",
    mode_reglement: "espèces",
    notes: "",
    date_creation: new Date().toISOString().split("T")[0],
  });

  const selectRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
    fetchAllProduits();
  }, []);

  const fetchClients = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const clientOptions = (response.data?.clients || []).map((client) => {
        const refPart = client.reference ? `(${client.reference}) ` : "";

        // Ensure all required properties exist with fallback values
        const nom_complete = client.nom_complete || "";
        const telephone = client.telephone || "";
        const reference = client.reference || "";

        return {
          value: client.id,
          label: `${refPart}${nom_complete}${telephone ? ` - ${telephone}` : ""}`,
          searchText: [
            nom_complete.toLowerCase(),
            telephone.toLowerCase(),
            reference.toLowerCase(),
          ].join(" "),
          nom_complete,
          telephone,
          reference,
          address: client.address || "",
          ville: client.ville || "",
        };
      });

      setClients(clientOptions);
    } catch (error) {
      console.error("Error fetching clients:", error);
      topTost("Erreur lors du chargement des clients", "error");
      setClients([]); // Set empty array on error
    }
  };

  const fetchAllProduits = async () => {
    try {
      setLoadingProduits(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/produits`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const options = (response.data?.produits || []).map((produit) => ({
        value: produit.id,
        label: `${produit.reference} - ${produit.designation}`,
        data: {
          ...produit,
          displayText: `${produit.reference} - ${produit.designation} (Stock: ${produit.qty}, Prix: ${produit.prix_vente} DH)`,
        },
      }));

      setAllProduits(options);
    } catch (error) {
      console.error("Error loading produits:", error);
      topTost("Erreur lors du chargement des produits", "error");
    } finally {
      setLoadingProduits(false);
    }
  };

  const loadProduits = async (inputValue) => {
    // Si pas de recherche, retourner tous les produits
    if (!inputValue) {
      return allProduits;
    }

    // Filtrer localement les produits existants
    const filtered = allProduits.filter((option) => {
      const searchTerm = inputValue.toLowerCase();
      const produit = option.data;
      return (
        produit.reference?.toLowerCase().includes(searchTerm) ||
        produit.designation?.toLowerCase().includes(searchTerm) ||
        produit.categorie?.toLowerCase().includes(searchTerm)
      );
    });

    // Si aucun résultat local, faire une recherche API
    if (filtered.length === 0 && inputValue.length >= 2) {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(
          `${config_url}/api/produits/search?q=${inputValue}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const options = (response.data.produits || []).map((produit) => ({
          value: produit.id,
          label: `${produit.reference} - ${produit.designation}`,
          data: {
            ...produit,
            displayText: `${produit.reference} - ${produit.designation} (Stock: ${produit.qty}, Prix: ${produit.prix_vente} DH)`,
          },
        }));

        return options;
      } catch (error) {
        console.error("Error searching produits:", error);
        return [];
      }
    }

    return filtered;
  };

  const MultiValueRemove = (props) => {
    return (
      <div
        {...props.innerProps}
        className="d-flex align-items-center justify-content-center"
        style={{
          cursor: "pointer",
          padding: "0 4px",
          borderRadius: "50%",
          backgroundColor: "#ff6b6b",
          color: "white",
          width: "20px",
          height: "20px",
          marginLeft: "4px",
        }}
        title="Supprimer"
      >
        <FiXCircle size={12} />
      </div>
    );
  };

  const customOption = (props) => {
    const { data, innerRef, innerProps, isSelected, isFocused } = props;
    const isDisabled = selectedProduits.some((p) => p.id === data.value);

    return (
      <div
        ref={innerRef}
        {...innerProps}
        className={`p-2 cursor-pointer ${isDisabled ? "bg-gray-100" : ""} ${isSelected ? "bg-primary text-white" : ""} ${isFocused && !isSelected ? "bg-blue-50" : ""}`}
        style={{ opacity: isDisabled ? 0.5 : 1 }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div className="font-semibold">{data.label}</div>
          {isDisabled && (
            <span className="badge bg-secondary">Déjà ajouté</span>
          )}
        </div>
        <div
          className={`text-sm ${isSelected ? "text-white" : "text-gray-600"}`}
        >
          Stock: {data.data.qty} | Prix: {data.data.prix_vente} DH
        </div>
        {data.data.categorie && (
          <div
            className={`text-xs ${isSelected ? "text-white" : "text-gray-500"}`}
          >
            Catégorie: {data.data.categorie}
          </div>
        )}
      </div>
    );
  };

  const handleProduitSelect = (selectedOptions) => {
    if (!selectedOptions) return;

    // Si c'est un tableau (multi-sélection)
    if (Array.isArray(selectedOptions)) {
      selectedOptions.forEach((selectedOption) => {
        if (!selectedOption) return;

        if (selectedProduits.some((p) => p.id === selectedOption.value)) {
          return;
        }

        const produitData = selectedOption.data;
        const newProduit = {
          ...produitData,
          quantite: 1,
          prix_unitaire: produitData.prix_vente,
          total_ligne: produitData.prix_vente,
          description: "",
          unite: "unité",
        };

        setSelectedProduits((prev) => [...prev, newProduit]);
      });

      // Réinitialiser le champ de sélection
      if (selectRef.current) {
        selectRef.current.setValue(null);
      }

      if (selectedOptions.length > 0) {
        topTost(`${selectedOptions.length} produit(s) ajouté(s)`, "success");
      }
    }
    // Si c'est une seule sélection
    else {
      if (selectedProduits.some((p) => p.id === selectedOptions.value)) {
        topTost("Produit déjà ajouté", "warning");

        if (selectRef.current) {
          selectRef.current.setValue(null);
        }

        return;
      }

      const produitData = selectedOptions.data;
      const newProduit = {
        ...produitData,
        quantite: 1,
        prix_unitaire: produitData.prix_vente,
        total_ligne: produitData.prix_vente,
        description: "",
        unite: "unité",
      };

      setSelectedProduits((prev) => [...prev, newProduit]);

      if (selectRef.current) {
        selectRef.current.setValue(null);
      }

      topTost("Produit ajouté", "success");
    }
  };

  const removeProduit = (index) => {
    const produit = selectedProduits[index];
    const newProduits = [...selectedProduits];
    newProduits.splice(index, 1);
    setSelectedProduits(newProduits);
    topTost(`${produit.reference} supprimé`, "info");
  };

  const updateProduitQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;

    const newProduits = [...selectedProduits];
    newProduits[index].quantite = newQuantity;
    newProduits[index].total_ligne =
      newProduits[index].prix_unitaire * newQuantity;
    setSelectedProduits(newProduits);
  };

  const updateProduitPrice = (index, newPrice) => {
    const newProduits = [...selectedProduits];
    newProduits[index].prix_unitaire = parseFloat(newPrice) || 0;
    newProduits[index].total_ligne =
      newProduits[index].prix_unitaire * newProduits[index].quantite;
    setSelectedProduits(newProduits);
  };

  const updateProduitDiscount = (index, discount) => {
    const newProduits = [...selectedProduits];
    newProduits[index].total_ligne =
      newProduits[index].prix_unitaire * newProduits[index].quantite;
    setSelectedProduits(newProduits);
  };

  const updateProduitDescription = (index, description) => {
    const newProduits = [...selectedProduits];
    newProduits[index].description = description;
    setSelectedProduits(newProduits);
  };

  const updateProduitUnite = (index, unite) => {
    const newProduits = [...selectedProduits];
    newProduits[index].unite = unite;
    setSelectedProduits(newProduits);
  };

  const calculateTotals = () => {
    const sousTotal = selectedProduits.reduce(
      (sum, p) => sum + p.total_ligne,
      0,
    );
    const montantHT = sousTotal;
    const montantTTC = montantHT;

    return {
      sousTotal: sousTotal.toFixed(2),
      montantHT: montantHT.toFixed(2),
      montantTTC: montantTTC.toFixed(2),
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client_id) {
      topTost("Veuillez sélectionner un client", "error");
      return;
    }

    if (selectedProduits.length === 0) {
      topTost("Veuillez ajouter au moins un produit", "error");
      return;
    }

    const payload = {
      client_id: formData.client_id,
      mode_reglement: formData.mode_reglement,
      notes: formData.notes,
      date_creation: formData.date_creation,
      produits: selectedProduits.map((p) => ({
        produit_id: p.id,
        quantite: p.quantite,
        prix_unitaire: p.prix_unitaire,
        description: p.description,
        unite: p.unite,
      })),
    };

    console.log("Payload to send:", payload); // Debug log

    const result = await MySwal.fire({
      title: "Créer le devis ?",
      html: `
        <div class="text-start">
          <p><strong>Montant TTC:</strong> ${totals.montantTTC} DH</p>
          <p><strong>Nombre de produits:</strong> ${selectedProduits.length}</p>
          <p><strong>Mode de règlement:</strong> ${formData.mode_reglement}</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, créer",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) return;

    setLoading(true);

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await api.post("/api/devis", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        MySwal.fire({
          title: "Succès !",
          text: "Devis créé avec succès",
          icon: "success",
          html: `
            <div class="text-start">
              <p><strong>Numéro:</strong> ${response.data.devis.num_devis}</p>
              <p><strong>Montant TTC:</strong> ${
                response.data.devis.montant_ttc
              } DH</p>
              <p><strong>Statut:</strong> ${response.data.devis.status}</p>
              <p><strong>Date de création:</strong> ${new Date(
                response.data.devis.date_creation,
              ).toLocaleDateString("fr-FR")}</p>
            </div>
          `,
          confirmButtonText: "Voir le devis",
          showCancelButton: true,
          cancelButtonText: "Nouveau devis",
        }).then((result) => {
          if (result.isConfirmed) {
            navigate(`/devis/${response.data.devis.id}`);
          } else {
            setSelectedProduits([]);
            setFormData({
              client_id: "",
              mode_reglement: "espèces",
              notes: "",
              date_creation: new Date().toISOString().split("T")[0],
            });
          }
        });
      }
    } catch (error) {
      console.error("Error creating devis:", error);
      const errorMsg =
        error.response?.data?.message || "Erreur lors de la création du devis";
      topTost(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const topTost = (message, type = "success") => {
    const toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });

    toast.fire({
      icon: type,
      title: message,
    });
  };

  return (
    <div className="main-content">
      <PageHeader
        title="Nouveau Devis"
        subtitle="Créer un nouveau devis"
        breadcrumb={[
          { label: "Dashboard", link: "/dashboard" },
          { label: "Devis", link: "/devis" },
          { label: "Nouveau", active: true },
        ]}
      >
        <button
          type="button"
          onClick={() => window.history.back()}
          className="d-flex btn btn-outline-danger me-2"
        >
          <FiX className="me-2" />
          Annuler
        </button>
      </PageHeader>

      <div className="col">
        <div className="col-lg-12 mt-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <FiFile className="me-2" />
                Informations du Devis
              </h5>
            </div>
            <div className="card-body">
              <form id="devisForm" onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      <FiUser className="me-2" />
                      Client <span className="text-danger">*</span>
                    </label>
                    <Select
                      options={clients}
                      className="react-select"
                      classNamePrefix="react-select"
                      placeholder="Sélectionner un client"
                      value={clients.find(
                        (c) => c.value === formData.client_id,
                      )}
                      onChange={(selectedOption) =>
                        setFormData({
                          ...formData,
                          client_id: selectedOption?.value || "",
                        })
                      }
                      isSearchable
                      required
                      noOptionsMessage={() => "Aucun client trouvé"}
                      filterOption={(option, rawInput) => {
                        if (!rawInput) return true;
                        const search = rawInput.toLowerCase().trim();

                        // Create search text from available properties
                        const searchableText = [
                          option.data?.nom_complete || "",
                          option.data?.telephone || "",
                          option.data?.reference || "",
                          option.data?.ville || "",
                          option.data?.address || "",
                        ]
                          .map((text) => text.toLowerCase())
                          .join(" ");

                        return searchableText.includes(search);
                      }}
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: "45px",
                          borderColor: "#dee2e6",
                          "&:hover": { borderColor: "#405189" },
                        }),
                      }}
                    />{" "}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      <FiCreditCard className="me-2" />
                      Mode de Règlement
                    </label>
                    <select
                      className="form-select"
                      value={formData.mode_reglement}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mode_reglement: e.target.value,
                        })
                      }
                    >
                      <option value="espèces">Espèces</option>
                      <option value="carte_bancaire">Carte Bancaire</option>
                      <option value="chèque">Chèque</option>
                      <option value="virement">Virement</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      <FiCalendar className="me-2" />
                      Date du Devis
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date_creation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          date_creation: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">
                      <FiFileText className="me-2" />
                      Notes
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Notes supplémentaires..."
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <FiShoppingCart className="me-2" />
                Produits
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-4">
                {loadingProduits ? (
                  <div className="text-center py-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Chargement...</span>
                    </div>
                    <p className="mt-2">Chargement des produits...</p>
                  </div>
                ) : (
                  <AsyncSelect
                    ref={selectRef}
                    cacheOptions
                    loadOptions={loadProduits}
                    defaultOptions={true}
                    onChange={handleProduitSelect}
                    placeholder="Commencez à taper pour rechercher..."
                    noOptionsMessage={({ inputValue }) =>
                      !inputValue
                        ? "Commencez à taper pour rechercher"
                        : "Aucun produit trouvé"
                    }
                    loadingMessage={() => "Chargement..."}
                    className="react-select"
                    classNamePrefix="react-select"
                    components={{
                      Option: customOption,
                      MultiValueRemove: MultiValueRemove,
                    }}
                    formatOptionLabel={(option) => (
                      <div>
                        <div className="font-semibold">{option.label}</div>
                        <div className="text-sm text-muted">
                          Stock: {option.data.qty} | Prix:{" "}
                          {option.data.prix_vente} DH
                        </div>
                      </div>
                    )}
                    isMulti={false}
                    isClearable={true}
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: "45px",
                        borderColor: "#dee2e6",
                        "&:hover": {
                          borderColor: "#405189",
                        },
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                      multiValueRemove: (base) => ({
                        ...base,
                        ":hover": {
                          backgroundColor: "#dc3545",
                          color: "white",
                        },
                      }),
                    }}
                  />
                )}

                <small className="text-muted mt-1 d-block">
                  {allProduits.length} produits disponibles | Recherche par
                  référence, désignation ou catégorie
                </small>
              </div>

              {selectedProduits.length > 0 ? (
                <div className="table-responsive mt-3">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th width="25%">Produit</th>
                        <th width="12%" className="text-center">
                          Prix U.
                        </th>
                        <th width="15%" className="text-center">
                          Quantité
                        </th>
                        <th width="12%" className="text-center">
                          Total
                        </th>
                        <th width="12%" className="text-center">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduits.map((produit, index) => (
                        <tr key={produit.id}>
                          <td>
                            <div>
                              <strong className="d-block">
                                {produit.reference}
                              </strong>
                              <small className="text-muted d-block">
                                {produit.designation}
                              </small>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="input-group input-group-sm">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-control text-center"
                                value={produit.prix_unitaire}
                                onChange={(e) =>
                                  updateProduitPrice(index, e.target.value)
                                }
                              />
                              <span className="input-group-text">DH</span>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() =>
                                  updateProduitQuantity(
                                    index,
                                    produit.quantite - 1,
                                  )
                                }
                                disabled={produit.quantite <= 1}
                              >
                                <FiMinus size={12} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                className="form-control form-control-sm text-center"
                                style={{ width: "70px" }}
                                value={produit.quantite}
                                onChange={(e) =>
                                  updateProduitQuantity(
                                    index,
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() =>
                                  updateProduitQuantity(
                                    index,
                                    produit.quantite + 1,
                                  )
                                }
                              >
                                <FiPlus size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="text-center">
                            <strong className="text-primary">
                              {produit.total_ligne.toFixed(2)} DH
                            </strong>
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeProduit(index)}
                              title="Supprimer"
                            >
                              <FiXCircle />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="avatar-lg mx-auto mb-4">
                    <div className="avatar-title bg-light text-warning rounded-circle">
                      <FiShoppingCart className="fs-24" />
                    </div>
                  </div>
                  <h5>Aucun produit sélectionné</h5>
                  <p className="text-muted">
                    Recherchez et ajoutez des produits dans le champ ci-dessus
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-12 mt-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <FiDollarSign className="me-2" />
                Récapitulatif
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Nombre de produits:</span>
                  <strong>{selectedProduits.length}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Articles totaux:</span>
                  <strong>
                    {selectedProduits.reduce((sum, p) => sum + p.quantite, 0)}
                  </strong>
                </div>
              </div>

              <hr />

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Total a Payer:</span>
                  <strong>{totals.sousTotal} DH</strong>
                </div>
              </div>

              <div className="d-grid gap-2">
                <button
                  type="submit"
                  form="devisForm"
                  className="btn btn-primary btn-lg"
                  disabled={loading || selectedProduits.length === 0}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <FiSave className="me-2" />
                      Créer le Devis
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-body">
              <h6 className="card-title">
                <FiFile className="me-2" />
                Détails du Client
              </h6>
              {formData.client_id ? (
                <div className="mt-2">
                  {(() => {
                    const selectedClient = clients.find(
                      (c) => c.value === formData.client_id,
                    );
                    return selectedClient ? (
                      <>
                        <p className="mb-1">
                          <strong>Nom:</strong> {selectedClient.nom_complete}
                        </p>
                        {selectedClient.telephone && (
                          <p className="mb-1">
                            <strong>Tél:</strong> {selectedClient.telephone}
                          </p>
                        )}
                        {selectedClient.address && (
                          <p className="mb-1">
                            <strong>Adresse:</strong> {selectedClient.address}
                          </p>
                        )}
                        {selectedClient.ville && (
                          <p className="mb-0">
                            <strong>Ville:</strong> {selectedClient.ville}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted mb-0">Client non chargé</p>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-muted mb-0">Aucun client sélectionné</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevisCreate;
