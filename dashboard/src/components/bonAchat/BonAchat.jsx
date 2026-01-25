import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "@/components/shared/table/Table";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { format, subDays } from "date-fns";
import {
  FiEye,
  FiFilter,
  FiCalendar,
  FiPlusCircle,
  FiTrash,
  FiBox,
  FiUser,
  FiRefreshCw,
} from "react-icons/fi";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import { Input, InputGroup, InputGroupText, Label, Badge } from "reactstrap";
import withReactContent from "sweetalert2-react-content";
import { Link } from "react-router-dom";
import BonAchatDetailsModal from "./BonAchatDetailsModal";

const MySwal = withReactContent(Swal);

// Status options for Bon Achat
const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "commandé", label: "Commandé" },
  { value: "partiellement_reçu", label: "Partiellement Reçu" },
  { value: "reçu", label: "Reçu" },
  { value: "partiellement_payé", label: "Partiellement Payé" },
  { value: "payé", label: "Payé" },
  { value: "annulé", label: "Annulé" },
];

// Type achat options
const typeAchatOptions = [
  { value: "all", label: "Tous les types" },
  { value: "matiere_premiere", label: "Matière Première" },
  { value: "produit_fini", label: "Produit Fini" },
  { value: "equipement", label: "Équipement" },
  { value: "service", label: "Service" },
  { value: "autre", label: "Autre" },
];

const BonAchatTable = () => {
  const [bons, setBons] = useState([]);
  const [filteredBons, setFilteredBons] = useState([]);
  const [fornisseurs, setFornisseurs] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTypeAchat, setSelectedTypeAchat] = useState("all");
  const [selectedFornisseur, setSelectedFornisseur] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedBonAchat, setSelectedBonAchat] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBonsAchat();
    fetchFornisseurs();
  }, []);

  // Filter bons based on selected filters
  useEffect(() => {
    let result = [...bons];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((bon) => bon.status === selectedStatus);
    }

    // Filter by type achat
    if (selectedTypeAchat !== "all") {
      result = result.filter((bon) => bon.type_achat === selectedTypeAchat);
    }

    // Filter by fornisseur
    if (selectedFornisseur !== "all") {
      result = result.filter(
        (bon) => bon.fornisseur_id === parseInt(selectedFornisseur),
      );
    }

    // Filter by date range
    if (dateRange[0].startDate && dateRange[0].endDate) {
      const start = new Date(dateRange[0].startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dateRange[0].endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((bon) => {
        const bonDate = new Date(bon.date_creation || bon.createdAt);
        return bonDate >= start && bonDate <= end;
      });
    }

    setFilteredBons(result);
  }, [selectedStatus, selectedTypeAchat, selectedFornisseur, dateRange, bons]);

  const fetchBonsAchat = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/bon-achats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("API Response:", response.data);

      if (response.data.success && response.data.bons) {
        const formattedData = response.data.bons.map((bon) => {
          // Calculate totals based on products
          let totalQuantite = 0;
          let totalQuantiteRecue = 0;
          let montant_ht = 0;

          if (bon.produits && bon.produits.length > 0) {
            bon.produits.forEach((prod) => {
              const quantite = parseFloat(prod.BonAchatProduit?.quantite || 0);
              totalQuantite += quantite;

              // If there's a received quantity field, use it
              const quantiteRecue = parseFloat(
                prod.BonAchatProduit?.quantite_recue || 0,
              );
              totalQuantiteRecue += quantiteRecue;

              // Calculate line total
              const prix_unitaire = parseFloat(
                prod.BonAchatProduit?.prix_unitaire || 0,
              );
              const remise_ligne = parseFloat(
                prod.BonAchatProduit?.remise_ligne || 0,
              );
              const total_ligne = prix_unitaire * quantite - remise_ligne;
              montant_ht += total_ligne;
            });
          } else {
            // Fallback to API values
            totalQuantite = bon.totalQuantite || 0;
            totalQuantiteRecue = bon.totalQuantiteRecue || 0;
            montant_ht = parseFloat(bon.montant_ht) || 0;
          }

          // Calculate reception percentage
          const pourcentageReception =
            totalQuantite > 0
              ? Math.round((totalQuantiteRecue / totalQuantite) * 100)
              : 0;

          // Determine reception status
          const statutReception =
            pourcentageReception === 0
              ? "non_reçu"
              : pourcentageReception === 100
                ? "reçu"
                : "partiellement_reçu";

          // Format dates
          const dateCreation = bon.date_creation || bon.createdAt;
          const dateReception = bon.date_reception;
          const datePaiement = bon.date_paiement;

          return {
            id: bon.id,
            num_bon_achat: bon.num_bon_achat,
            fornisseur_name:
              bon.fornisseur?.nom_complete || "Fournisseur inconnu",
            fornisseur_phone: bon.fornisseur?.telephone || "",
            fornisseur_id: bon.fornisseur_id,
            type_achat: bon.type_achat || "autre",
            montant_ht: montant_ht,
            montant_ttc: parseFloat(bon.montant_ttc) || montant_ht,
            tva: parseFloat(bon.tva) || 0,
            status: bon.status || "brouillon",
            mode_reglement: bon.mode_reglement || "espèces",
            date_creation: new Date(dateCreation),
            date_creation_string: format(
              new Date(dateCreation),
              "dd/MM/yyyy HH:mm",
            ),
            date_reception: dateReception
              ? format(new Date(dateReception), "dd/MM/yyyy")
              : null,
            date_paiement: datePaiement
              ? format(new Date(datePaiement), "dd/MM/yyyy")
              : null,
            notes: bon.notes || "",
            produits_count: bon.produits?.length || 0,
            totalQuantite,
            totalQuantiteRecue,
            pourcentageReception,
            statutReception,
            facture_fornisseur: bon.facture_fornisseur,
            delai_livraison: bon.delai_livraison,
            produits: bon.produits || [],
            fornisseur: bon.fornisseur,
          };
        });

        console.log("Formatted Data:", formattedData);
        setBons(formattedData);
        setFilteredBons(formattedData);
      } else {
        console.error("No bons achat data found in response");
        setBons([]);
        setFilteredBons([]);
      }
    } catch (error) {
      console.error("Error fetching bons achat:", error);
      topTost("Erreur lors du chargement des bons d'achat", "error");
      setBons([]);
      setFilteredBons([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFornisseurs = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/fournisseurs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fornisseurOptions = (
        response.data?.fournisseurs ||
        response.data?.fornisseurs ||
        []
      ).map((fornisseur) => ({
        value: fornisseur.id,
        label: `${fornisseur.nom_complete}`,
      }));

      setFornisseurs(fornisseurOptions);
    } catch (error) {
      console.error("Error fetching fornisseurs:", error);
    }
  };

  const handleDateRangeChange = (ranges) => {
    setDateRange([ranges.selection]);
    setShowDatePicker(false);
  };

  // Handle updates
  const handleUpdate = (updatedBonAchat) => {
    setBons((prev) =>
      prev.map((bon) =>
        bon.id === updatedBonAchat.id ? updatedBonAchat : bon,
      ),
    );
    topTost("Bon d'achat mis à jour avec succès!", "success");
  };

  // Handle stock reception
  const handleStockReceived = (bonAchat) => {
    setBons((prev) =>
      prev.map((bon) => (bon.id === bonAchat.id ? bonAchat : bon)),
    );
    topTost("Stock réceptionné avec succès!", "success");
  };

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "warning",
      commandé: "primary",
      partiellement_reçu: "info",
      reçu: "success",
      partiellement_payé: "warning",
      payé: "success",
      annulé: "danger",
    };
    return colors[status] || "secondary";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      commandé: "Commandé",
      partiellement_reçu: "Partiellement Reçu",
      reçu: "Reçu",
      partiellement_payé: "Partiellement Payé",
      payé: "Payé",
      annulé: "Annulé",
    };
    return texts[status] || status;
  };

  const getTypeAchatText = (type) => {
    const texts = {
      matiere_premiere: "Matière Première",
      produit_fini: "Produit Fini",
      equipement: "Équipement",
      service: "Service",
      autre: "Autre",
    };
    return texts[type] || type;
  };

  const getTypeAchatColor = (type) => {
    const colors = {
      matiere_premiere: "info",
      produit_fini: "primary",
      equipement: "warning",
      service: "success",
      autre: "secondary",
    };
    return colors[type] || "secondary";
  };

  const handleDeleteBon = async (bonId, num_bon_achat) => {
    const result = await MySwal.fire({
      title: "Supprimer ce Bon d'Achat?",
      text: `Le bon ${num_bon_achat} sera définitivement supprimé`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer!",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        await axios.delete(`${config_url}/api/bon-achats/${bonId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBons((prev) => prev.filter((bon) => bon.id !== bonId));
        topTost("Bon d'achat supprimé avec succès!", "success");
      } catch (error) {
        console.error("Delete error:", error);
        let errorMessage = "Échec de la suppression du bon d'achat";

        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = "Bon d'achat non trouvé";
          } else if (error.response.status === 409) {
            errorMessage = "Ce bon d'achat a des enregistrements associés";
          } else {
            errorMessage = error.response.data?.message || errorMessage;
          }
        }

        topTost(errorMessage, "error");
      }
    }
  };

  const handleViewBon = (bon) => {
    // Instead of showing Swal, open the modal
    setSelectedBonAchat(bon);
    setShowModal(true);
  };

  const columns = [
    {
      accessorKey: "id",
      header: ({ table }) => {
        const checkboxRef = React.useRef(null);

        React.useEffect(() => {
          if (checkboxRef.current) {
            checkboxRef.current.indeterminate = table.getIsSomeRowsSelected();
          }
        }, [table.getIsSomeRowsSelected()]);

        return (
          <input
            type="checkbox"
            className="custom-table-checkbox"
            ref={checkboxRef}
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        );
      },
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="custom-table-checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      meta: {
        headerClassName: "width-30",
      },
    },
    {
      accessorKey: "num_bon_achat",
      header: () => "N° Bon Achat",
      cell: ({ getValue }) => (
        <span className="font-mono fw-bold">{getValue()}</span>
      ),
    },
    {
      accessorKey: "fornisseur_name",
      header: () => "Fournisseur",
      cell: ({ getValue, row }) => (
        <div
          onClick={() => handleViewBon(row.original)}
          style={{ cursor: "pointer" }}
        >
          <FiUser className="me-1" />
          <span>{getValue()}</span>
        </div>
      ),
    },
    {
      accessorKey: "montant_ttc",
      header: () => "Montant TTC",
      cell: ({ getValue }) => (
        <span className="fw-bold text-primary">
          {parseFloat(getValue()).toFixed(2)} DH
        </span>
      ),
    },

    {
      accessorKey: "date_creation_string",
      header: () => "Date Création",
      cell: ({ getValue }) => <span>{getValue()}</span>,
    },
    {
      accessorKey: "produits_count",
      header: () => "Produits",
      cell: ({ getValue, row }) => (
        <div>
          <span className="badge bg-info">{getValue()} produits</span>
          <small className="text-muted ms-1">
            ({row.original.totalQuantite} unités)
          </small>
        </div>
      ),
    },
    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => {
        const bon = row.original;
        return (
          <div className="hstack d-flex gap-2 justify-content-center">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleViewBon(bon)}
              title="Voir détails"
            >
              <FiEye />
            </button>

            <button
              className="btn btn-sm btn-outline-dark"
              onClick={() => handleDeleteBon(bon.id, bon.num_bon_achat)}
              title="Supprimer"
              disabled={!["brouillon", "annulé"].includes(bon.status)}
            >
              <FiTrash />
            </button>
          </div>
        );
      },
      meta: {
        headerClassName: "text-center",
      },
    },
  ];

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

  // Calculate statistics
  const calculateStats = () => {
    const totalBons = filteredBons.length;
    const totalMontantHT = filteredBons.reduce(
      (sum, bon) => sum + bon.montant_ht,
      0,
    );
    const totalMontantTTC = filteredBons.reduce(
      (sum, bon) => sum + bon.montant_ttc,
      0,
    );
    const totalTVA = filteredBons.reduce((sum, bon) => sum + bon.tva, 0);
    const totalProduits = filteredBons.reduce(
      (sum, bon) => sum + bon.totalQuantite,
      0,
    );

    const statsByStatus = filteredBons.reduce((acc, bon) => {
      acc[bon.status] = (acc[bon.status] || 0) + 1;
      return acc;
    }, {});

    const statsByType = filteredBons.reduce((acc, bon) => {
      acc[bon.type_achat] = (acc[bon.type_achat] || 0) + 1;
      return acc;
    }, {});

    // Calculate pending reception
    const pendingReception = filteredBons.filter((bon) =>
      ["commandé", "partiellement_reçu"].includes(bon.status),
    ).length;

    return {
      totalBons,
      totalMontantHT: totalMontantHT.toFixed(2),
      totalMontantTTC: totalMontantTTC.toFixed(2),
      totalTVA: totalTVA.toFixed(2),
      totalProduits,
      statsByStatus,
      statsByType,
      pendingReception,
    };
  };

  const stats = calculateStats();

  return (
    <>
      <div className="mb-3" style={{ marginTop: "60px" }}>
        <div className="d-flex align-items-center flex-wrap gap-3 mb-3">
          {/* Fornisseur Filter */}
          <InputGroup size="sm" className="w-auto shadow-sm rounded">
            <InputGroupText className="bg-white border-0">
              <FiUser className="text-primary fs-6" />
            </InputGroupText>
            <Input
              type="select"
              value={selectedFornisseur}
              onChange={(e) => setSelectedFornisseur(e.target.value)}
              className="border-0 bg-white"
            >
              <option value="all">Tous les fournisseurs</option>
              {fornisseurs.map((fornisseur) => (
                <option key={fornisseur.value} value={fornisseur.value}>
                  {fornisseur.label}
                </option>
              ))}
            </Input>
          </InputGroup>

          {/* Date Range Filter */}
          <div className="position-relative">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <FiCalendar className="me-2" />
              {format(dateRange[0].startDate, "dd/MM/yyyy")} -{" "}
              {format(dateRange[0].endDate, "dd/MM/yyyy")}
            </button>

            {showDatePicker && (
              <div className="position-absolute mt-2" style={{ zIndex: 1050 }}>
                <DateRangePicker
                  onChange={handleDateRangeChange}
                  showSelectionPreview={true}
                  moveRangeOnFirstSelection={false}
                  months={1}
                  ranges={dateRange}
                  direction="horizontal"
                />
              </div>
            )}
          </div>

          {/* Create Button */}
          <div>
            <Link to="/bon-achat/create">
              <button className="btn btn-sm btn-success">
                <FiPlusCircle className="me-2" />
                Nouveau Bon d'Achat
              </button>
            </Link>
          </div>

          {/* Refresh Button */}
          <button
            className="btn btn-sm btn-outline-info"
            onClick={fetchBonsAchat}
            disabled={loading}
          >
            <FiRefreshCw
              className={
                loading ? "spinner-border spinner-border-sm me-1" : "me-1"
              }
            />
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body p-3">
                <h6 className="card-title mb-1">Total Bons</h6>
                <h3 className="mb-0">{stats.totalBons}</h3>
                <small className="opacity-75">
                  {filteredBons.length} filtré(s)
                </small>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body p-3">
                <h6 className="card-title mb-1">Valeur TTC</h6>
                <h3 className="mb-0">{stats.totalMontantTTC} DH</h3>
                <small className="opacity-75">
                  HT: {stats.totalMontantHT} DH
                </small>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body p-3">
                <h6 className="card-title mb-1">En attente</h6>
                <h3 className="mb-0">{stats.pendingReception}</h3>
                <small className="opacity-75">Réception</small>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card bg-warning text-dark">
              <div className="card-body p-3">
                <h6 className="card-title mb-1">Articles</h6>
                <h3 className="mb-0">{stats.totalProduits}</h3>
                <small className="opacity-75">Produits commandés</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-2">Chargement des bons d'achat...</p>
        </div>
      ) : filteredBons.length > 0 ? (
        <div className="mt-4">
          <Table
            data={filteredBons}
            columns={columns}
            enableRowSelection={true}
          />

          <BonAchatDetailsModal
            isOpen={showModal}
            toggle={() => setShowModal(!showModal)}
            bonAchat={selectedBonAchat}
            onUpdate={handleUpdate}
            onReceiveStock={handleStockReceived}
          />
        </div>
      ) : (
        <div className="text-center py-5">
          <div className="avatar-lg mx-auto mb-4">
            <div className="avatar-title bg-light text-warning rounded-circle">
              <FiBox className="fs-24" />
            </div>
          </div>
          <h5>Aucun bon d'achat trouvé</h5>
          <p className="text-muted">
            {bons.length === 0
              ? "Vous n'avez pas encore créé de bons d'achat"
              : "Aucun résultat ne correspond à vos filtres"}
          </p>
          {bons.length === 0 && (
            <Link to="/bon-achat/create">
              <button className="btn btn-primary mt-2">
                <FiPlusCircle className="me-2" />
                Créer votre premier bon d'achat
              </button>
            </Link>
          )}
        </div>
      )}
    </>
  );
};

export default BonAchatTable;
