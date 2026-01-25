import React, { useState, useEffect } from "react";
import axios from "axios";
import FactureDetailsModal from "./FactureDetailsModal";
import Table from "@/components/shared/table/Table";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { format, subDays, parseISO, isBefore } from "date-fns";
import {
  FiEye,
  FiFilter,
  FiCalendar,
  FiPlusCircle,
  FiTrash,
  FiPrinter,
  FiFileText,
  FiUser,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiTag,
  FiDollarSign,
  FiTrendingUp,
  FiPercent,
  FiAlertCircle,
  FiPackage,
  FiCreditCard,
  FiBarChart,
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

// Invoice status options matching your backend
const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "payée", label: "Payée" },
  { value: "partiellement_payée", label: "Partiellement Payée" },
  { value: "annulée", label: "Annulée" },
];

const FactureTable = () => {
  const [factures, setFactures] = useState([]);
  const [filteredFactures, setFilteredFactures] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [factureStatus, setFactureStatus] = useState("brouillon");
  const [isPaidFilter, setIsPaidFilter] = useState("all");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("all");

  // Statistics states
  const [statistics, setStatistics] = useState({
    totalFactures: 0,
    totalAmountTTC: 0,
    totalAmountHT: 0,
    totalTVACollected: 0,
    totalPaid: 0,
    totalRemaining: 0,
    paidFactures: 0,
    draftFactures: 0,
    partiallyPaidFactures: 0,
    cancelledFactures: 0,
    overdueFactures: 0,
    linkedToBLCount: 0,
    averageInvoiceAmount: 0,
    paymentCompletionRate: 0,
    overdueAmount: 0,
  });

  useEffect(() => {
    fetchFactures();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const clientOptions = [{ value: "all", label: "Tous les clients" }];
      if (response.data?.clients) {
        response.data.clients.forEach((client) => {
          clientOptions.push({
            value: client.id,
            label: `${client.nom_complete} ${client.telephone ? `- ${client.telephone}` : ""}`,
          });
        });
      }

      setClients(clientOptions);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchFactures = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/factures`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("API Factures Response:", response.data);

      if (response.data.success && response.data.factures) {
        const formattedData = response.data.factures.map((facture) => {
          // Calculate payment status
          const isFullyPaid = facture.isFullyPaid || false;
          const isOverdue = facture.date_echeance
            ? isBefore(parseISO(facture.date_echeance), new Date()) &&
              !isFullyPaid
            : false;

          return {
            id: facture.id,
            invoiceNumber: facture.num_facture,
            clientName: facture.client?.nom_complete || "Client inconnu",
            clientPhone: facture.client?.telephone || "",
            clientId: facture.client_id,
            totalHT: parseFloat(facture.montant_ht) || 0,
            tva: parseFloat(facture.tva) || 0,
            montantTVA: parseFloat(facture.montant_tva) || 0,
            totalTTC: parseFloat(facture.montant_ttc) || 0,
            paidAmount: parseFloat(facture.montant_paye) || 0,
            remainingAmount: parseFloat(facture.montant_restant) || 0,
            globalDiscount: parseFloat(facture.remise_total) || 0,
            status: facture.status || "brouillon",
            paymentStatus: facture.paymentStatus || "impayée",
            createdAt: parseISO(facture.date_creation || facture.createdAt),
            createdAtString: new Date(
              facture.date_creation || facture.createdAt,
            ).toLocaleDateString("fr-FR"),
            invoiceDate: facture.date_facturation
              ? new Date(facture.date_facturation).toLocaleDateString("fr-FR")
              : "",
            dueDate: facture.date_echeance
              ? new Date(facture.date_echeance).toLocaleDateString("fr-FR")
              : "",
            dueDateRaw: facture.date_echeance,
            mode_reglement: facture.mode_reglement || "espèces",
            notes: facture.notes || "",
            products: facture.produits || [],
            advancements: facture.advancements || [],
            bon_livraison: facture.bon_livraison,
            isFullyPaid: isFullyPaid,
            isOverdue: isOverdue,
            isLinkedToBL: !!facture.bon_livraison_id,
          };
        });

        console.log("Formatted Factures Data:", formattedData);
        setFactures(formattedData);
        setFilteredFactures(formattedData);
        calculateStatistics(formattedData);
      } else {
        console.error("No factures data found in response");
        setFactures([]);
        setFilteredFactures([]);
        resetStatistics();
      }
    } catch (error) {
      console.error("Error fetching factures:", error);
      topTost("Erreur lors du chargement des factures", "error");
      setFactures([]);
      setFilteredFactures([]);
      resetStatistics();
    }
  };

  // Calculate statistics from factures data
  const calculateStatistics = (data) => {
    if (!data || data.length === 0) {
      resetStatistics();
      return;
    }

    const totalFactures = data.length;
    const totalAmountTTC = data.reduce((sum, f) => sum + (f.totalTTC || 0), 0);
    const totalAmountHT = data.reduce((sum, f) => sum + (f.totalHT || 0), 0);
    const totalTVACollected = data.reduce(
      (sum, f) => sum + (f.montantTVA || 0),
      0,
    );
    const totalPaid = data.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
    const totalRemaining = data.reduce(
      (sum, f) => sum + (f.remainingAmount || 0),
      0,
    );

    const paidFactures = data.filter((f) => f.status === "payée").length;
    const draftFactures = data.filter((f) => f.status === "brouillon").length;
    const partiallyPaidFactures = data.filter(
      (f) => f.status === "partiellement_payée",
    ).length;
    const cancelledFactures = data.filter((f) => f.status === "annulée").length;
    const overdueFactures = data.filter((f) => f.isOverdue).length;
    const linkedToBLCount = data.filter((f) => f.isLinkedToBL).length;

    const overdueAmount = data
      .filter((f) => f.isOverdue)
      .reduce((sum, f) => sum + (f.remainingAmount || 0), 0);

    const averageInvoiceAmount =
      totalFactures > 0 ? totalAmountTTC / totalFactures : 0;
    const paymentCompletionRate =
      totalAmountTTC > 0 ? (totalPaid / totalAmountTTC) * 100 : 0;

    setStatistics({
      totalFactures,
      totalAmountTTC,
      totalAmountHT,
      totalTVACollected,
      totalPaid,
      totalRemaining,
      paidFactures,
      draftFactures,
      partiallyPaidFactures,
      cancelledFactures,
      overdueFactures,
      linkedToBLCount,
      averageInvoiceAmount,
      paymentCompletionRate,
      overdueAmount,
    });
  };

  const resetStatistics = () => {
    setStatistics({
      totalFactures: 0,
      totalAmountTTC: 0,
      totalAmountHT: 0,
      totalTVACollected: 0,
      totalPaid: 0,
      totalRemaining: 0,
      paidFactures: 0,
      draftFactures: 0,
      partiallyPaidFactures: 0,
      cancelledFactures: 0,
      overdueFactures: 0,
      linkedToBLCount: 0,
      averageInvoiceAmount: 0,
      paymentCompletionRate: 0,
      overdueAmount: 0,
    });
  };

  // Filter factures based on selected criteria
  useEffect(() => {
    let result = [...factures];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((facture) => facture.status === selectedStatus);
    }

    // Filter by payment status
    if (isPaidFilter !== "all") {
      if (isPaidFilter === "paid") {
        result = result.filter((facture) => facture.isFullyPaid);
      } else if (isPaidFilter === "unpaid") {
        result = result.filter((facture) => !facture.isFullyPaid);
      } else if (isPaidFilter === "overdue") {
        result = result.filter((facture) => facture.isOverdue);
      }
    }

    // Filter by client
    if (selectedClient !== "all") {
      result = result.filter((facture) => facture.clientId == selectedClient);
    }

    // Filter by date range
    if (dateRange[0].startDate && dateRange[0].endDate) {
      const start = new Date(dateRange[0].startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dateRange[0].endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((facture) => {
        const invoiceDate = new Date(facture.createdAt);
        return invoiceDate >= start && invoiceDate <= end;
      });
    }

    setFilteredFactures(result);
    calculateStatistics(result);
  }, [selectedStatus, isPaidFilter, selectedClient, dateRange, factures]);

  const handleDateRangeChange = (ranges) => {
    setDateRange([ranges.selection]);
    setShowDatePicker(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-secondary text-white",
      payée: "bg-success text-white",
      partiellement_payée: "bg-warning text-dark",
      annulée: "bg-dark text-white",
    };
    return colors[status] || "bg-secondary text-white";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      payée: "Payée",
      partiellement_payée: "Part. Payée",
      annulée: "Annulée",
    };
    return texts[status] || status;
  };

  const handleFactureUpdate = (updatedFacture) => {
    // Update the factures state with the updated invoice
    setFactures((prevFactures) =>
      prevFactures.map((facture) =>
        facture.id === updatedFacture.id
          ? {
              ...facture,
              status: updatedFacture.status,
              paidAmount: updatedFacture.paidAmount || 0,
              remainingAmount:
                updatedFacture.remainingAmount || updatedFacture.totalTTC,
              isFullyPaid: updatedFacture.isFullyPaid || false,
              isOverdue: updatedFacture.isOverdue || false,
              paymentStatus: updatedFacture.paymentStatus || "impayée",
            }
          : facture,
      ),
    );

    // Also update filteredFactures to reflect changes immediately
    setFilteredFactures((prevFiltered) =>
      prevFiltered.map((facture) =>
        facture.id === updatedFacture.id
          ? {
              ...facture,
              status: updatedFacture.status,
              paidAmount: updatedFacture.paidAmount || 0,
              remainingAmount:
                updatedFacture.remainingAmount || updatedFacture.totalTTC,
              isFullyPaid: updatedFacture.isFullyPaid || false,
              isOverdue: updatedFacture.isOverdue || false,
              paymentStatus: updatedFacture.paymentStatus || "impayée",
            }
          : facture,
      ),
    );

    // Recalculate statistics
    calculateStatistics(filteredFactures);

    // Show success message
    topTost("Facture mise à jour avec succès!", "success");
  };

  const handlePaymentChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setPaymentAmount(value);

    // Update the selected facture if it exists
    if (selectedFacture) {
      const remainingAmount =
        selectedFacture.totalTTC - (selectedFacture.paidAmount + value);
      const isFullyPaid = remainingAmount <= 0;

      setSelectedFacture({
        ...selectedFacture,
        paidAmount: selectedFacture.paidAmount + value,
        remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
        isFullyPaid: isFullyPaid,
        paymentStatus: isFullyPaid ? "payée" : "partiellement payée",
      });
    }
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setFactureStatus(newStatus);

    if (selectedFacture) {
      setSelectedFacture({
        ...selectedFacture,
        status: newStatus,
      });
    }
  };

  const handleAddPayment = async () => {
    if (!selectedFacture || paymentAmount <= 0) {
      topTost("Veuillez entrer un montant valide", "warning");
      return;
    }

    const result = await MySwal.fire({
      title: "Ajouter un paiement?",
      html: `
        <div class="text-start">
          <p><strong>Facture:</strong> ${selectedFacture.invoiceNumber}</p>
          <p><strong>Montant TTC:</strong> ${selectedFacture.totalTTC.toFixed(2)} Dh</p>
          <p><strong>Déjà payé:</strong> ${selectedFacture.paidAmount.toFixed(2)} Dh</p>
          <p><strong>Nouveau paiement:</strong> ${paymentAmount.toFixed(2)} Dh</p>
          <p><strong>Reste après paiement:</strong> ${(selectedFacture.remainingAmount - paymentAmount).toFixed(2)} Dh</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, ajouter",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) return;

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.patch(
        `${config_url}/api/factures/${selectedFacture.id}/payment`,
        {
          amount: paymentAmount,
          paymentMethod: "espece",
          paymentDate: new Date().toISOString().split("T")[0],
          type: "paiement",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        // Refresh the facture data
        fetchFactures();

        // Update selected facture
        const updatedFacture = {
          ...selectedFacture,
          paidAmount: response.data.facture.montant_paye,
          remainingAmount: response.data.facture.montant_restant,
          status: response.data.facture.status,
          isFullyPaid: response.data.facture.montant_restant <= 0,
          paymentStatus:
            response.data.facture.montant_restant <= 0
              ? "payée"
              : "partiellement payée",
        };

        setSelectedFacture(updatedFacture);
        setPaymentAmount(0);

        topTost("Paiement ajouté avec succès!", "success");
      }
    } catch (error) {
      console.error("Error adding payment:", error);
      const errorMsg =
        error.response?.data?.message || "Erreur lors de l'ajout du paiement";
      topTost(errorMsg, "error");
    }
  };

  const handleCancelFacture = async (factureId) => {
    const result = await MySwal.fire({
      title: "Annuler cette facture?",
      text: "Êtes-vous sûr de vouloir annuler cette facture? Cette action est irréversible.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, annuler!",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) return;

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.patch(
        `${config_url}/api/factures/${factureId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Refresh the list
      fetchFactures();

      // If the cancelled facture is the selected one, close the modal
      if (selectedFacture && selectedFacture.id === factureId) {
        setIsDetailsModalOpen(false);
      }

      topTost("Facture annulée avec succès!", "success");
    } catch (error) {
      console.error("Cancel error:", error);
      const errorMessage =
        error.response?.data?.message || "Échec de l'annulation de la facture";
      topTost(errorMessage, "error");
    }
  };

  const handleDeleteFacture = async (factureId) => {
    const result = await MySwal.fire({
      title: "Supprimer cette facture?",
      text: "Êtes-vous sûr de vouloir supprimer cette facture? Cette action est irréversible.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer!",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) return;

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.delete(`${config_url}/api/factures/${factureId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFactures((prev) => prev.filter((facture) => facture.id !== factureId));
      calculateStatistics(filteredFactures.filter((f) => f.id !== factureId));
      topTost("Facture supprimée avec succès!", "success");
    } catch (error) {
      console.error("Delete error:", error);
      let errorMessage = "Échec de la suppression de la facture";

      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = "Facture non trouvée";
        } else if (error.response.status === 409) {
          errorMessage = "Cette facture a des paiements associés";
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      }

      topTost(errorMessage, "error");
    }
  };

  const handleViewFacture = async (factureId) => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(
        `${config_url}/api/factures/${factureId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        const factureData = response.data.facture;

        // Check if overdue
        const isOverdue = factureData.date_echeance
          ? isBefore(parseISO(factureData.date_echeance), new Date()) &&
            !factureData.isFullyPaid
          : false;

        const formattedFacture = {
          id: factureData.id,
          invoiceNumber: factureData.num_facture,
          clientName: factureData.client?.nom_complete || "Client inconnu",
          clientPhone: factureData.client?.telephone || "",
          clientId: factureData.client_id,
          totalHT: parseFloat(factureData.montant_ht) || 0,
          tva: parseFloat(factureData.tva) || 0,
          remise_total: parseFloat(factureData.remise_total) || 0,

          montantTVA: parseFloat(factureData.montant_tva) || 0,
          totalTTC: parseFloat(factureData.montant_ttc) || 0,
          paidAmount: parseFloat(factureData.montant_paye) || 0,
          remainingAmount: parseFloat(factureData.montant_restant) || 0,
          globalDiscount: parseFloat(factureData.remise_total) || 0,
          status: factureData.status || "brouillon",
          paymentStatus: factureData.paymentStatus || "impayée",
          createdAt: parseISO(
            factureData.date_creation || factureData.createdAt,
          ),
          createdAtString: new Date(
            factureData.date_creation || factureData.createdAt,
          ).toLocaleDateString("fr-FR"),
          invoiceDate: factureData.date_facturation
            ? new Date(factureData.date_facturation).toLocaleDateString("fr-FR")
            : "",
          dueDate: factureData.date_echeance
            ? new Date(factureData.date_echeance).toLocaleDateString("fr-FR")
            : "",
          dueDateRaw: factureData.date_echeance,
          mode_reglement: factureData.mode_reglement || "espèces",
          notes: factureData.notes || "",
          products: factureData.produits || [],
          advancements: factureData.advancements || [],
          bon_livraison: factureData.bon_livraison,
          isFullyPaid: factureData.isFullyPaid || false,
          isOverdue: isOverdue,
          isLinkedToBL: !!factureData.bon_livraison_id,
        };

        setSelectedFacture(formattedFacture);
        setPaymentAmount(0);
        setFactureStatus(formattedFacture.status);
        setIsDetailsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching facture details:", error);
      topTost("Échec du chargement des détails de la facture", "error");
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
      accessorKey: "invoiceNumber",
      header: () => "N° Facture",
      cell: ({ getValue }) => (
        <span className="font-mono fw-bold">{getValue()}</span>
      ),
    },
    {
      accessorKey: "clientName",
      header: () => "Client",
      cell: ({ getValue }) => <span>{getValue()}</span>,
    },
    {
      accessorKey: "totalTTC",
      header: () => "Total TTC",
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
      accessorKey: "createdAtString",
      header: () => "Créée le",
      cell: ({ getValue }) => <span>{getValue()}</span>,
    },
    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => (
        <div className="hstack d-flex gap-2 justify-content-center">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => handleViewFacture(row.original.id)}
            title="Voir détails"
          >
            <FiEye />
          </button>

          {row.original.status !== "annulée" && (
            <>
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={() => handleCancelFacture(row.original.id)}
                title="Annuler"
              >
                <FiXCircle />
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleDeleteFacture(row.original.id)}
                title="Supprimer"
              >
                <FiTrash />
              </button>
            </>
          )}
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
        <InputGroup size="sm" className="w-auto shadow-sm rounded">
          <InputGroupText className="bg-white border-0">
            <FiFilter className="text-white fs-6" />
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
            <FiUser className="text-white fs-6" />
          </InputGroupText>
          <Input
            type="select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="border-0 bg-white"
          >
            {clients.map((client) => (
              <option key={client.value} value={client.value}>
                {client.label}
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
          <Link to="/facture/create">
            <button className="btn btn-sm btn-success">
              <FiPlusCircle className="me-2" />
              Nouvelle Facture
            </button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards Section */}
      <div
        className="mb-4"
        style={{
          marginTop: "60px",
        }}
      >
        <div className="row g-3">
          {/* Total Factures Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                  <FiFileText className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Factures</h6>
                  <h3 className="mb-0">{statistics.totalFactures}</h3>
                  <small className="text-muted">
                    {filteredFactures.length} affichées
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Total TTC Amount Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiDollarSign className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Montant TTC</h6>
                  <h3 className="mb-0">
                    {statistics.totalAmountTTC.toFixed(2)} Dh
                  </h3>
                  <small className="text-muted">
                    Moyenne: {statistics.averageInvoiceAmount.toFixed(2)} Dh
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Total HT Amount Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                  <FiBarChart className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Montant HT</h6>
                  <h3 className="mb-0">
                    {statistics.totalAmountHT.toFixed(2)} Dh
                  </h3>
                  <small className="text-muted">
                    TVA: {statistics.totalTVACollected.toFixed(2)} Dh
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Paid Amount Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiCreditCard className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Montant Payé</h6>
                  <h3 className="mb-0">{statistics.totalPaid.toFixed(2)} Dh</h3>
                  <small className="text-muted">
                    Taux: {statistics.paymentCompletionRate.toFixed(1)}%
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Remaining Amount Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 rounded-circle p-3 me-3">
                  <FiDollarSign className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Reste à Payer</h6>
                  <h3 className="mb-0">
                    {statistics.totalRemaining.toFixed(2)} Dh
                  </h3>
                  <small className="text-muted">
                    {statistics.totalAmountTTC > 0
                      ? `${((statistics.totalRemaining / statistics.totalAmountTTC) * 100).toFixed(1)}% du total`
                      : "0%"}
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Overdue Factures Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                  <FiAlertCircle className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Factures En Retard</h6>
                  <h3 className="mb-0">{statistics.overdueFactures}</h3>
                  <small className="text-muted">
                    {statistics.overdueAmount.toFixed(2)} Dh en retard
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Paid Factures Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiCheckCircle className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Factures Payées</h6>
                  <h3 className="mb-0">{statistics.paidFactures}</h3>
                  <small className="text-muted">
                    {statistics.totalFactures > 0
                      ? `${((statistics.paidFactures / statistics.totalFactures) * 100).toFixed(1)}%`
                      : "0%"}
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Linked to BL Card */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                  <FiPackage className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Liées à BL</h6>
                  <h3 className="mb-0">{statistics.linkedToBLCount}</h3>
                  <small className="text-muted">
                    {statistics.totalFactures > 0
                      ? `${((statistics.linkedToBLCount / statistics.totalFactures) * 100).toFixed(1)}%`
                      : "0%"}
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Summary Alert */}
      <div className="mt-4">
        <div className="alert alert-info mb-3">
          <div className="d-flex justify-content-between">
            <div>
              <FiFileText className="me-2" />
              <strong>{filteredFactures.length}</strong> facture(s) trouvée(s)
            </div>
            <div>
              <strong>Total TTC: </strong>
              {filteredFactures
                .reduce((sum, f) => sum + f.totalTTC, 0)
                .toFixed(2)}{" "}
              Dh |<strong className="ms-3">Payé: </strong>
              {filteredFactures
                .reduce((sum, f) => sum + f.paidAmount, 0)
                .toFixed(2)}{" "}
              Dh |<strong className="ms-3">Reste: </strong>
              {filteredFactures
                .reduce((sum, f) => sum + f.remainingAmount, 0)
                .toFixed(2)}{" "}
              Dh
            </div>
          </div>
        </div>

        <Table
          data={filteredFactures}
          columns={columns}
          enableRowSelection={true}
        />
      </div>

      {/* FactureDetailsModal */}
      <FactureDetailsModal
        isOpen={isDetailsModalOpen}
        toggle={() => setIsDetailsModalOpen(false)}
        onUpdate={handleFactureUpdate}
        facture={selectedFacture}
      />
    </>
  );
};

export default FactureTable;
