import React, { useState, useEffect } from "react";
import axios from "axios";
import BonLivrDetailsModal from "./BonLivrDetailsModal";
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
  FiDollarSign,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiPercent,
} from "react-icons/fi";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import {
  Input,
  InputGroup,
  InputGroupText,
  Label,
  Card,
  CardBody,
} from "reactstrap";
import withReactContent from "sweetalert2-react-content";
import { Link } from "react-router-dom";

const MySwal = withReactContent(Swal);

// Updated status options to match your backend
const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "payé", label: "Payé" },
  { value: "partiellement_payée", label: "Partiellement Payé" },
  { value: "annulée", label: "Annulé" },
];

// Helper function to safely format numbers
const safeToFixed = (value, decimals = 2) => {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return "0." + "0".repeat(decimals);
  }
  return value.toFixed(decimals);
};

const BonLivraisonTable = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedBon, setSelectedBon] = useState(null);
  const [advancementPrice, setAdvancementPrice] = useState(0);
  const [bonStatus, setBonStatus] = useState("brouillon");

  // États simplifiés pour les dates
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());

  // Statistics states
  const [statistics, setStatistics] = useState({
    totalBons: 0,
    totalAmount: 0,
    totalAdvancements: 0,
    totalRemaining: 0,
    paidBons: 0,
    draftBons: 0,
    partiallyPaidBons: 0,
    cancelledBons: 0,
    averageAmount: 0,
    completionRate: 0,
  });

  useEffect(() => {
    const fetchBons = async () => {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(`${config_url}/api/bon-livraisons`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("API Response:", response.data);

        if (response.data.success && response.data.bons) {
          const formattedData = response.data.bons.map((bon) => {
            // Calculate total advancements if they exist
            let totalAdvancements = 0;
            if (bon.advancements && bon.advancements.length > 0) {
              totalAdvancements = bon.advancements.reduce((sum, advance) => {
                return sum + (parseFloat(advance.amount) || 0);
              }, 0);
            }

            const total = parseFloat(bon.montant_ht) || 0;
            const remainingAmount = Math.max(0, total - totalAdvancements);

            return {
              id: bon.id,
              deliveryNumber: bon.num_bon_livraison,
              customerName: bon.client?.nom_complete || "Client inconnu",
              customerPhone: bon.client?.telephone || "",
              total: total,
              advancement: totalAdvancements,
              remainingAmount: remainingAmount,
              status: bon.status || "brouillon",
              createdAt: new Date(bon.date_creation || bon.createdAt),
              createdAtString: new Date(
                bon.date_creation || bon.createdAt,
              ).toLocaleDateString("fr-FR"),
              date_livraison: bon.date_livraison,
              date_creation: bon.date_creation,
              mode_reglement: bon.mode_reglement || "espèces",
              remise: parseFloat(bon.remise) || 0,
              montant_ht: parseFloat(bon.montant_ht) || 0,
              tva: parseFloat(bon.tva) || 0,
              notes: bon.notes || "",
              produits: bon.produits || [],
              advancements: bon.advancements || [],
              is_facture: bon.is_facture || false,
            };
          });

          console.log("Formatted Data:", formattedData);
          setBookings(formattedData);
          setFilteredBookings(formattedData);
          calculateStatistics(formattedData);
        } else {
          console.error("No bons data found in response");
          setBookings([]);
          setFilteredBookings([]);
          resetStatistics();
        }
      } catch (error) {
        console.error("Error fetching bons:", error);
        topTost("Erreur lors du chargement des bons de livraison", "error");
        setBookings([]);
        setFilteredBookings([]);
        resetStatistics();
      }
    };
    fetchBons();
  }, []);

  // Calculate statistics from bookings data
  const calculateStatistics = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      resetStatistics();
      return;
    }

    // S'assurer que toutes les valeurs sont des nombres
    const totalBons = data.length;
    const totalAmount =
      parseFloat(
        data.reduce((sum, bon) => sum + (parseFloat(bon.total) || 0), 0),
      ) || 0;
    const totalAdvancements =
      parseFloat(
        data.reduce((sum, bon) => sum + (parseFloat(bon.advancement) || 0), 0),
      ) || 0;
    const totalRemaining =
      parseFloat(
        data.reduce(
          (sum, bon) => sum + (parseFloat(bon.remainingAmount) || 0),
          0,
        ),
      ) || 0;

    const paidBons = data.filter((bon) => bon.status === "payé").length;
    const draftBons = data.filter((bon) => bon.status === "brouillon").length;
    const partiallyPaidBons = data.filter(
      (bon) => bon.status === "partiellement_payée",
    ).length;
    const cancelledBons = data.filter((bon) => bon.status === "annulée").length;

    const averageAmount =
      totalBons > 0 ? parseFloat(totalAmount / totalBons) : 0;
    const completionRate =
      totalAmount > 0
        ? parseFloat(((totalAmount - totalRemaining) / totalAmount) * 100)
        : 0;

    setStatistics({
      totalBons: totalBons || 0,
      totalAmount: totalAmount || 0,
      totalAdvancements: totalAdvancements || 0,
      totalRemaining: totalRemaining || 0,
      paidBons: paidBons || 0,
      draftBons: draftBons || 0,
      partiallyPaidBons: partiallyPaidBons || 0,
      cancelledBons: cancelledBons || 0,
      averageAmount: averageAmount || 0,
      completionRate: completionRate || 0,
    });
  };

  const resetStatistics = () => {
    setStatistics({
      totalBons: 0,
      totalAmount: 0,
      totalAdvancements: 0,
      totalRemaining: 0,
      paidBons: 0,
      draftBons: 0,
      partiallyPaidBons: 0,
      cancelledBons: 0,
      averageAmount: 0,
      completionRate: 0,
    });
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

  // Filter bookings based on selected status and date range
  useEffect(() => {
    let result = [...bookings];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((bon) => bon.status === selectedStatus);
    }

    // Filter by date range (version simplifiée)
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((bon) => {
        const bonDate = new Date(bon.createdAt);
        return bonDate >= start && bonDate <= end;
      });
    }

    setFilteredBookings(result);
    calculateStatistics(result);
  }, [selectedStatus, startDate, endDate, bookings]);

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-secondary text-white",
      envoyé: "bg-primary text-white",
      payé: "bg-success text-white",
      partiellement_payée: "bg-warning text-dark",
      en_retard: "bg-danger text-white",
      annulée: "bg-dark text-white",
      en_attente: "bg-info text-white",
    };
    return colors[status] || "bg-secondary text-white";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      envoyé: "Envoyé",
      payé: "Payé",
      partiellement_payée: "Partiellement Payé",
      en_retard: "En Retard",
      annulée: "Annulé",
      en_attente: "En Attente",
    };
    return texts[status] || status;
  };

  const handleBonUpdate = (updatedBon) => {
    // Update the bookings state with the updated bon
    setBookings((prevBons) =>
      prevBons.map((bon) =>
        bon.id === updatedBon.id
          ? {
              ...bon,
              customerName: updatedBon.customerName,
              customerPhone: updatedBon.customerPhone,
              status: updatedBon.status,
              advancement: updatedBon.advancement || 0,
              remainingAmount: updatedBon.remainingAmount || updatedBon.total,
            }
          : bon,
      ),
    );

    // Also update filteredBookings to reflect changes immediately
    setFilteredBookings((prevFiltered) =>
      prevFiltered.map((bon) =>
        bon.id === updatedBon.id
          ? {
              ...bon,
              customerName: updatedBon.customerName,
              customerPhone: updatedBon.customerPhone,
              status: updatedBon.status,
              advancement: updatedBon.advancement || 0,
              remainingAmount: updatedBon.remainingAmount || updatedBon.total,
            }
          : bon,
      ),
    );

    // Recalculate statistics
    calculateStatistics(filteredBookings);

    // Show success message
    topTost("Bon de livraison mis à jour avec succès!", "success");
  };

  const handleAdvancementChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setAdvancementPrice(value);

    // Update the selected bon if it exists
    if (selectedBon) {
      const remainingAmount = selectedBon.total - value;
      setSelectedBon({
        ...selectedBon,
        advancement: value,
        remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
      });
    }
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setBonStatus(newStatus);

    if (selectedBon) {
      setSelectedBon({
        ...selectedBon,
        status: newStatus,
      });
    }
  };

  const handleDeleteBon = async (bonId) => {
    const result = await MySwal.fire({
      title: "Supprimer ce Bon de Livraison?",
      text: "Êtes-vous sûr de vouloir supprimer ce bon de livraison? Cette action est irréversible.",
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
        await axios.delete(`${config_url}/api/bon-livraisons/${bonId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBookings((prev) => prev.filter((bon) => bon.id !== bonId));
        calculateStatistics(filteredBookings.filter((bon) => bon.id !== bonId));
        topTost("Bon de livraison supprimé avec succès!", "success");
      } catch (error) {
        console.error("Delete error:", error);
        let errorMessage = "Échec de la suppression du bon de livraison";

        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = "Bon de livraison non trouvé";
          } else if (error.response.status === 409) {
            errorMessage = "Ce bon de livraison a des enregistrements associés";
          } else {
            errorMessage = error.response.data?.message || errorMessage;
          }
        }

        topTost(errorMessage, "error");
      }
    }
  };

  const handleViewBon = async (bonId) => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(
        `${config_url}/api/bon-livraisons/${bonId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        const bonData = response.data.bon;

        // Calculate total advancements
        let totalAdvancements = 0;
        if (bonData.advancements && bonData.advancements.length > 0) {
          totalAdvancements = bonData.advancements.reduce((sum, advance) => {
            return sum + (parseFloat(advance.amount) || 0);
          }, 0);
        }

        const formattedBon = {
          id: bonData.id,
          deliveryNumber: bonData.num_bon_livraison,
          customerName: bonData.client?.nom_complete || "Client inconnu",
          customerPhone: bonData.client?.telephone || "",
          total: parseFloat(bonData.montant_ttc) || 0,
          advancement: totalAdvancements,
          remainingAmount:
            (parseFloat(bonData.montant_ttc) || 0) - totalAdvancements,
          status: bonData.status || "brouillon",
          date_creation: bonData.date_creation,

          date_livraison: bonData.date_livraison
            ? new Date(bonData.date_livraison).toLocaleDateString("fr-FR")
            : "",
          mode_reglement: bonData.mode_reglement || "espèces",
          remise: parseFloat(bonData.remise) || 0,
          montant_ht: parseFloat(bonData.montant_ht) || 0,
          tva: parseFloat(bonData.tva) || 0,
          notes: bonData.notes || "",
          produits: bonData.produits || [],
          advancements: bonData.advancements || [],
          is_facture: bonData.is_facture || false,
        };

        setSelectedBon(formattedBon);
        setAdvancementPrice(totalAdvancements);
        setBonStatus(formattedBon.status);
        setIsDetailsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching bon details:", error);
      topTost("Échec du chargement des détails du bon de livraison", "error");
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
      accessorKey: "deliveryNumber",
      header: () => "N° Bon Livraison",
      cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
    },
    {
      accessorKey: "customerName",
      header: () => "Client",
      cell: ({ getValue }) => <span>{getValue()}</span>,
    },
    {
      accessorKey: "total",
      header: () => "Total a Payer",
      cell: ({ getValue }) => (
        <span>{safeToFixed(parseFloat(getValue() || 0))} Dh</span>
      ),
    },
    {
      accessorKey: "status",
      header: () => "statut",
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
      accessorKey: "createdAtString",
      header: () => "Date de Création",
      cell: ({ getValue }) => <span>{getValue()}</span>,
    },
    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => (
        <div className="hstack d-flex gap-3 justify-content-center">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => handleViewBon(row.original.id)}
            title="Voir détails"
          >
            <FiEye />
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleDeleteBon(row.original.id)}
            title="Supprimer"
          >
            <FiTrash />
          </button>
        </div>
      ),
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

  return (
    <>
      {/* Filters Section */}
      <div
        className="mb-3 d-flex align-items-center flex-wrap gap-3"
        style={{
          zIndex: 999,
        }}
      >
        {/* Status Filter */}
        <InputGroup size="lg" className="w-auto shadow-sm rounded">
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
          <InputGroup size="lg" className="w-auto shadow-sm rounded">
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

          <span className="text-muted">حتى</span>

          <InputGroup size="lg" className="w-auto shadow-sm rounded">
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
        </div>

        {/* Create Button */}
        <div>
          <Link to="/bon-livraison/create">
            <button className="btn btn-lg btn-success">
              <FiPlusCircle className="me-2" />
              Créer Nouveau Bon de Livraison
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
          ({filteredBookings.length} bons correspondants)
        </span>
      </div>

      {/* Statistics Cards Section */}
      <div
        className="mb-4"
        style={{
          marginTop: "20px", // Réduit pour tenir compte de la ligne de période
        }}
      >
        <div className="row g-3">
          {/* Total Bons Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                  <FiFileText className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Bons</h6>
                  <h3 className="mb-0">{statistics.totalBons}</h3>
                  <small className="text-muted">
                    {filteredBookings.length} affichés
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Total Amount Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiDollarSign className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Montant Total</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.totalAmount)} Dh
                  </h3>
                  <small className="text-muted">
                    Moyenne: {safeToFixed(statistics.averageAmount)} Dh
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Paid Bons Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiCheckCircle className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Bons Payés</h6>
                  <h3 className="mb-0">{statistics.paidBons}</h3>
                  <small className="text-muted">
                    {statistics.totalBons > 0
                      ? `${((statistics.paidBons / statistics.totalBons) * 100).toFixed(1)}%`
                      : "0%"}
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Draft Bons Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-secondary bg-opacity-10 rounded-circle p-3 me-3">
                  <FiClock className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Bons Brouillon</h6>
                  <h3 className="mb-0">{statistics.draftBons}</h3>
                  <small className="text-muted">En attente de traitement</small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Partially Paid Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 rounded-circle p-3 me-3">
                  <FiTrendingUp className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Partiellement Payés</h6>
                  <h3 className="mb-0">{statistics.partiallyPaidBons}</h3>
                  <small className="text-muted">
                    {safeToFixed(statistics.totalAdvancements)} Dh d'avances
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Total Remaining Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                  <FiDollarSign className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Reste à Payer</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.totalRemaining)} Dh
                  </h3>
                  <small className="text-muted">
                    {statistics.totalAmount > 0
                      ? `${((statistics.totalRemaining / statistics.totalAmount) * 100).toFixed(1)}% du total`
                      : "0%"}
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Completion Rate Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                  <FiPercent className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Taux de Paiement</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.completionRate, 1)}%
                  </h3>
                  <small className="text-muted">
                    {statistics.totalAmount > 0
                      ? `${safeToFixed(statistics.totalAmount - statistics.totalRemaining)} Dh collectés`
                      : "0 Dh collectés"}
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Cancelled Bons Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-dark bg-opacity-10 rounded-circle p-3 me-3">
                  <FiFileText className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Bons Annulés</h6>
                  <h3 className="mb-0">{statistics.cancelledBons}</h3>
                  <small className="text-muted">
                    {statistics.totalBons > 0
                      ? `${((statistics.cancelledBons / statistics.totalBons) * 100).toFixed(1)}%`
                      : "0%"}
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="mt-4">
        <Table
          data={filteredBookings}
          columns={columns}
          enableRowSelection={true}
        />
      </div>

      {/* BonLivrDetailsModal */}
      <BonLivrDetailsModal
        isOpen={isDetailsModalOpen}
        toggle={() => setIsDetailsModalOpen(false)}
        onUpdate={handleBonUpdate}
        bon={selectedBon}
      />
    </>
  );
};

export default BonLivraisonTable;
