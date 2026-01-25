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
  FiCheck,
  FiX,
  FiTag,
  FiClipboard,
  FiUser,
  FiRefreshCw,
} from "react-icons/fi";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import { Input, InputGroup, InputGroupText, Label, Badge } from "reactstrap";
import withReactContent from "sweetalert2-react-content";
import { Link } from "react-router-dom";
import BonAvoirDetailsModal from "./BonAvoirDetailsModal"; // Import the modal

const MySwal = withReactContent(Swal);

// Updated status options to match your backend
const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "valide", label: "Validé" },
  { value: "utilise", label: "Utilisé" },
  { value: "annule", label: "Annulé" },
];

const motifOptions = [
  { value: "all", label: "Tous les motifs" },
  { value: "retour_produit", label: "Retour Produit" },
  { value: "erreur_facturation", label: "Erreur Facturation" },
  { value: "remise_commerciale", label: "Remise Commerciale" },
  { value: "annulation", label: "Annulation" },
  { value: "autre", label: "Autre" },
];

const BonAvoirTable = () => {
  const [bons, setBons] = useState([]);
  const [filteredBons, setFilteredBons] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedMotif, setSelectedMotif] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [selectedBonAvoir, setSelectedBonAvoir] = useState(null); // Add this state
  const [showModal, setShowModal] = useState(false); // Add this state

  useEffect(() => {
    fetchBonsAvoir();
  }, []);

  // Filter bons based on selected status, motif and date range
  useEffect(() => {
    let result = [...bons];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((bon) => bon.status === selectedStatus);
    }

    // Filter by motif
    if (selectedMotif !== "all") {
      result = result.filter((bon) => bon.motif === selectedMotif);
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
  }, [selectedStatus, selectedMotif, dateRange, bons]);

  const fetchBonsAvoir = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/bon-avoirs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("API Response:", response.data);

      if (response.data.success && response.data.bons) {
        const formattedData = response.data.bons.map((bon) => {
          // Calculate total produits count and quantities
          const produits = bon.produits || [];
          const totalProduits = produits.length;
          const totalQuantites = produits.reduce((sum, produit) => {
            return sum + (parseInt(produit.BonAvoirProduit?.quantite) || 0);
          }, 0);

          // Calculate total amount from products if not provided
          let montant_total = parseFloat(bon.montant_total) || 0;
          if (montant_total === 0 && produits.length > 0) {
            montant_total = produits.reduce((sum, produit) => {
              const quantite = parseInt(produit.BonAvoirProduit?.quantite) || 0;
              const prix_unitaire =
                parseFloat(produit.BonAvoirProduit?.prix_unitaire) || 0;
              const remise = parseFloat(produit.BonAvoirProduit?.remise) || 0;
              return sum + (prix_unitaire * quantite - remise);
            }, 0);
          }

          // Format client info
          const clientInfo = bon.client
            ? `${bon.client.nom_complete}`
            : bon.bonLivraison?.client_id
              ? `Client #${bon.bonLivraison.client_id}`
              : "Client inconnu";

          // Format bon livraison info
          const bonLivraisonInfo = bon.bonLivraison
            ? `${bon.bonLivraison.num_bon_livraison}`
            : "N/A";

          return {
            id: bon.id,
            num_bon_avoir: bon.num_bon_avoir,
            client_name: clientInfo,
            client_phone: bon.client?.telephone || "",
            client_address: bon.client?.address || "",
            bon_livraison_ref: bonLivraisonInfo,
            montant_total: montant_total,
            motif: bon.motif,
            status: bon.status,
            date_creation: new Date(bon.date_creation || bon.createdAt),
            date_creation_string: bon.date_creation
              ? format(new Date(bon.date_creation), "dd/MM/yyyy HH:mm")
              : format(new Date(bon.createdAt), "dd/MM/yyyy HH:mm"),
            utilise_le: bon.utilise_le
              ? format(new Date(bon.utilise_le), "dd/MM/yyyy")
              : null,
            notes: bon.notes || "",
            produits_count: totalProduits,
            total_quantites: totalQuantites,
            produits: produits,
            client: bon.client,
            bonLivraison: bon.bonLivraison,
          };
        });

        console.log("Formatted Data:", formattedData);
        setBons(formattedData);
        setFilteredBons(formattedData);
      } else {
        console.error("No bons avoir data found in response");
        setBons([]);
        setFilteredBons([]);
      }
    } catch (error) {
      console.error("Error fetching bons avoir:", error);
      topTost("Erreur lors du chargement des bons d'avoir", "error");
      setBons([]);
      setFilteredBons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (ranges) => {
    setDateRange([ranges.selection]);
    setShowDatePicker(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "warning",
      valide: "primary",
      utilise: "success",
      annule: "danger",
    };
    return colors[status] || "secondary";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      valide: "Validé",
      utilise: "Utilisé",
      annule: "Annulé",
    };
    return texts[status] || status;
  };

  const getMotifText = (motif) => {
    const texts = {
      retour_produit: "Retour Produit",
      erreur_facturation: "Erreur Facturation",
      remise_commerciale: "Remise Commerciale",
      annulation: "Annulation",
      autre: "Autre",
    };
    return texts[motif] || motif;
  };

  const getMotifColor = (motif) => {
    const colors = {
      retour_produit: "info",
      erreur_facturation: "warning",
      remise_commerciale: "success",
      annulation: "danger",
      autre: "secondary",
    };
    return colors[motif] || "secondary";
  };

  const handleDeleteBon = async (bonId, num_bon_avoir) => {
    const result = await MySwal.fire({
      title: "Supprimer ce Bon d'Avoir?",
      text: `Le bon ${num_bon_avoir} sera définitivement supprimé`,
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
        await axios.delete(`${config_url}/api/bon-avoirs/${bonId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBons((prev) => prev.filter((bon) => bon.id !== bonId));
        topTost("Bon d'avoir supprimé avec succès!", "success");
      } catch (error) {
        console.error("Delete error:", error);
        let errorMessage = "Échec de la suppression du bon d'avoir";

        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = "Bon d'avoir non trouvé";
          } else if (error.response.status === 409) {
            errorMessage = "Ce bon d'avoir a des enregistrements associés";
          } else {
            errorMessage = error.response.data?.message || errorMessage;
          }
        }

        topTost(errorMessage, "error");
      }
    }
  };

  // Updated handleViewBon to use modal
  const handleViewBon = (bon) => {
    setSelectedBonAvoir(bon);
    setShowModal(true);
  };

  const handleValiderBon = async (bonId) => {
    const result = await MySwal.fire({
      title: "Valider ce Bon d'Avoir?",
      text: "Le bon d'avoir sera validé et pourra être utilisé.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Oui, valider",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        await axios.patch(
          `${config_url}/api/bon-avoirs/${bonId}/validate`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // Update local state
        setBons((prev) =>
          prev.map((bon) =>
            bon.id === bonId ? { ...bon, status: "valide" } : bon,
          ),
        );

        topTost("Bon d'avoir validé avec succès!", "success");
      } catch (error) {
        console.error("Validation error:", error);
        const errorMsg =
          error.response?.data?.message || "Erreur lors de la validation";
        topTost(errorMsg, "error");
      }
    }
  };

  const handleAnnulerBon = async (bonId) => {
    const result = await MySwal.fire({
      title: "Annuler ce Bon d'Avoir?",
      text: "Le bon d'avoir sera annulé et ne pourra plus être utilisé.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, annuler",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        await axios.patch(
          `${config_url}/api/bon-avoirs/${bonId}/cancel`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // Update local state
        setBons((prev) =>
          prev.map((bon) =>
            bon.id === bonId ? { ...bon, status: "annule" } : bon,
          ),
        );

        topTost("Bon d'avoir annulé avec succès!", "success");
      } catch (error) {
        console.error("Annulation error:", error);
        const errorMsg =
          error.response?.data?.message || "Erreur lors de l'annulation";
        topTost(errorMsg, "error");
      }
    }
  };

  // Handle updates from modal
  const handleUpdate = (updatedBonAvoir) => {
    setBons((prev) =>
      prev.map((bon) =>
        bon.id === updatedBonAvoir.id ? updatedBonAvoir : bon,
      ),
    );
    topTost("Bon d'avoir mis à jour avec succès!", "success");
  };

  // Handle validate from modal
  const handleValidate = (bonAvoir) => {
    setBons((prev) =>
      prev.map((bon) =>
        bon.id === bonAvoir.id ? { ...bon, status: "valide" } : bon,
      ),
    );
    topTost("Bon d'avoir validé avec succès!", "success");
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
      accessorKey: "num_bon_avoir",
      header: () => "N° Bon Avoir",
      cell: ({ getValue, row }) => (
        <span
          className="font-mono fw-bold"
          style={{ cursor: "pointer", color: "#007bff" }}
          onClick={() => handleViewBon(row.original)}
        >
          {getValue()}
        </span>
      ),
    },
    {
      accessorKey: "client_name",
      header: () => "Client",
      cell: ({ getValue, row }) => (
        <div
          style={{ cursor: "pointer" }}
          onClick={() => handleViewBon(row.original)}
        >
          <FiUser className="me-1" />
          <span>{getValue()}</span>
        </div>
      ),
    },
    {
      accessorKey: "bon_livraison_ref",
      header: () => "Bon Livraison",
      cell: ({ getValue }) => (
        <div>
          <FiClipboard className="me-1" />
          <span>{getValue()}</span>
        </div>
      ),
    },
    {
      accessorKey: "montant_total",
      header: () => "Montant",
      cell: ({ getValue }) => (
        <span className="fw-bold text-primary">
          {parseFloat(getValue()).toFixed(2)} DH
        </span>
      ),
    },
    {
      accessorKey: "motif",
      header: () => "Motif",
      cell: ({ getValue }) => {
        const motif = getValue();
        return (
          <Badge color={getMotifColor(motif)} className="text-capitalize">
            <FiTag className="me-1" />
            {getMotifText(motif)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => "Statut",
      cell: ({ getValue, row }) => {
        const status = getValue();
        return (
          <Badge color={getStatusColor(status)} className="text-capitalize">
            {getStatusText(status)}
            {status === "utilise" && row.original.utilise_le && (
              <small className="ms-1">({row.original.utilise_le})</small>
            )}
          </Badge>
        );
      },
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
            ({row.original.total_quantites} unités)
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

            {bon.status === "brouillon" && (
              <button
                className="btn btn-sm btn-outline-success"
                onClick={() => handleValiderBon(bon.id)}
                title="Valider"
              >
                <FiCheck />
              </button>
            )}

            {["brouillon", "valide"].includes(bon.status) && (
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleAnnulerBon(bon.id)}
                title="Annuler"
              >
                <FiX />
              </button>
            )}

            <button
              className="btn btn-sm btn-outline-dark"
              onClick={() => handleDeleteBon(bon.id, bon.num_bon_avoir)}
              title="Supprimer"
              disabled={bon.status === "utilise"}
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
    const totalMontant = filteredBons.reduce(
      (sum, bon) => sum + bon.montant_total,
      0,
    );
    const statsByStatus = filteredBons.reduce((acc, bon) => {
      acc[bon.status] = (acc[bon.status] || 0) + 1;
      return acc;
    }, {});
    const statsByMotif = filteredBons.reduce((acc, bon) => {
      acc[bon.motif] = (acc[bon.motif] || 0) + 1;
      return acc;
    }, {});

    return {
      totalBons,
      totalMontant: totalMontant.toFixed(2),
      statsByStatus,
      statsByMotif,
    };
  };

  const stats = calculateStats();

  return (
    <>
      <div className="mb-3" style={{ marginTop: "60px" }}>
        <div className="d-flex align-items-center flex-wrap gap-3 mb-3">
          <InputGroup size="sm" className="w-auto shadow-sm rounded">
            <InputGroupText className="bg-white border-0">
              <FiFilter className="text-primary fs-6" />
            </InputGroupText>
            <Input
              type="select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border-0 bg-white"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Input>
          </InputGroup>

          <InputGroup size="sm" className="w-auto shadow-sm rounded">
            <InputGroupText className="bg-white border-0">
              <FiTag className="text-primary fs-6" />
            </InputGroupText>
            <Input
              type="select"
              value={selectedMotif}
              onChange={(e) => setSelectedMotif(e.target.value)}
              className="border-0 bg-white"
            >
              {motifOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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

          <div>
            <Link to="/bon-avoir/create">
              <button className="btn btn-sm btn-success">
                <FiPlusCircle className="me-2" />
                Créer Nouveau Bon d'Avoir
              </button>
            </Link>
          </div>

          {/* Refresh Button */}
          <button
            className="btn btn-sm btn-outline-info"
            onClick={fetchBonsAvoir}
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
                <h6 className="card-title mb-1">Montant Total</h6>
                <h3 className="mb-0">{stats.totalMontant} DH</h3>
                <small className="opacity-75">Valeur totale</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body p-3">
                <h6 className="card-title mb-1">Statuts</h6>
                <div className="d-flex flex-wrap gap-1">
                  {Object.entries(stats.statsByStatus).map(
                    ([status, count]) => (
                      <Badge key={status} color="light" className="text-dark">
                        {getStatusText(status)}: {count}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-dark">
              <div className="card-body p-3">
                <h6 className="card-title mb-1">Motifs</h6>
                <div className="d-flex flex-wrap gap-1">
                  {Object.entries(stats.statsByMotif).map(([motif, count]) => (
                    <Badge key={motif} color="light" className="text-dark">
                      {getMotifText(motif)}: {count}
                    </Badge>
                  ))}
                </div>
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
          <p className="mt-2">Chargement des bons d'avoir...</p>
        </div>
      ) : filteredBons.length > 0 ? (
        <div className="mt-4">
          <Table
            data={filteredBons}
            columns={columns}
            enableRowSelection={true}
          />
        </div>
      ) : (
        <div className="text-center py-5">
          <div className="avatar-lg mx-auto mb-4">
            <div className="avatar-title bg-light text-warning rounded-circle">
              <FiTag className="fs-24" />
            </div>
          </div>
          <h5>Aucun bon d'avoir trouvé</h5>
          <p className="text-muted">
            {bons.length === 0
              ? "Vous n'avez pas encore créé de bons d'avoir"
              : "Aucun résultat ne correspond à vos filtres"}
          </p>
          {bons.length === 0 && (
            <Link to="/bon-avoir/create">
              <button className="btn btn-primary mt-2">
                <FiPlusCircle className="me-2" />
                Créer votre premier bon d'avoir
              </button>
            </Link>
          )}
        </div>
      )}

      {/* Add the modal here */}
      <BonAvoirDetailsModal
        isOpen={showModal}
        toggle={() => setShowModal(!showModal)}
        bonAvoir={selectedBonAvoir}
        onUpdate={handleUpdate}
        onValidate={handleValidate}
      />
    </>
  );
};

export default BonAvoirTable;
