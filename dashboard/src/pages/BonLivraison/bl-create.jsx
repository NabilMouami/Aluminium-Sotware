import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { config_url } from "@/utils/config";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import {
  FiPackage,
  FiUser,
  FiShoppingCart,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiSearch,
  FiPercent,
  FiDollarSign,
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiSave,
  FiX,
  FiCheck,
  FiCreditCard as FiCard,
  FiDollarSign as FiCash,
  FiChevronDown,
  FiChevronUp,
  FiXCircle,
  FiRefreshCw,
} from "react-icons/fi";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import api from "@/utils/axiosConfig";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const MySwal = withReactContent(Swal);

const BonLivraisonCreate = () => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [allProduits, setAllProduits] = useState([]);
  const [selectedProduits, setSelectedProduits] = useState([]);
  const [showAdvancements, setShowAdvancements] = useState(false);
  const [advancements, setAdvancements] = useState([]);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [formData, setFormData] = useState({
    clientId: "",
    mode_reglement: "espèces",
    remise: 0,
    notes: "",
    date_livraison: "",
  });

  const selectRef = useRef();

  useEffect(() => {
    fetchClients();
    fetchAllProduits();
    const today = new Date().toISOString().split("T")[0];
    setFormData((prev) => ({ ...prev, date_livraison: today }));
  }, []);

  const fetchClients = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const clientOptions = (response.data?.clients || []).map((client) => ({
        value: client.id,
        label: `${client.nom_complete} ${client.telephone ? `- ${client.telephone}` : ""}`,
        ...client,
      }));

      setClients(clientOptions);
    } catch (error) {
      console.error("Error fetching clients:", error);
      topTost("Erreur lors du chargement des clients", "error");
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
          remise_ligne: 0,
          total_ligne: produitData.prix_vente,
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
        remise_ligne: 0,
        total_ligne: produitData.prix_vente,
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

    const produit = selectedProduits[index];
    if (newQuantity > produit.qty) {
      topTost(`Stock insuffisant. Disponible: ${produit.qty}`, "warning");
      return;
    }

    const newProduits = [...selectedProduits];
    newProduits[index].quantite = newQuantity;
    newProduits[index].total_ligne =
      newProduits[index].prix_unitaire * newQuantity -
      newProduits[index].remise_ligne;
    setSelectedProduits(newProduits);
  };

  const updateProduitPrice = (index, newPrice) => {
    const newProduits = [...selectedProduits];
    newProduits[index].prix_unitaire = parseFloat(newPrice) || 0;
    newProduits[index].total_ligne =
      newProduits[index].prix_unitaire * newProduits[index].quantite -
      newProduits[index].remise_ligne;
    setSelectedProduits(newProduits);
  };

  const updateProduitDiscount = (index, discount) => {
    const newProduits = [...selectedProduits];
    newProduits[index].remise_ligne = parseFloat(discount) || 0;
    newProduits[index].total_ligne =
      newProduits[index].prix_unitaire * newProduits[index].quantite -
      newProduits[index].remise_ligne;
    setSelectedProduits(newProduits);
  };

  const addAdvancement = () => {
    const newAdvancement = {
      id: Date.now(),
      amount: "",
      paymentMethod: "espece",
      reference: "",
      notes: "",
      paymentDate: new Date().toISOString().split("T")[0],
    };
    setAdvancements([...advancements, newAdvancement]);
  };

  const removeAdvancement = (index) => {
    const newAdvancements = [...advancements];
    newAdvancements.splice(index, 1);
    setAdvancements(newAdvancements);
  };

  const updateAdvancement = (index, field, value) => {
    const newAdvancements = [...advancements];
    newAdvancements[index][field] = value;

    if (field === "amount") {
      const amount = parseFloat(value) || 0;
      const totalTTC = parseFloat(totals.montantTTC);
      const remaining = totalTTC - calculateTotalAdvancements() + amount;

      if (remaining < 0) {
        topTost(
          "Le total des acomptes ne peut pas dépasser le montant TTC",
          "warning",
        );
      }
    }

    setAdvancements(newAdvancements);
  };

  const calculateTotalAdvancements = () => {
    return advancements.reduce((total, advance) => {
      return total + (parseFloat(advance.amount) || 0);
    }, 0);
  };

  const calculateTotals = () => {
    const sousTotal = selectedProduits.reduce(
      (sum, p) => sum + p.total_ligne,
      0,
    );
    const remise = parseFloat(formData.remise) || 0;
    const montantHT = sousTotal - remise;
    const montantTTC = montantHT;
    const totalAdvancements = calculateTotalAdvancements();
    const remaining = montantTTC - totalAdvancements;

    return {
      sousTotal: sousTotal.toFixed(2),
      montantHT: montantHT.toFixed(2),
      montantTTC: montantTTC.toFixed(2),
      remise: remise.toFixed(2),
      totalAdvancements: totalAdvancements.toFixed(2),
      remaining: remaining.toFixed(2),
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.clientId) {
      topTost("Veuillez sélectionner un client", "error");
      return;
    }

    if (selectedProduits.length === 0) {
      topTost("Veuillez ajouter au moins un produit", "error");
      return;
    }

    for (const produit of selectedProduits) {
      if (produit.quantite > produit.qty) {
        topTost(
          `Stock insuffisant pour ${produit.designation}. Disponible: ${produit.qty}`,
          "error",
        );
        return;
      }
    }

    const totalAdvancements = calculateTotalAdvancements();
    const totalTTC = parseFloat(totals.montantTTC);

    if (totalAdvancements > totalTTC) {
      topTost(
        "Le total des acomptes ne peut pas dépasser le montant TTC",
        "error",
      );
      return;
    }

    for (const advance of advancements) {
      if (!advance.amount || parseFloat(advance.amount) <= 0) {
        topTost("Tous les acomptes doivent avoir un montant positif", "error");
        return;
      }
      if (!advance.paymentMethod) {
        topTost("Méthode de paiement requise pour tous les acomptes", "error");
        return;
      }
    }

    const advancementsData = advancements.map((advance) => ({
      amount: parseFloat(advance.amount),
      paymentMethod: advance.paymentMethod,
      reference: advance.reference || null,
      notes: advance.notes || null,
      paymentDate:
        advance.paymentDate || new Date().toISOString().split("T")[0],
    }));

    const payload = {
      clientId: formData.clientId,
      mode_reglement: formData.mode_reglement,
      remise: parseFloat(formData.remise) || 0,
      notes: formData.notes,
      date_livraison: formData.date_livraison || null,
      produits: selectedProduits.map((p) => ({
        produitId: p.id,
        quantite: p.quantite,
        prix_unitaire: p.prix_unitaire,
        remise_ligne: p.remise_ligne,
      })),
      advancements: advancementsData.length > 0 ? advancementsData : undefined,
    };

    let paymentStatus = "brouillon";
    if (totalAdvancements >= totalTTC) {
      paymentStatus = "payé";
    } else if (totalAdvancements > 0) {
      paymentStatus = "partiellement payé";
    }

    const result = await MySwal.fire({
      title: "Créer le bon de livraison ?",
      html: `
        <div class="text-start">
          <p><strong>Montant TTC:</strong> ${totals.montantTTC} DH</p>
          <p><strong>Acomptes:</strong> ${totals.totalAdvancements} DH</p>
          <p><strong>Reste à payer:</strong> ${totals.remaining} DH</p>
          <p><strong>Statut paiement:</strong> ${paymentStatus}</p>
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
      const response = await api.post("/api/bon-livraisons", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        MySwal.fire({
          title: "Succès !",
          text: "Bon de livraison créé avec succès",
          icon: "success",
          html: `
            <div class="text-start">
              <p><strong>Numéro:</strong> ${
                response.data.bon.num_bon_livraison
              }</p>
              <p><strong>Montant TTC:</strong> ${
                response.data.bon.montant_ttc
              } DH</p>
              <p><strong>Acomptes:</strong> ${
                response.data.totalAdvancements || 0
              } DH</p>
              <p><strong>Statut:</strong> ${response.data.bon.statut}</p>
            </div>
          `,
          confirmButtonText: "Voir le bon",
          showCancelButton: true,
          cancelButtonText: "Nouveau bon",
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = `/bon-livraisons/${response.data.bon.id}`;
          } else {
            setSelectedProduits([]);
            setAdvancements([]);
            setShowAdvancements(false);
            setFormData({
              clientId: "",
              mode_reglement: "espèces",
              remise: 0,
              notes: "",
              date_livraison: new Date().toISOString().split("T")[0],
            });
          }
        });
      }
    } catch (error) {
      console.error("Error creating bon livraison:", error);
      const errorMsg =
        error.response?.data?.message ||
        "Erreur lors de la création du bon de livraison";
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
        title="Nouveau Bon de Livraison"
        subtitle="Créer un nouveau bon de livraison"
        breadcrumb={[
          { label: "Dashboard", link: "/dashboard" },
          { label: "Bons de Livraison", link: "/bon-livraisons" },
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

      <div className="row">
        <div className="col-lg-8 mt-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <FiFileText className="me-2" />
                Informations du Bon
              </h5>
            </div>
            <div className="card-body">
              <form id="bonLivraisonForm" onSubmit={handleSubmit}>
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
                      value={clients.find((c) => c.value === formData.clientId)}
                      onChange={(selectedOption) =>
                        setFormData({
                          ...formData,
                          clientId: selectedOption?.value || "",
                        })
                      }
                      isSearchable
                      required
                      noOptionsMessage={() => "Aucun client trouvé"}
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: "45px",
                          borderColor: "#dee2e6",
                          "&:hover": {
                            borderColor: "#405189",
                          },
                        }),
                      }}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      <FiCreditCard className="me-2" />
                      Mode de Règlement <span className="text-danger">*</span>
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
                      required
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
                      Date de Livraison
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date_livraison}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          date_livraison: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      <FiPercent className="me-2" />
                      Remise Globale (DH)
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={formData.remise}
                        onChange={(e) =>
                          setFormData({ ...formData, remise: e.target.value })
                        }
                      />
                      <span className="input-group-text">DH</span>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showAdvancements"
                        checked={showAdvancements}
                        onChange={(e) => setShowAdvancements(e.target.checked)}
                      />
                      <label
                        className="form-check-label"
                        htmlFor="showAdvancements"
                      >
                        <FiCash className="me-2" />
                        Ajouter des acomptes
                      </label>
                    </div>
                  </div>

                  {showAdvancements && (
                    <div className="col-12 mt-3">
                      <div className="card border">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">
                            <FiCash className="me-2" />
                            Acomptes
                          </h6>
                        </div>
                        <div className="card-body">
                          {advancements.length === 0 ? (
                            <div className="text-center py-3">
                              <p className="text-muted">Aucun acompte ajouté</p>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={addAdvancement}
                              >
                                <FiPlus className="me-1" />
                                Ajouter un acompte
                              </button>
                            </div>
                          ) : (
                            <>
                              {advancements.map((advance, index) => (
                                <div
                                  key={advance.id}
                                  className="border rounded p-3 mb-3"
                                >
                                  <div className="row g-2">
                                    <div className="col-md-3">
                                      <label className="form-label">
                                        Montant (DH)
                                      </label>
                                      <div className="input-group">
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          className="form-control"
                                          value={advance.amount}
                                          onChange={(e) =>
                                            updateAdvancement(
                                              index,
                                              "amount",
                                              e.target.value,
                                            )
                                          }
                                          required
                                        />
                                        <span className="input-group-text">
                                          DH
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <label className="form-label">
                                        Méthode
                                      </label>
                                      <select
                                        className="form-select"
                                        value={advance.paymentMethod}
                                        onChange={(e) =>
                                          updateAdvancement(
                                            index,
                                            "paymentMethod",
                                            e.target.value,
                                          )
                                        }
                                        required
                                      >
                                        <option value="espece">Espèces</option>
                                        <option value="cheque">Chèque</option>
                                        <option value="virement">
                                          Virement
                                        </option>
                                        <option value="carte">Carte</option>
                                      </select>
                                    </div>
                                    <div className="col-md-3">
                                      <label className="form-label">
                                        Référence
                                      </label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        value={advance.reference}
                                        onChange={(e) =>
                                          updateAdvancement(
                                            index,
                                            "reference",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="N° chèque, référence..."
                                      />
                                    </div>
                                    <div className="col-md-2">
                                      <label className="form-label">Date</label>
                                      <input
                                        type="date"
                                        className="form-control"
                                        value={advance.paymentDate}
                                        onChange={(e) =>
                                          updateAdvancement(
                                            index,
                                            "paymentDate",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="col-md-1 d-flex align-items-end">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => removeAdvancement(index)}
                                        title="Supprimer"
                                      >
                                        <FiXCircle />
                                      </button>
                                    </div>
                                    <div className="col-12 mt-2">
                                      <label className="form-label">
                                        Notes
                                      </label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        value={advance.notes}
                                        onChange={(e) =>
                                          updateAdvancement(
                                            index,
                                            "notes",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Notes optionnelles..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <div className="d-flex justify-content-between">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={addAdvancement}
                                >
                                  <FiPlus className="me-1" />
                                  Ajouter un autre acompte
                                </button>
                                <small className="text-muted">
                                  Total acomptes:{" "}
                                  <strong>{totals.totalAdvancements} DH</strong>
                                </small>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="col-12 mt-3">
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
                <label className="form-label">
                  <FiSearch className="me-2" />
                  Rechercher et ajouter un produit
                </label>
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
                        <th width="30%">Produit</th>
                        <th width="15%" className="text-center">
                          Prix U.
                        </th>
                        <th width="20%" className="text-center">
                          Quantité
                        </th>
                        <th width="15%" className="text-center">
                          Remise
                        </th>
                        <th width="15%" className="text-center">
                          Total
                        </th>
                        <th width="5%" className="text-center">
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
                              <small
                                className={`${produit.quantite > produit.qty ? "text-danger" : "text-warning"}`}
                              >
                                Stock: {produit.qty} {produit.unite || "unité"}
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
                                max={produit.qty}
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
                                disabled={produit.quantite >= produit.qty}
                              >
                                <FiPlus size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="input-group input-group-sm">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-control text-center"
                                value={produit.remise_ligne}
                                onChange={(e) =>
                                  updateProduitDiscount(index, e.target.value)
                                }
                              />
                              <span className="input-group-text">DH</span>
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

        <div className="col-lg-4 mt-4">
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
                {advancements.length > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Acomptes:</span>
                    <strong>{advancements.length}</strong>
                  </div>
                )}
              </div>

              <hr />

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Sous-total:</span>
                  <strong>{totals.sousTotal} DH</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Remise globale:</span>
                  <strong className="text-danger">-{totals.remise} DH</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Montant HT:</span>
                  <strong>{totals.montantHT} DH</strong>
                </div>
              </div>

              <hr />

              {advancements.length > 0 && (
                <>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-primary">Total acomptes:</span>
                      <strong className="text-primary">
                        {totals.totalAdvancements} DH
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-success">Reste à payer:</span>
                      <strong className="text-success">
                        {totals.remaining} DH
                      </strong>
                    </div>
                  </div>
                  <hr />
                </>
              )}

              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0">Total TTC:</h5>
                <h3 className="mb-0 text-primary">{totals.montantTTC} DH</h3>
              </div>

              {advancements.length > 0 && (
                <div className="alert alert-info mb-3">
                  <strong>Statut paiement: </strong>
                  {parseFloat(totals.totalAdvancements) >=
                  parseFloat(totals.montantTTC)
                    ? "Payé"
                    : parseFloat(totals.totalAdvancements) > 0
                      ? "Partiellement payé"
                      : "Non payé"}
                </div>
              )}

              <div className="d-grid gap-2">
                <button
                  type="submit"
                  form="bonLivraisonForm"
                  className="btn btn-primary btn-lg"
                  disabled={loading || selectedProduits.length === 0}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <FiSave className="me-2" />
                      Créer le Bon de Livraison
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSelectedProduits([]);
                    setAdvancements([]);
                    setShowAdvancements(false);
                    setFormData({
                      clientId: formData.clientId,
                      mode_reglement: formData.mode_reglement,
                      remise: 0,
                      notes: "",
                      date_livraison: new Date().toISOString().split("T")[0],
                    });
                  }}
                  disabled={
                    selectedProduits.length === 0 && advancements.length === 0
                  }
                >
                  <FiX className="me-2" />
                  Réinitialiser
                </button>
                <button
                  type="button"
                  className="btn btn-outline-info"
                  onClick={fetchAllProduits}
                  disabled={loadingProduits}
                >
                  <FiRefreshCw
                    className={`me-2 ${loadingProduits ? "spinner-border spinner-border-sm" : ""}`}
                  />
                  {loadingProduits
                    ? "Chargement..."
                    : "Actualiser les produits"}
                </button>
              </div>
            </div>
            <div className="card-footer">
              <small className="text-muted">
                <FiCheck className="me-1" />
                Le stock sera automatiquement déduit après création
              </small>
            </div>
          </div>

          {selectedProduits.some((p) => p.quantite > p.qty) && (
            <div className="alert alert-warning mt-3">
              <strong>Attention!</strong> Certains produits dépassent le stock
              disponible. Veuillez ajuster les quantités.
            </div>
          )}

          <div className="card mt-3">
            <div className="card-body">
              <h6 className="card-title">
                <FiCreditCard className="me-2" />
                Mode de Règlement sélectionné
              </h6>
              <div className="alert alert-info mb-0">
                <strong>{formData.mode_reglement}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BonLivraisonCreate;
