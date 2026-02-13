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
  FiSearch,
  FiPercent,
  FiDollarSign,
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiSave,
  FiX,
  FiCheck,
  FiXCircle,
  FiPercent as FiPercentIcon,
  FiTag,
  FiList,
} from "react-icons/fi";
import { Input } from "reactstrap";

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import api from "@/utils/axiosConfig";
import { format, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";

const MySwal = withReactContent(Swal);

const statusOptions = [
  { value: "brouillon", label: "Non Payé" },
  { value: "payée", label: "Payé" },
  { value: "partiellement_payée", label: "Partiellement Payé" },
];

const FactureCreate = () => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [allProduits, setAllProduits] = useState([]);
  const [selectedProduits, setSelectedProduits] = useState([]);
  const [bonLivraisons, setBonLivraisons] = useState([]);
  const [showAdvancements, setShowAdvancements] = useState(false);
  const [advancements, setAdvancements] = useState([]);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [loadingBonLivraisons, setLoadingBonLivraisons] = useState(false);
  const [showBonLivraisonSelection, setShowBonLivraisonSelection] =
    useState(false);

  const [formData, setFormData] = useState({
    client_id: "",
    bon_livraison_id: "",
    mode_reglement: "espèces",
    status: "brouillon",

    tva: 20, // TVA rate in percentage
    notes: "",
    date_facturation: "",
    date_echeance: "",
  });

  const selectRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
    fetchAllProduits();

    const today = new Date().toISOString().split("T")[0];
    const dateEcheance = addDays(new Date(), 30).toISOString().split("T")[0];

    setFormData((prev) => ({
      ...prev,
      date_facturation: today,
      date_echeance: dateEcheance,
    }));
  }, []);

  useEffect(() => {
    if (formData.client_id) {
      fetchBonLivraisonsByClient(formData.client_id);
    } else {
      setBonLivraisons([]);
    }
  }, [formData.client_id]);

  const fetchClients = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const clientOptions = (response.data?.clients || []).map((client) => {
        const refPart = client.reference ? `(${client.reference}) ` : "";
        return {
          value: client.id,
          label: `${refPart}${client.nom_complete}${client.telephone ? ` - ${client.telephone}` : ""}`,
          searchText: [
            client.nom_complete?.toLowerCase() || "",
            client.telephone?.toLowerCase() || "",
            client.reference?.toLowerCase() || "",
          ].join(" "),
          ...client,
        };
      });
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

  const fetchBonLivraisonsByClient = async (clientId) => {
    try {
      setLoadingBonLivraisons(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(
        `${config_url}/api/bonlivraisons?clientId=${clientId}&statut=livré`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const bonLivraisonOptions = (response.data?.bons || []).map((bl) => ({
        value: bl.id,
        label: `${bl.num_bon_livraison} - ${format(new Date(bl.date_creation), "dd/MM/yyyy")} - ${bl.montant_ttc} DH`,
        data: bl,
      }));

      setBonLivraisons(bonLivraisonOptions);
    } catch (error) {
      console.error("Error fetching bon livraisons:", error);
    } finally {
      setLoadingBonLivraisons(false);
    }
  };

  const loadProduits = async (inputValue) => {
    if (!inputValue) {
      return allProduits;
    }

    const filtered = allProduits.filter((option) => {
      const searchTerm = inputValue.toLowerCase();
      const produit = option.data;
      return (
        produit.reference?.toLowerCase().includes(searchTerm) ||
        produit.designation?.toLowerCase().includes(searchTerm) ||
        produit.categorie?.toLowerCase().includes(searchTerm)
      );
    });

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

  const loadProduitsFromBonLivraison = async (bonLivraisonId) => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(
        `${config_url}/api/bonlivraisons/${bonLivraisonId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success && response.data.bon.produits) {
        const produitsFromBL = response.data.bon.produits.map((produit) => ({
          ...produit,
          quantite: produit.BonLivraisonProduit.quantite,
          prix_unitaire: produit.BonLivraisonProduit.prix_unitaire,
          total_ligne: produit.BonLivraisonProduit.total_ligne,
        }));

        setSelectedProduits(produitsFromBL);

        // Mettre à jour les notes avec les infos du BL
        const blInfo = `Facture basée sur le bon de livraison ${response.data.bon.num_bon_livraison}`;
        setFormData((prev) => ({
          ...prev,
          notes: blInfo,
        }));

        topTost(
          `Produits chargés depuis le bon de livraison ${response.data.bon.num_bon_livraison}`,
          "success",
        );
      }
    } catch (error) {
      console.error("Error loading produits from BL:", error);
      topTost(
        "Erreur lors du chargement des produits du bon de livraison",
        "error",
      );
    }
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
          total_ligne: produitData.prix_vente, // C'est le HT
        };

        setSelectedProduits((prev) => [...prev, newProduit]);
      });

      if (selectRef.current) {
        selectRef.current.setValue(null);
      }

      if (selectedOptions.length > 0) {
        topTost(`${selectedOptions.length} produit(s) ajouté(s)`, "success");
      }
    } else {
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
        total_ligne: produitData.prix_vente, // C'est le HT
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

  const addAdvancement = () => {
    const newAdvancement = {
      id: Date.now(),
      amount: "",
      paymentMethod: "espece",
      reference: "",
      notes: "",
      type: "paiement",
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
          "Le total des paiements ne peut pas dépasser le montant TTC",
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
    // Calculate total HT from products (after line discounts)
    const totalHT = selectedProduits.reduce(
      (sum, p) => sum + (p.total_ligne || 0),
      0,
    );

    // Calculate total discount based on type (amount or percentage)

    const montantHTAfterRemise = Math.max(totalHT, 0);

    // Calculate VAT on HT after discount
    const tauxTVA = parseFloat(formData.tva) || 0;
    const montantTVA = (montantHTAfterRemise * tauxTVA) / 100;

    const montantTTC = montantHTAfterRemise + montantTVA;

    // Calculate advancements, separating acomptes from other payments
    const totalAdvancements = advancements.reduce((total, advance) => {
      return total + (parseFloat(advance.amount) || 0);
    }, 0);

    // Calculate total acomptes (advances)
    const totalAcomptes = advancements.reduce((total, advance) => {
      if (advance.type === "acompte") {
        return total + (parseFloat(advance.amount) || 0);
      }
      return total;
    }, 0);

    // Calculate total other payments
    const totalOtherPayments = advancements.reduce((total, advance) => {
      if (advance.type !== "acompte") {
        return total + (parseFloat(advance.amount) || 0);
      }
      return total;
    }, 0);

    // For TTC calculation: subtotal is initial TTC minus acomptes
    // Acomptes are considered as advance payments that reduce the total
    const ttcAfterAcomptes = Math.max(montantTTC - totalAcomptes, 0);

    // Remaining after all payments (including acomptes)
    const remaining = Math.max(montantTTC - totalAdvancements, 0);

    return {
      totalHT: totalHT.toFixed(2),
      tauxTVA: tauxTVA.toFixed(2),
      montantTVA: montantTVA.toFixed(2),
      montantTTC: montantTTC.toFixed(2),
      totalAdvancements: totalAdvancements.toFixed(2),
      totalAcomptes: totalAcomptes.toFixed(2),
      totalOtherPayments: totalOtherPayments.toFixed(2),
      ttcAfterAcomptes: ttcAfterAcomptes.toFixed(2), // TTC after acomptes applied
      remaining: remaining.toFixed(2), // Final remaining after all payments
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

    if (!formData.date_facturation || !formData.date_echeance) {
      topTost("Les dates de facturation et d'échéance sont requises", "error");
      return;
    }

    const totalAdvancements = calculateTotalAdvancements();
    const totalTTC = parseFloat(totals.montantTTC);

    if (totalAdvancements > totalTTC) {
      topTost(
        "Le total des paiements ne peut pas dépasser le montant TTC",
        "error",
      );
      return;
    }

    for (const advance of advancements) {
      if (!advance.amount || parseFloat(advance.amount) <= 0) {
        topTost("Tous les paiements doivent avoir un montant positif", "error");
        return;
      }
      if (!advance.paymentMethod) {
        topTost("Méthode de paiement requise pour tous les paiements", "error");
        return;
      }
    }

    const advancementsData = advancements.map((advance) => ({
      amount: parseFloat(advance.amount),
      paymentMethod: advance.paymentMethod,
      reference: advance.reference || null,
      notes: advance.notes || null,
      type: advance.type || "paiement",
      paymentDate:
        advance.paymentDate || new Date().toISOString().split("T")[0],
    }));

    const payload = {
      client_id: formData.client_id,
      bon_livraison_id: formData.bon_livraison_id || null,
      mode_reglement: formData.mode_reglement,
      status: formData.status,

      tva: parseFloat(formData.tva) || 0,
      notes: formData.notes,
      date_facturation: formData.date_facturation,
      date_echeance: formData.date_echeance,
      produits: selectedProduits.map((p) => ({
        produitId: p.id,
        quantite: p.quantite,
        prix_unitaire: p.prix_unitaire,
        description: p.designation,
      })),
      advancements: advancementsData.length > 0 ? advancementsData : undefined,
    };

    const result = await MySwal.fire({
      title: "Créer la facture ?",
      html: `
        <div class="text-start">
          <p><strong>Client:</strong> ${clients.find((c) => c.value === formData.client_id)?.label || "Non spécifié"}</p>
          <p><strong>TVA (${totals.tauxTVA}%):</strong> ${totals.montantTVA} DH</p>
          <p><strong>Montant TTC:</strong> ${totals.montantTTC} DH</p>
          ${
            advancements.length > 0
              ? `
            <p><strong>Paiements:</strong> ${totals.totalAdvancements} DH</p>
            <p><strong>Reste à payer:</strong> ${totals.remaining} DH</p>
          `
              : ""
          }
          <p><strong>Nombre de produits:</strong> ${selectedProduits.length}</p>
          <p><strong>Total articles:</strong> ${selectedProduits.reduce((sum, p) => sum + p.quantite, 0)}</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, créer",
      cancelButtonText: "Annuler",
      width: "600px",
    });

    if (!result.isConfirmed) return;

    setLoading(true);

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await api.post("/api/factures", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        MySwal.fire({
          title: "Succès !",
          text: "Facture créée avec succès",
          icon: "success",
          html: `
            <div class="text-start">
              <p><strong>Numéro:</strong> ${
                response.data.facture.num_facture
              }</p>
              <p><strong>Total HT avant remise:</strong> ${
                response.data.facture.montant_ht_initial || totals.totalHT
              } DH</p>
              <p><strong>TVA (${response.data.facture.tva}%):</strong> ${response.data.facture.montant_tva} DH</p>
              <p><strong>Montant TTC:</strong> ${
                response.data.facture.montant_ttc
              } DH</p>
              ${
                advancements.length > 0
                  ? `
                  <p><strong>Paiements:</strong> ${response.data.facture.montant_paye} DH</p>
                  <p><strong>Reste à payer:</strong> ${response.data.facture.montant_restant} DH</p>
                  <p><strong>Statut:</strong> ${response.data.facture.status}</p>
                `
                  : ""
              }
            </div>
          `,
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: "Voir la facture",
          denyButtonText: "Imprimer",
          cancelButtonText: "Nouvelle facture",
        }).then((result) => {
          if (result.isConfirmed) {
            navigate(`/factures/${response.data.facture.id}`);
          } else if (result.isDenied) {
            // Gérer l'impression ici
            window.open(
              `/factures/${response.data.facture.id}/print`,
              "_blank",
            );
            // Réinitialiser le formulaire
            resetForm();
          } else {
            resetForm();
          }
        });
      }
    } catch (error) {
      console.error("Error creating facture:", error);
      const errorMsg =
        error.response?.data?.message ||
        "Erreur lors de la création de la facture";
      topTost(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProduits([]);
    setAdvancements([]);
    setShowAdvancements(false);
    setShowBonLivraisonSelection(false);
    setBonLivraisons([]);
    setFormData({
      client_id: formData.client_id, // Garder le même client
      bon_livraison_id: "",
      mode_reglement: "espèces",
      status: "brouillon",
      tva: 20,
      notes: "",
      date_facturation: new Date().toISOString().split("T")[0],
      date_echeance: addDays(new Date(), 30).toISOString().split("T")[0],
    });
  };

  const handleBonLivraisonSelect = (selectedOption) => {
    if (!selectedOption) {
      setFormData((prev) => ({ ...prev, bon_livraison_id: "" }));
      setSelectedProduits([]);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      bon_livraison_id: selectedOption.value,
    }));
    loadProduitsFromBonLivraison(selectedOption.value);
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
        title="Nouvelle Facture"
        subtitle="Créer une nouvelle facture"
        breadcrumb={[
          { label: "Dashboard", link: "/dashboard" },
          { label: "Factures", link: "/factures" },
          { label: "Nouvelle", active: true },
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
            <div className="card-body">
              <form id="factureForm" onSubmit={handleSubmit}>
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
                      // ─── Add this ───────────────────────────────────────
                      filterOption={(option, rawInput) => {
                        if (!rawInput) return true;
                        const search = rawInput.toLowerCase().trim();
                        return option.data.searchText.includes(search);
                      }}
                      // ─────────────────────────────────────────────────────

                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: "45px",
                          borderColor: "#dee2e6",
                          "&:hover": { borderColor: "#405189" },
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
                      <option value="chèque">Chèque</option>
                      <option value="virement">Virement</option>
                    </select>
                  </div>

                  {showBonLivraisonSelection && (
                    <div className="col-md-6">
                      <label className="form-label">
                        <FiList className="me-2" />
                        Bon de Livraison (optionnel)
                      </label>
                      <Select
                        options={bonLivraisons}
                        className="react-select"
                        classNamePrefix="react-select"
                        placeholder="Sélectionner un bon de livraison"
                        value={bonLivraisons.find(
                          (bl) => bl.value === formData.bon_livraison_id,
                        )}
                        onChange={handleBonLivraisonSelect}
                        isLoading={loadingBonLivraisons}
                        isClearable
                        noOptionsMessage={() =>
                          "Aucun bon de livraison disponible"
                        }
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
                      <small className="text-muted">
                        Sélectionnez un bon de livraison pour charger
                        automatiquement les produits
                      </small>
                    </div>
                  )}

                  <div className="col-md-3">
                    <label className="form-label">
                      Date de Facturation <span className="text-danger">*</span>
                    </label>

                    <div className="input-group">
                      {/* Visible formatted input */}
                      <input
                        type="text"
                        className="form-control"
                        placeholder="dd/MM/yyyy"
                        value={
                          formData.date_facturation
                            ? new Date(
                                formData.date_facturation,
                              ).toLocaleDateString("fr-FR")
                            : ""
                        }
                        readOnly
                        onClick={() =>
                          document.getElementById("real-date").showPicker()
                        }
                      />

                      {/* Icon inside input */}
                      <span
                        className="input-group-text"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          document.getElementById("real-date").showPicker()
                        }
                      >
                        <FiCalendar />
                      </span>
                    </div>

                    {/* Real hidden date input */}
                    <input
                      id="real-date"
                      type="date"
                      className="d-none"
                      value={formData.date_facturation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          date_facturation: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      <FiPercent className="me-2" />
                      Taux de TVA (%)
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="form-control"
                        value={formData.tva}
                        onChange={(e) =>
                          setFormData({ ...formData, tva: e.target.value })
                        }
                      />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group mb-3">
                      <label className="form-label">
                        <FiCreditCard className="me-2" />
                        Statut
                      </label>
                      <Input
                        type="select"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value,
                          })
                        }
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Input>
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
                        <FiDollarSign className="me-2" />
                        Ajouter Paiement (التسبيقات)
                      </label>
                    </div>
                  </div>

                  {showAdvancements && (
                    <div className="col-12 mt-3">
                      <div className="card border">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">
                            <FiDollarSign className="me-2" />
                            Paiements (التسبيقات)
                          </h6>
                        </div>
                        <div className="card-body">
                          {advancements.length === 0 ? (
                            <div className="text-center py-3">
                              <p className="text-muted">
                                Aucun paiement ajouté
                              </p>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={addAdvancement}
                              >
                                <FiPlus className="me-1" />
                                Ajouter un paiement
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
                                    <div className="col-md-2">
                                      <label className="form-label">Type</label>
                                      <select
                                        className="form-select"
                                        value={advance.type}
                                        onChange={(e) =>
                                          updateAdvancement(
                                            index,
                                            "type",
                                            e.target.value,
                                          )
                                        }
                                      >
                                        <option value="paiement">
                                          Paiement
                                        </option>
                                        <option value="acompte">Acompte</option>
                                        <option value="avoir">Avoir</option>
                                      </select>
                                    </div>
                                    <div className="col-md-2">
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
                                    <div className="col-md-2">
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
                                  Ajouter un autre paiement
                                </button>
                                <small className="text-muted">
                                  Total paiements:{" "}
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
                          Remise Ligne
                        </th>
                        <th width="15%" className="text-center">
                          Total Ligne HT
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
                              {produit.qty && (
                                <small
                                  className={`${produit.quantite > produit.qty ? "text-danger" : "text-warning"}`}
                                >
                                  Stock: {produit.qty}{" "}
                                  {produit.unite || "unité"}
                                </small>
                              )}
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
                    Recherchez et ajoutez des produits dans le champ ci-dessus,
                    ou sélectionnez un bon de livraison pour charger
                    automatiquement les produits
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
                Informations Facture
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
                    <span className="text-muted">Paiements:</span>
                    <strong>{advancements.length}</strong>
                  </div>
                )}
                {formData.bon_livraison_id && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Basé sur BL:</span>
                    <strong className="text-info">Oui</strong>
                  </div>
                )}
              </div>

              <hr />

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Total HT avant remise:</span>
                  <strong>{totals.totalHT} DH</strong>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span>Remise globale:</span>
                  <strong className="text-danger">
                    -{totals.remiseMontant} DH
                    {formData.remise_total_type === "pourcentage" &&
                      formData.remise_total > 0 &&
                      ` (${formData.remise_total}%)`}
                  </strong>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span>HT après remise:</span>
                  <strong>{totals.montantHTAfterRemise} DH</strong>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-success">TVA ({totals.tauxTVA}%):</span>
                  <strong className="text-success">
                    {totals.montantTVA} DH
                  </strong>
                </div>
              </div>

              <hr />

              {/* In the Récapitulatif Facture section */}
              {advancements.length > 0 && (
                <>
                  <div className="mb-3">
                    {totals.totalAcomptes !== "0.00" && (
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-info">Total paiements:</span>
                        <strong className="text-info">
                          -{totals.totalAcomptes} DH
                        </strong>
                      </div>
                    )}

                    {totals.totalOtherPayments !== "0.00" && (
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-success">Autres paiements:</span>
                        <strong className="text-success">
                          {totals.totalOtherPayments} DH
                        </strong>
                      </div>
                    )}

                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-primary">Total paiements:</span>
                      <strong className="text-primary">
                        {totals.totalAdvancements} DH
                      </strong>
                    </div>

                    {totals.totalAcomptes !== "0.00" && (
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-warning">
                          TTC après paiements:
                        </span>
                        <strong className="text-warning">
                          {totals.ttcAfterAcomptes} DH
                        </strong>
                      </div>
                    )}

                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-warning">Reste à payer:</span>
                      <strong className="text-warning">
                        {totals.remaining} DH
                      </strong>
                    </div>
                  </div>
                  <hr />
                </>
              )}

              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0">
                  {totals.totalAcomptes !== "0.00"
                    ? "Total TTC initial:"
                    : "Total TTC:"}
                </h5>
                <h3 className="mb-0 text-primary">
                  {totals.montantTTC} DH
                  {totals.totalAcomptes !== "0.00" && (
                    <small className="text-muted d-block fs-6">
                      → {totals.ttcAfterAcomptes} DH après paiements
                    </small>
                  )}
                </h3>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0">Total TTC:</h5>
                <h3 className="mb-0 text-primary">{totals.montantTTC} DH</h3>
              </div>

              {advancements.length > 0 && (
                <div className="alert alert-info mb-3">
                  <strong>Statut paiement: </strong>
                  {parseFloat(totals.totalAdvancements) >=
                  parseFloat(totals.montantTTC)
                    ? "Payée"
                    : parseFloat(totals.totalAdvancements) > 0
                      ? "Partiellement payée"
                      : "Impayée"}
                </div>
              )}

              <div className="mb-3">
                <div className="alert alert-light">
                  <div className="d-flex justify-content-between">
                    <span>Date facturation:</span>
                    <strong>{formData.date_facturation}</strong>
                  </div>
                </div>
              </div>

              <div className="d-grid gap-2">
                <button
                  type="submit"
                  form="factureForm"
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
                      Créer la Facture
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="card-footer">
              <small className="text-muted">
                <FiCheck className="me-1" />
                TVA appliquée sur le total HT après remise
              </small>
            </div>
          </div>

          {formData.bon_livraison_id && (
            <div className="card mt-3 border-info">
              <div className="card-header bg-info text-white">
                <h6 className="mb-0">
                  <FiTag className="me-2" />
                  Lié au Bon de Livraison
                </h6>
              </div>
              <div className="card-body">
                <p className="mb-2">
                  <strong>BL N°:</strong>{" "}
                  {
                    bonLivraisons
                      .find((bl) => bl.value === formData.bon_livraison_id)
                      ?.label?.split(" - ")[0]
                  }
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, bon_livraison_id: "" }));
                    setSelectedProduits([]);
                  }}
                >
                  Délier le BL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FactureCreate;
