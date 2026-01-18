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
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSend,
  FiEdit,
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
  { value: "transformé_en_commande", label: "Transformé en Commande" },
  { value: "en_attente", label: "En Attente" },
];

const ListDevis = () => {
  const [devisList, setDevisList] = useState([]);
  const [filteredDevis, setFilteredDevis] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
            remise: parseFloat(devis.remise) || 0,
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

  // Filter devis based on selected status and date range
  useEffect(() => {
    let result = [...devisList];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((devis) => devis.status === selectedStatus);
    }

    // Filter by date range
    if (dateRange[0].startDate && dateRange[0].endDate) {
      const start = new Date(dateRange[0].startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dateRange[0].endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((devis) => {
        const devisDate = new Date(devis.date_creation);
        return devisDate >= start && devisDate <= end;
      });
    }

    setFilteredDevis(result);
  }, [selectedStatus, dateRange, devisList]);

  const handleDateRangeChange = (ranges) => {
    setDateRange([ranges.selection]);
    setShowDatePicker(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-secondary text-white",
      envoyé: "bg-primary text-white",
      accepté: "bg-success text-white",
      refusé: "bg-danger text-white",
      expiré: "bg-dark text-white",
      transformé_en_commande: "bg-info text-white",
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
      transformé_en_commande: "Transformé en Commande",
      en_attente: "En Attente",
    };
    return texts[status] || status;
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
          remise: parseFloat(devisData.remise) || 0,
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

  const handleSendDevis = async (devisId) => {
    const result = await MySwal.fire({
      title: "Envoyer ce devis ?",
      text: "Voulez-vous marquer ce devis comme 'envoyé' au client ?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, envoyer",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      await handleUpdateStatus(devisId, "envoyé");
    }
  };

  const handleConvertToBL = async (devisId) => {
    const result = await MySwal.fire({
      title: "Convertir en Bon de Livraison ?",
      text: "Voulez-vous convertir ce devis en bon de livraison ?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, convertir",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.post(
          `${config_url}/api/devis/${devisId}/convert-to-bl`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.data.success) {
          // Update devis status
          await handleUpdateStatus(devisId, "transformé_en_commande");

          topTost("Devis converti en bon de livraison avec succès", "success");

          // Optionally redirect to the new BL
          MySwal.fire({
            title: "Conversion réussie !",
            text: "Voulez-vous voir le bon de livraison créé ?",
            icon: "success",
            showCancelButton: true,
            confirmButtonText: "Voir le BL",
            cancelButtonText: "Rester ici",
          }).then((result) => {
            if (result.isConfirmed && response.data.bonLivraison) {
              window.location.href = `/bon-livraisons/${response.data.bonLivraison.id}`;
            }
          });
        }
      } catch (error) {
        console.error("Error converting devis:", error);
        const errorMsg =
          error.response?.data?.message || "Erreur lors de la conversion";
        topTost(errorMsg, "error");
      }
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
      accessorKey: "remise",
      header: () => "Remise",
      cell: ({ getValue }) => (
        <span className="text-danger">
          {parseFloat(getValue()).toFixed(2)} Dh
        </span>
      ),
    },
    {
      accessorKey: "total_products",
      header: () => "Produits",
      cell: ({ getValue, row }) => (
        <span>
          {getValue} produit{getValue !== 1 ? "s" : ""}
        </span>
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
        const isConvertible = devis.status === "accepté";
        const isSendable =
          devis.status === "brouillon" || devis.status === "en_attente";

        return (
          <div className="hstack d-flex gap-2 justify-content-center">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleViewDevis(devis.id)}
              title="Voir détails"
            >
              <FiEye />
            </button>

            {isSendable && (
              <button
                className="btn btn-sm btn-outline-info"
                onClick={() => handleSendDevis(devis.id)}
                title="Envoyer devis"
              >
                <FiSend />
              </button>
            )}

            {isConvertible && (
              <button
                className="btn btn-sm btn-outline-success"
                onClick={() => handleConvertToBL(devis.id)}
                title="Convertir en BL"
              >
                <FiCheckCircle />
              </button>
            )}

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
    const totalDevis = devisList.length;
    const totalAmount = devisList.reduce(
      (sum, devis) => sum + devis.montant_ttc,
      0,
    );
    const acceptedDevis = devisList.filter(
      (d) => d.status === "accepté",
    ).length;
    const pendingDevis = devisList.filter(
      (d) => d.status === "brouillon" || d.status === "en_attente",
    ).length;

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

      <div
        className="mb-3 d-flex align-items-center flex-wrap gap-3"
        style={{
          zIndex: 999,
        }}
      >
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

      {/* Devis Details Modal - You'll need to create this component */}
      <DevisDetailsModal
        isOpen={isDetailsModalOpen}
        toggle={() => setIsDetailsModalOpen(false)}
        devis={selectedDevis}
        onUpdateStatus={(devisId, newStatus) =>
          handleUpdateStatus(devisId, newStatus)
        }
      />
    </>
  );
};

export default ListDevis;
