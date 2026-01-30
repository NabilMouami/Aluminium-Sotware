import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "@/components/shared/table/Table";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { format, subDays } from "date-fns";
import {
  FiEye,
  FiFilter,
  FiCalendar,
  FiPlusCircle,
  FiTrash,
  FiFileText,
  FiRefreshCw,
} from "react-icons/fi";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import { Input, InputGroup, InputGroupText, Label, Button } from "reactstrap";
import withReactContent from "sweetalert2-react-content";
import { Link } from "react-router-dom";
import DevisDetailsModal from "./DevisDetailsModal";

const MySwal = withReactContent(Swal);

// Devis status options
const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyé", label: "Envoyé" },
  { value: "accepté", label: "Accepté" },
  { value: "refusé", label: "Refusé" },
  { value: "expiré", label: "Expiré" },
  { value: "transformé_en_facture", label: "Transformé en Facture" },
  { value: "transformé_en_bl", label: "Transformé en BL" },
  { value: "en_attente", label: "En Attente" },
];

const ListDevis = () => {
  const [devisList, setDevisList] = useState([]);
  const [filteredDevis, setFilteredDevis] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // États simplifiés pour les dates
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    fetchDevis();
  }, []);

  const fetchDevis = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/devis`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Devis API Response:", response.data);

      if (response.data.success && response.data.devis) {
        const formattedData = response.data.devis.map((devis) => {
          // Calculate total products
          let totalProducts = 0;
          let totalQuantity = 0;
          if (devis.produits && devis.produits.length > 0) {
            totalProducts = devis.produits.length;
            totalQuantity = devis.produits.reduce((sum, p) => {
              return sum + (parseFloat(p.DevisProduit?.quantite) || 0);
            }, 0);
          }

          return {
            id: devis.id,
            num_devis: devis.num_devis,
            client_name: devis.client?.nom_complete || "Client inconnu",
            client_phone: devis.client?.telephone || "",
            montant_ht: parseFloat(devis.montant_ht) || 0,
            montant_ttc: parseFloat(devis.montant_ttc) || 0,
            status: devis.status || "brouillon",
            date_creation: new Date(devis.date_creation || devis.createdAt),
            date_creation_string: new Date(
              devis.date_creation || devis.createdAt,
            ).toLocaleDateString("fr-FR"),
            date_acceptation: devis.date_acceptation
              ? new Date(devis.date_acceptation).toLocaleDateString("fr-FR")
              : "",
            mode_reglement: devis.mode_reglement || "espèces",
            notes: devis.notes || "",
            objet: devis.objet || "",
            conditions_reglement: devis.conditions_reglement || "",
            conditions_generales: devis.conditions_generales || "",
            client_id: devis.client_id,
            total_products: totalProducts,
            total_quantity: totalQuantity,
            produits: devis.produits || [],
            client: devis.client || {},
            createdAt: devis.createdAt,
            updatedAt: devis.updatedAt,
          };
        });

        console.log("Formatted Devis Data:", formattedData);
        setDevisList(formattedData);
        setFilteredDevis(formattedData);
      } else {
        console.error("No devis data found in response");
        setDevisList([]);
        setFilteredDevis([]);
      }
    } catch (error) {
      console.error("Error fetching devis:", error);
      topTost("Erreur lors du chargement des devis", "error");
      setDevisList([]);
      setFilteredDevis([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions simplifiées pour les dates
  const handleStartDateChange = (e) => {
    const date = new Date(e.target.value);
    setStartDate(date);
  };

  const handleEndDateChange = (e) => {
    const date = new Date(e.target.value);
    setEndDate(date);
  };

  const formatDateForInput = (date) => {
    return format(date, "yyyy-MM-dd");
  };

  // Filter devis based on selected status and date range
  useEffect(() => {
    let result = [...devisList];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((devis) => devis.status === selectedStatus);
    }

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((devis) => {
        const devisDate = new Date(devis.date_creation);
        return devisDate >= start && devisDate <= end;
      });
    }

    setFilteredDevis(result);
  }, [selectedStatus, startDate, endDate, devisList]);

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-secondary text-white",
      envoyé: "bg-primary text-white",
      accepté: "bg-success text-white",
      refusé: "bg-danger text-white",
      expiré: "bg-dark text-white",
      transformé_en_commande: "bg-info text-white",
      transformé_en_bl: "bg-info text-white",
      transformé_en_facture: "bg-red text-white",
      en_attente: "bg-warning text-dark",
    };
    return colors[status] || "bg-secondary text-white";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      envoyé: "Envoyé",
      accepté: "Accepté",
      refusé: "Refusé",
      expiré: "Expiré",
      transformé_en_bl: "Transformé en Bon Livraison",
      transformé_en_facture: "Transformé en Facture",
      en_attente: "En Attente",
    };
    return texts[status] || status;
  };

  const handleDevisUpdated = (updatedDevis) => {
    setDevisList((prev) =>
      prev.map((item) =>
        item.id === updatedDevis.id ? { ...item, ...updatedDevis } : item,
      ),
    );

    // Also update filtered list (important!)
    setFilteredDevis((prev) =>
      prev.map((item) =>
        item.id === updatedDevis.id ? { ...item, ...updatedDevis } : item,
      ),
    );
  };

  const handleDeleteDevis = async (devisId) => {
    const result = await MySwal.fire({
      title: "Supprimer ce Devis ?",
      text: "Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer !",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        await axios.delete(`${config_url}/api/devis/${devisId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setDevisList((prev) => prev.filter((devis) => devis.id !== devisId));
        topTost("Devis supprimé avec succès !", "success");
      } catch (error) {
        console.error("Delete error:", error);
        let errorMessage = "Échec de la suppression du devis";

        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = "Devis non trouvé";
          } else if (error.response.status === 400) {
            errorMessage = "Impossible de supprimer un devis avec ce statut";
          } else {
            errorMessage = error.response.data?.message || errorMessage;
          }
        }

        topTost(errorMessage, "error");
      }
    }
  };

  const handleViewDevis = async (devisId) => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/devis/${devisId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const devisData = response.data.devis;

        const formattedDevis = {
          id: devisData.id,
          num_devis: devisData.num_devis,
          client_name: devisData.client?.nom_complete || "Client inconnu",
          client_phone: devisData.client?.telephone || "",
          montant_ht: parseFloat(devisData.montant_ht) || 0,
          montant_ttc: parseFloat(devisData.montant_ttc) || 0,
          status: devisData.status || "brouillon",
          date_creation: new Date(
            devisData.date_creation || devisData.createdAt,
          ),
          date_creation_string: new Date(
            devisData.date_creation || devisData.createdAt,
          ).toLocaleDateString("fr-FR"),
          date_acceptation: devisData.date_acceptation
            ? new Date(devisData.date_acceptation).toLocaleDateString("fr-FR")
            : "",
          mode_reglement: devisData.mode_reglement || "espèces",
          notes: devisData.notes || "",
          objet: devisData.objet || "",
          conditions_reglement: devisData.conditions_reglement || "",
          conditions_generales: devisData.conditions_generales || "",
          produits: devisData.produits || [],
          client: devisData.client || {},
        };

        setSelectedDevis(formattedDevis);
        setIsDetailsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching devis details:", error);
      topTost("Échec du chargement des détails du devis", "error");
    }
  };

  const handleUpdateStatus = async (devisId, newStatus) => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.patch(
        `${config_url}/api/devis/${devisId}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        // Update the local state
        setDevisList((prev) =>
          prev.map((devis) =>
            devis.id === devisId
              ? {
                  ...devis,
                  status: newStatus,
                  date_acceptation:
                    newStatus === "accepté"
                      ? new Date().toISOString()
                      : devis.date_acceptation,
                }
              : devis,
          ),
        );

        topTost(`Statut mis à jour: ${getStatusText(newStatus)}`, "success");
        fetchDevis(); // Refresh the list
      }
    } catch (error) {
      console.error("Error updating status:", error);
      topTost("Erreur lors de la mise à jour du statut", "error");
    }
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
      accessorKey: "num_devis",
      header: () => "N° Devis",
      cell: ({ getValue }) => (
        <span className="font-mono fw-bold">{getValue()}</span>
      ),
    },
    {
      accessorKey: "client_name",
      header: () => "Client",
      cell: ({ getValue }) => <span>{getValue()}</span>,
    },
    {
      accessorKey: "montant_ttc",
      header: () => "Montant TTC",
      cell: ({ getValue }) => (
        <span className="fw-bold">{parseFloat(getValue()).toFixed(2)} Dh</span>
      ),
    },
    {
      accessorKey: "status",
      header: () => "Statut",
      cell: ({ getValue }) => {
        const status = getValue();
        return (
          <span className={`badge ${getStatusColor(status)}`}>
            {getStatusText(status)}
          </span>
        );
      },
    },
    {
      accessorKey: "date_creation_string",
      header: () => "Date Création",
      cell: ({ getValue }) => <span>{getValue()}</span>,
    },
    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => {
        const devis = row.original;

        return (
          <div className="hstack d-flex gap-2 justify-content-center">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleViewDevis(devis.id)}
              title="Voir détails"
            >
              <FiEye />
            </button>

            {["brouillon", "refusé", "expiré"].includes(devis.status) && (
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleDeleteDevis(devis.id)}
                title="Supprimer"
              >
                <FiTrash />
              </button>
            )}
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

  // Quick stats for dashboard
  const getStats = () => {
    const totalDevis = devisList?.length ?? 0;

    let totalAmount = 0;
    let acceptedDevis = 0;
    let pendingDevis = 0;

    if (Array.isArray(devisList)) {
      devisList.forEach((devis) => {
        const montant = Number(devis?.montant_ttc);
        if (!isNaN(montant)) {
          totalAmount += montant;
        }

        if (devis?.status === "accepté") {
          acceptedDevis++;
        }
        if (devis?.status === "brouillon" || devis?.status === "en_attente") {
          pendingDevis++;
        }
      });
    }

    return {
      totalDevis,
      totalAmount: totalAmount.toFixed(2),
      acceptedDevis,
      pendingDevis,
    };
  };
  const stats = getStats();

  return (
    <>
      <div
        className="mb-3 d-flex align-items-center flex-wrap gap-3"
        style={{
          zIndex: 999,
        }}
      >
        {/* Status Filter */}
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

        {/* Date Range Filter - Version simplifiée */}
        <div className="d-flex align-items-center gap-2">
          <InputGroup size="sm" className="w-auto shadow-sm rounded">
            <InputGroupText className="bg-white border-0">
              <FiCalendar className="text-primary fs-6" />
            </InputGroupText>
            <Input
              type="date"
              className="border-0 bg-white"
              value={formatDateForInput(startDate)}
              onChange={handleStartDateChange}
              max={formatDateForInput(endDate)}
              title="Date de début"
            />
          </InputGroup>

          <span className="text-muted">à</span>

          <InputGroup size="sm" className="w-auto shadow-sm rounded">
            <InputGroupText className="bg-white border-0">
              <FiCalendar className="text-primary fs-6" />
            </InputGroupText>
            <Input
              type="date"
              className="border-0 bg-white"
              value={formatDateForInput(endDate)}
              onChange={handleEndDateChange}
              min={formatDateForInput(startDate)}
              title="Date de fin"
            />
          </InputGroup>

          {/* Bouton pour réinitialiser à 30 jours */}
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setStartDate(subDays(new Date(), 30));
              setEndDate(new Date());
            }}
            title="30 derniers jours"
          >
            30j
          </button>
        </div>

        <div className="ms-auto d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={fetchDevis}
            disabled={loading}
          >
            <FiRefreshCw
              className={`me-2 ${loading ? "spinner-border spinner-border-sm" : ""}`}
            />
            Actualiser
          </button>
          <Link to="/devis/create">
            <button className="btn btn-sm btn-success">
              <FiPlusCircle className="me-2" />
              Créer Nouveau Devis
            </button>
          </Link>
        </div>
      </div>

      {/* Afficher la période sélectionnée */}
      <div className="mb-2 text-muted small">
        <FiCalendar className="me-1" />
        Période : {format(startDate, "dd/MM/yyyy")} -{" "}
        {format(endDate, "dd/MM/yyyy")}
        <span className="ms-3">
          ({filteredDevis.length} devis correspondants)
        </span>
      </div>

      {/* Stats Cards */}
      <div className="mb-4">
        <div className="row g-3">
          <div className="col-md-3">
            <div className="card border-primary border-top-0 border-start-0 border-end-0 border-top-3">
              <div className="card-body">
                <h5 className="card-title text-muted">Total Devis</h5>
                <h2 className="mb-0">{stats.totalDevis}</h2>
                <small className="text-muted">Tous statuts</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-success border-top-0 border-start-0 border-end-0 border-top-3">
              <div className="card-body">
                <h5 className="card-title text-muted">Montant Total</h5>
                <h2 className="mb-0">{stats.totalAmount} Dh</h2>
                <small className="text-muted">Valeur totale</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-info border-top-0 border-start-0 border-end-0 border-top-3">
              <div className="card-body">
                <h5 className="card-title text-muted">Acceptés</h5>
                <h2 className="mb-0">{stats.acceptedDevis}</h2>
                <small className="text-muted">Devis acceptés</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-warning border-top-0 border-start-0 border-end-0 border-top-3">
              <div className="card-body">
                <h5 className="card-title text-muted">En attente</h5>
                <h2 className="mb-0">{stats.pendingDevis}</h2>
                <small className="text-muted">À traiter</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="mt-2">Chargement des devis...</p>
          </div>
        ) : (
          <>
            <div className="alert alert-info mb-3">
              <FiFileText className="me-2" />
              {filteredDevis.length} devis trouvés
            </div>
            <Table
              data={filteredDevis}
              columns={columns}
              enableRowSelection={true}
            />
          </>
        )}
      </div>

      {/* Devis Details Modal */}
      <DevisDetailsModal
        isOpen={isDetailsModalOpen}
        toggle={() => setIsDetailsModalOpen(false)}
        devis={selectedDevis}
        onUpdateStatus={(devisId, newStatus) =>
          handleUpdateStatus(devisId, newStatus)
        }
        onDevisUpdated={handleDevisUpdated}
      />
    </>
  );
};

export default ListDevis;
