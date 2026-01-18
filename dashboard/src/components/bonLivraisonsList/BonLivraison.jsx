import React, { useState, useEffect } from "react";
import axios from "axios";
import BonLivrDetailsModal from "./BonLivrDetailsModal";
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
} from "react-icons/fi";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import { Input, InputGroup, InputGroupText, Label } from "reactstrap";
import withReactContent from "sweetalert2-react-content";
import { Link } from "react-router-dom";

const MySwal = withReactContent(Swal);

// Updated status options to match your backend
const statusOptions = [
  { value: "all", label: "Tous les statuss" },
  { value: "brouillon", label: "Brouillon" },
  { value: "payé", label: "Payé" },
  { value: "partiellement payé", label: "Partiellement Payé" },
  { value: "annulé", label: "Annulé" },
];

const BonLivraisonTable = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
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
  const [selectedBon, setSelectedBon] = useState(null);
  const [advancementPrice, setAdvancementPrice] = useState(0);
  const [bonStatus, setBonStatus] = useState("brouillon");

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

            const total = parseFloat(bon.montant_ttc) || 0;
            const remainingAmount = total - totalAdvancements;

            return {
              id: bon.id,
              deliveryNumber: bon.num_bon_livraison,
              customerName: bon.client?.nom_complete || "Client inconnu",
              customerPhone: bon.client?.telephone || "",
              total: total,
              advancement: totalAdvancements,
              remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
              status: bon.status || "brouillon",
              createdAt: new Date(bon.date_creation || bon.createdAt),
              createdAtString: new Date(
                bon.date_creation || bon.createdAt,
              ).toLocaleDateString("fr-FR"),
              date_livraison: bon.date_livraison
                ? new Date(bon.date_livraison).toLocaleDateString("fr-FR")
                : "",
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
        } else {
          console.error("No bons data found in response");
          setBookings([]);
          setFilteredBookings([]);
        }
      } catch (error) {
        console.error("Error fetching bons:", error);
        topTost("Erreur lors du chargement des bons de livraison", "error");
        setBookings([]);
        setFilteredBookings([]);
      }
    };
    fetchBons();
  }, []);

  // Filter bookings based on selected status and date range
  useEffect(() => {
    let result = [...bookings];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((bon) => bon.status === selectedStatus);
    }

    // Filter by date range
    if (dateRange[0].startDate && dateRange[0].endDate) {
      const start = new Date(dateRange[0].startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dateRange[0].endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((bon) => {
        const bonDate = new Date(bon.createdAt);
        return bonDate >= start && bonDate <= end;
      });
    }

    setFilteredBookings(result);
  }, [selectedStatus, dateRange, bookings]);

  const handleDateRangeChange = (ranges) => {
    setDateRange([ranges.selection]);
    setShowDatePicker(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-secondary text-white",
      envoyé: "bg-primary text-white",
      payé: "bg-success text-white",
      "partiellement payé": "bg-warning text-dark",
      en_retard: "bg-danger text-white",
      annulé: "bg-dark text-white",
      en_attente: "bg-info text-white",
    };
    return colors[status] || "bg-secondary text-white";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      envoyé: "Envoyé",
      payé: "Payé",
      "partiellement payé": "Partiellement Payé",
      en_retard: "En Retard",
      annulé: "Annulé",
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

  // Send bon via WhatsApp
  const handleSendWhatsApp = async () => {
    if (!selectedBon) return;

    try {
      // Generate WhatsApp message
      const message = `Bonjour ${selectedBon.customerName},

Votre Bon de Livraison ${selectedBon.deliveryNumber} :

Montant HT: ${selectedBon.montant_ht} Dh
TVA: ${selectedBon.tva} Dh
Total TTC: ${selectedBon.total} Dh
Acompte: ${advancementPrice} Dh
Reste à payer: ${selectedBon.total - advancementPrice} Dh

Mode de règlement: ${selectedBon.mode_reglement}
Date de livraison: ${selectedBon.date_livraison}

Merci de votre confiance!`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${selectedBon.customerPhone.replace(
        /\D/g,
        "",
      )}?text=${encodedMessage}`;

      // Open WhatsApp in new tab
      window.open(whatsappUrl, "_blank");

      topTost("Bon de livraison envoyé via WhatsApp!", "success");
    } catch (error) {
      console.error("Error sending bon:", error);
      topTost("Erreur lors de l'envoi du bon de livraison", "error");
    }
  };

  // Upload PDF bon
  const handleUploadPDF = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedBon) return;

    if (file.type !== "application/pdf") {
      topTost("Veuillez sélectionner un fichier PDF", "error");
      return;
    }

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("bonId", selectedBon.id);

      await axios.post(
        `${config_url}/api/bon-livraisons/upload-pdf`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      topTost("PDF téléchargé avec succès!", "success");
    } catch (error) {
      console.error("Error uploading PDF:", error);
      topTost("Erreur lors du téléchargement du PDF", "error");
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
      header: () => "Total TTC",
      cell: ({ getValue }) => (
        <span>{parseFloat(getValue()).toFixed(2)} Dh</span>
      ),
    },
    {
      accessorKey: "advancement",
      header: () => "Avancements",
      cell: ({ getValue }) => (
        <span>{parseFloat(getValue()).toFixed(2)} Dh</span>
      ),
    },
    {
      accessorKey: "remainingAmount",
      header: () => "Reste à Payer",
      cell: ({ row }) => {
        const remaining = parseFloat(row.original.remainingAmount);
        return (
          <span
            className={remaining > 0 ? "text-danger fw-bold" : "text-success"}
          >
            {remaining.toFixed(2)} Dh
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => "status",
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
      <div
        className="mb-3 d-flex align-items-center flex-wrap gap-3"
        style={{
          zIndex: 999,
          marginTop: "60px",
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
        <div>
          <Link to="/bon-livraison/create">
            <button className="btn btn-sm btn-success">
              <FiPlusCircle className="me-2" />
              Créer Nouveau Bon de Livraison
            </button>
          </Link>
        </div>
      </div>
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
        footerContent={
          selectedBon && (
            <div className="container-fluid">
              <div className="row mb-3">
                <div className="col-md-6">
                  <Label for="statusSelect">status du Bon</Label>
                  <Input
                    type="select"
                    id="statusSelect"
                    value={bonStatus}
                    onChange={handleStatusChange}
                  >
                    {statusOptions
                      .filter((option) => option.value !== "all")
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </Input>
                </div>
                <div className="col-md-6">
                  <Label for="advancementInput">Ajouter Acompte (Dh)</Label>
                  <Input
                    type="number"
                    id="advancementInput"
                    value={advancementPrice}
                    onChange={handleAdvancementChange}
                    min="0"
                    max={selectedBon?.total || 0}
                    placeholder="Montant de l'acompte"
                  />
                  {selectedBon && (
                    <small className="text-muted">
                      Total: {selectedBon.total.toFixed(2)} Dh | Reste:{" "}
                      {(selectedBon.total - advancementPrice).toFixed(2)} Dh
                    </small>
                  )}
                </div>
              </div>
            </div>
          )
        }
      />
    </>
  );
};

export default BonLivraisonTable;
