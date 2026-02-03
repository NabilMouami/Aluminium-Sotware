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
  FiDollarSign,
  FiFileText,
  FiSave,
  FiX,
  FiXCircle,
  FiChevronDown,
  FiChevronUp,
  FiClipboard,
} from "react-icons/fi";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import api from "@/utils/axiosConfig";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const MySwal = withReactContent(Swal);

const BonAvoirCreate = () => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [bonsLivraison, setBonsLivraison] = useState([]);
  const [allProduits, setAllProduits] = useState([]);
  const [selectedProduits, setSelectedProduits] = useState([]);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [showBonLivraisonDetails, setShowBonLivraisonDetails] = useState(true);
  const [selectedBonLivraison, setSelectedBonLivraison] = useState(null);
  const [bonLivraisonProduits, setBonLivraisonProduits] = useState([]);

  const [formData, setFormData] = useState({
    clientId: "",
    bonLivraisonId: "",
    motif: "retour_produit",
    notes: "",
  });

  const selectRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
    fetchAllProduits();
    const today = new Date().toISOString().split("T")[0];
    setFormData((prev) => ({ ...prev, date: today }));
  }, []);

  // Charger les bons de livraison quand un client est sélectionné
  useEffect(() => {
    if (formData.clientId) {
      fetchBonsLivraisonClient(formData.clientId);
    } else {
      setBonsLivraison([]);
      setSelectedBonLivraison(null);
      setBonLivraisonProduits([]);
      setFormData((prev) => ({ ...prev, bonLivraisonId: "" }));
    }
  }, [formData.clientId]);

  // Charger les produits d'un bon de livraison quand il est sélectionné
  useEffect(() => {
    if (formData.bonLivraisonId) {
      fetchBonLivraisonProduits(formData.bonLivraisonId);
    } else {
      setBonLivraisonProduits([]);
      setSelectedBonLivraison(null);
    }
  }, [formData.bonLivraisonId]);

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
  const fetchBonsLivraisonClient = async (clientId) => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(
        `${config_url}/api/bon-livraisons/client/${clientId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const options = (response.data?.bons || []).map((bl) => ({
        value: bl.id,
        label: `${bl.num_bon_livraison} - ${format(new Date(bl.date_creation), "dd/MM/yyyy")} - ${bl.montant_ttc} DH`,
        data: bl,
      }));

      setBonsLivraison(options);
    } catch (error) {
      console.error("Error fetching bon livraison:", error);
      topTost("Erreur lors du chargement des bons de livraison", "error");
    }
  };

  const fetchBonLivraisonProduits = async (bonLivraisonId) => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(
        `${config_url}/api/bon-livraisons/${bonLivraisonId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        const bon = response.data.bon;
        setSelectedBonLivraison(bon);

        // Extraire les produits avec leurs quantités vendues
        const produits =
          bon.produits?.map((produit) => {
            const blProduit = produit.BonLivraisonProduit || {};
            return {
              id: produit.id,
              reference: produit.reference,
              designation: produit.designation,
              prix_vente: produit.prix_vente,
              qty: produit.qty, // Stock actuel
              quantite_vendue: blProduit.quantite || 1,
              prix_unitaire_vendu:
                blProduit.prix_unitaire || produit.prix_vente,
              remise_ligne_vendu: blProduit.remise_ligne || 0,
              total_ligne_vendu: blProduit.total_ligne || produit.prix_vente,
              bonLivraisonProduitId: blProduit.id, // Si disponible
            };
          }) || [];

        setBonLivraisonProduits(produits);
      }
    } catch (error) {
      console.error("Error fetching bon livraison produits:", error);
      topTost("Erreur lors du chargement des produits du bon", "error");
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

  // Ajouter un produit à partir du bon de livraison
  const addProduitFromBonLivraison = (produit) => {
    if (selectedProduits.some((p) => p.id === produit.id)) {
      topTost("Produit déjà ajouté", "warning");
      return;
    }

    const newProduit = {
      ...produit,
      quantite: 1,
      prix_unitaire: produit.prix_vente,
      remise_ligne: 0,
      total_ligne: produit.prix_vente,
      quantite_max: produit.quantite_vendue, // Quantité maximum qu'on peut retourner
    };

    setSelectedProduits((prev) => [...prev, newProduit]);
    topTost("Produit ajouté", "success");
  };

  // Ajouter un produit manuellement
  const handleProduitSelect = (selectedOption) => {
    if (!selectedOption) return;

    if (selectedProduits.some((p) => p.id === selectedOption.value)) {
      topTost("Produit déjà ajouté", "warning");

      if (selectRef.current) {
        selectRef.current.setValue(null);
      }
      return;
    }

    const produitData = selectedOption.data;
    const newProduit = {
      ...produitData,
      quantite: 1,
      prix_unitaire: produitData.prix_vente,
      remise_ligne: 0,
      total_ligne: produitData.prix_vente,
      quantite_max: null, // Pas de limite si ajout manuel
    };

    setSelectedProduits((prev) => [...prev, newProduit]);

    if (selectRef.current) {
      selectRef.current.setValue(null);
    }

    topTost("Produit ajouté", "success");
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

    // Vérifier la limite si c'est un retour de bon de livraison
    if (produit.quantite_max && newQuantity > produit.quantite_max) {
      topTost(
        `Quantité maximum: ${produit.quantite_max} (quantité vendue)`,
        "warning",
      );
      return;
    }

    // Vérifier le stock pour les retours
    if (formData.motif === "retour_produit") {
      // Pas besoin de vérifier le stock pour les retours
    } else if (newQuantity > produit.qty) {
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

  const calculateTotals = () => {
    const montantTotal = selectedProduits.reduce(
      (sum, p) => sum + p.total_ligne,
      0,
    );

    return {
      montantTotal: montantTotal?.toFixed(2),
      nombreProduits: selectedProduits.length,
      totalQuantites: selectedProduits.reduce((sum, p) => sum + p.quantite, 0),
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.clientId && !formData.bonLivraisonId) {
      topTost(
        "Veuillez sélectionner un client ou un bon de livraison",
        "error",
      );
      return;
    }

    if (selectedProduits.length === 0) {
      topTost("Veuillez ajouter au moins un produit", "error");
      return;
    }

    if (!formData.motif) {
      topTost("Veuillez sélectionner un motif", "error");
      return;
    }

    // Validation des quantités pour les retours
    if (formData.motif === "retour_produit") {
      for (const produit of selectedProduits) {
        if (produit.quantite_max && produit.quantite > produit.quantite_max) {
          topTost(
            `Quantité de retour supérieure à la quantité vendue pour ${produit.designation}. Maximum: ${produit.quantite_max}`,
            "error",
          );
          return;
        }
      }
    }

    // Préparer les données des produits
    const produitsData = selectedProduits.map((p) => ({
      produitId: p.id,
      quantite: p.quantite,
      prix_unitaire: p.prix_unitaire,
      remise_ligne: p.remise_ligne,
      bonLivraisonProduitId: p.bonLivraisonProduitId || null,
    }));

    const payload = {
      clientId: formData.clientId || null,
      bonLivraisonId: formData.bonLivraisonId || null,
      motif: formData.motif,
      notes: formData.notes,
      produits: produitsData,
    };

    const result = await MySwal.fire({
      title: "Créer le bon d'avoir ?",
      html: `
        <div class="text-start">
          <p><strong>Montant total:</strong> ${totals.montantTotal} DH</p>
          <p><strong>Motif:</strong> ${formData.motif.replace("_", " ")}</p>
          <p><strong>Nombre de produits:</strong> ${totals.nombreProduits}</p>
          <p><strong>Total articles:</strong> ${totals.totalQuantites}</p>
          ${formData.bonLivraisonId ? `<p><strong>Basé sur:</strong> ${selectedBonLivraison?.num_bon_livraison}</p>` : ""}
          <p><strong>Client:</strong> ${clients.find((c) => c.value === formData.clientId)?.label || "Non spécifié"}</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, créer",
      cancelButtonText: "Annuler",
      focusConfirm: false,
    });

    if (!result.isConfirmed) return;

    setLoading(true);

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await api.post(`${config_url}/api/bon-avoirs`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        MySwal.fire({
          title: "Succès !",
          text: "Bon d'avoir créé avec succès",
          icon: "success",
          html: `
            <div class="text-start">
              <p><strong>Numéro:</strong> ${response.data.bon.num_bon_avoir}</p>
              <p><strong>Montant total:</strong> ${response.data.bon.montant_total} DH</p>
              <p><strong>Motif:</strong> ${response.data.bon.motif}</p>
              <p><strong>Statut:</strong> ${response.data.bon.status}</p>
            </div>
          `,
          confirmButtonText: "Voir le bon",
          showCancelButton: true,
          cancelButtonText: "Nouveau bon",
        }).then((result) => {
          if (result.isConfirmed) {
            navigate(`/bon-avoirs/${response.data.bon.id}`);
          } else {
            resetForm();
          }
        });
      }
    } catch (error) {
      console.error("Error creating bon avoir:", error);
      const errorMsg =
        error.response?.data?.message ||
        "Erreur lors de la création du bon d'avoir";
      topTost(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProduits([]);
    setSelectedBonLivraison(null);
    setBonLivraisonProduits([]);
    setBonsLivraison([]);
    setShowBonLivraisonDetails(false);
    setFormData({
      clientId: "",
      bonLivraisonId: "",
      motif: "retour_produit",
      notes: "",
      date: new Date().toISOString().split("T")[0],
    });
    if (selectRef.current) {
      selectRef.current.setValue(null);
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
        title="Nouveau Bon d'Avoir"
        subtitle="Créer un nouveau bon d'avoir (note de crédit)"
        breadcrumb={[
          { label: "Dashboard", link: "/dashboard" },
          { label: "Bons d'Avoir", link: "/bon-avoirs" },
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
                <FiFileText className="me-2" />
                Informations du Bon d'Avoir
              </h5>
            </div>
            <div className="card-body">
              <form id="bonAvoirForm" onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      <FiUser className="me-2" />
                      Client
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
                    />{" "}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      <FiClipboard className="me-2" />
                      Bon de Livraison (origine)
                    </label>
                    <Select
                      options={bonsLivraison}
                      className="react-select"
                      classNamePrefix="react-select"
                      placeholder="Sélectionner un bon de livraison"
                      value={bonsLivraison.find(
                        (bl) => bl.value === formData.bonLivraisonId,
                      )}
                      onChange={(selectedOption) =>
                        setFormData({
                          ...formData,
                          bonLivraisonId: selectedOption?.value || "",
                          clientId:
                            selectedOption?.data?.client_id ||
                            formData.clientId,
                        })
                      }
                      isSearchable
                      isDisabled={!formData.clientId}
                      noOptionsMessage={() =>
                        formData.clientId
                          ? "Aucun bon de livraison trouvé"
                          : "Sélectionnez d'abord un client"
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
                  </div>

                  {formData.bonLivraisonId && selectedBonLivraison && (
                    <div className="col-12">
                      <div className="card border">
                        <div className="card-header bg-light">
                          <div className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">
                              <FiClipboard className="me-2" />
                              Détails du Bon de Livraison
                              <span className="ms-2 badge bg-primary">
                                {selectedBonLivraison.num_bon_livraison}
                              </span>
                            </h6>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() =>
                                setShowBonLivraisonDetails(
                                  !showBonLivraisonDetails,
                                )
                              }
                            >
                              {showBonLivraisonDetails ? (
                                <FiChevronUp />
                              ) : (
                                <FiChevronDown />
                              )}
                            </button>
                          </div>
                        </div>
                        {showBonLivraisonDetails && (
                          <div className="card-body">
                            <div className="row">
                              <div className="col-md-6">
                                <p>
                                  <strong>Date:</strong>{" "}
                                  {format(
                                    new Date(
                                      selectedBonLivraison.date_creation,
                                    ),
                                    "dd/MM/yyyy",
                                  )}
                                </p>
                                <p>
                                  <strong>Montant TTC:</strong>{" "}
                                  {selectedBonLivraison.montant_ttc} DH
                                </p>
                              </div>
                              <div className="col-md-6">
                                <p>
                                  <strong>Mode règlement:</strong>{" "}
                                  {selectedBonLivraison.mode_reglement}
                                </p>
                                <p>
                                  <strong>Statut:</strong>{" "}
                                  {selectedBonLivraison.status}
                                </p>
                              </div>
                            </div>

                            {bonLivraisonProduits.length > 0 && (
                              <div className="mt-3">
                                <h6>Produits vendus:</h6>
                                <div className="table-responsive">
                                  <table className="table table-sm">
                                    <thead>
                                      <tr>
                                        <th>Produit</th>
                                        <th className="text-center">
                                          Qté vendue
                                        </th>
                                        <th className="text-center">
                                          Prix unit.
                                        </th>
                                        <th className="text-center">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {bonLivraisonProduits.map(
                                        (produit, index) => (
                                          <tr key={produit.id}>
                                            <td>
                                              <strong>
                                                {produit.reference}
                                              </strong>
                                              <br />
                                              <small>
                                                {produit.designation}
                                              </small>
                                            </td>
                                            <td className="text-center">
                                              {produit.quantite_vendue}
                                            </td>
                                            <td className="text-center">
                                              {produit.prix_unitaire_vendu} DH
                                            </td>
                                            <td className="text-center">
                                              {produit.total_ligne_vendu} DH
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="col-12">
                    <div className="card mt-3">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <FiSearch className="me-2" />
                          Ajouter des produits manuellement
                        </h6>
                      </div>
                      <div className="card-body">
                        {loadingProduits ? (
                          <div className="text-center py-3">
                            <div
                              className="spinner-border text-primary"
                              role="status"
                            >
                              <span className="visually-hidden">
                                Chargement...
                              </span>
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
                            placeholder="Rechercher un produit à ajouter..."
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
                                <div className="font-semibold">
                                  {option.label}
                                </div>
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
                        <small className="text-muted mt-2 d-block">
                          Utilisez ce champ pour ajouter des produits non liés à
                          un bon de livraison
                        </small>
                      </div>
                    </div>
                  </div>

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
                      placeholder="Notes supplémentaires (raison du bon d'avoir, détails...)"
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
                Produits du Bon d'Avoir
              </h5>
            </div>
            <div className="card-body">
              {selectedProduits.length > 0 ? (
                <div className="table-responsive">
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
                              {produit.quantite_max && (
                                <small className="text-info d-block">
                                  <FiClipboard className="me-1" />
                                  Max: {produit.quantite_max} (vendu)
                                </small>
                              )}
                              {formData.motif !== "retour_produit" && (
                                <small className="text-warning d-block">
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
                                max={produit.quantite_max || produit.qty}
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
                                disabled={
                                  produit.quantite >=
                                  (produit.quantite_max || produit.qty)
                                }
                              >
                                <FiPlus size={12} />
                              </button>
                            </div>
                            {produit.quantite_max && (
                              <small className="text-muted">
                                Vendus: {produit.quantite_max}
                              </small>
                            )}
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
                              {produit.total_ligne?.toFixed(2)} DH
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
                    {formData.bonLivraisonId
                      ? "Sélectionnez des produits dans le bon de livraison ou ajoutez-les manuellement"
                      : "Ajoutez des produits manuellement"}
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
                Informations
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Nombre de produits:</span>
                  <strong>{totals.nombreProduits}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Articles totaux:</span>
                  <strong>{totals.totalQuantites}</strong>
                </div>
                {selectedBonLivraison && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Bon origine:</span>
                    <strong>{selectedBonLivraison.num_bon_livraison}</strong>
                  </div>
                )}
              </div>

              <hr />

              <div className="mb-3">
                <h6 className="text-muted">Montants</h6>
                <div className="d-flex justify-content-between mb-2">
                  <span>Total des lignes:</span>
                  <strong>{totals.montantTotal} DH</strong>
                </div>
              </div>

              <hr />

              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0">Montant total:</h5>
                <h3 className="mb-0 text-primary">{totals.montantTotal} DH</h3>
              </div>

              <div className="d-grid gap-2">
                <button
                  type="submit"
                  form="bonAvoirForm"
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
                      Créer le Bon d'Avoir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BonAvoirCreate;
