import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
  Button,
  Input,
} from "reactstrap";
import {
  FiX,
  FiPrinter,
  FiDownload,
  FiSave,
  FiPlus,
  FiTrash2,
  FiUser,
  FiCalendar,
  FiCreditCard,
  FiDollarSign,
  FiPercent,
} from "react-icons/fi";
import DatePicker from "react-datepicker";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import "react-datepicker/dist/react-datepicker.css";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

// Updated status options
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "payé", label: "Payé" },
  { value: "partiellement_payée", label: "Partiellement Payé" },
  { value: "annulée", label: "Annulé" },
];

// Payment methods
const paymentMethodOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
];

const BonLivrDetailsModal = ({ isOpen, toggle, bon, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    status: "brouillon",
    notes: "",
    remise: 0,
    date_livraison: null, // Initialiser à null au lieu de new Date()
    advancements: [],
  });

  // Initialize form data when bon changes
  useEffect(() => {
    if (bon) {
      console.log("Bon data for debugging:", {
        id: bon.id,
        montant_ht: bon.montant_ht,
        montant_ttc: bon.montant_ttc,
        remise: bon.remise,
        produits: bon.produits?.length,
        advancements: bon.advancements?.length,
        totalProduits: calculateTotalFromProduits(bon.produits),
      });

      const formattedAdvancements = bon.advancements
        ? bon.advancements.map((adv) => ({
            id: adv.id,
            amount: parseFloat(adv.amount) || 0,
            paymentDate: adv.paymentDate
              ? new Date(adv.paymentDate)
              : new Date(),
            paymentMethod: adv.paymentMethod || "espece",
            reference: adv.reference || "",
            notes: adv.notes || "",
          }))
        : [];

      // Fonction pour créer une date valide
      const parseDate = (dateString) => {
        if (!dateString) return null;
        try {
          const date = new Date(dateString);
          return isNaN(date.getTime()) ? null : date;
        } catch (error) {
          console.error("Error parsing date:", error);
          return null;
        }
      };

      setFormData({
        status: bon.status || "brouillon",
        notes: bon.notes || "",
        remise: parseFloat(bon.remise) || 0,
        date_livraison: parseDate(bon.date_livraison),
        advancements: formattedAdvancements,
      });
    }
  }, [bon]);

  // Fonction pour calculer le total à partir des produits
  const calculateTotalFromProduits = (produits) => {
    if (!produits || !Array.isArray(produits)) return 0;

    return produits.reduce((total, prod) => {
      const ligneTotal = parseFloat(prod.BonLivraisonProduit?.total_ligne) || 0;
      return total + ligneTotal;
    }, 0);
  };

  if (!bon) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "warning";
      case "payé":
        return "success";
      case "partiellement_payée":
        return "primary";
      case "annulée":
        return "dark";
      default:
        return "secondary";
    }
  };

  // Calculer les totaux CORRIGÉS avec remise dynamique
  const sousTotal = calculateTotalFromProduits(bon.produits);
  const remise = parseFloat(formData.remise) || 0; // Utiliser formData.remise au lieu de bon.remise
  const montantHT = Math.max(0, sousTotal - remise);
  const montantTotal = parseFloat(bon.montant_ttc) || montantHT;

  const totalAdvancements = formData.advancements.reduce(
    (sum, adv) => sum + parseFloat(adv.amount || 0),
    0,
  );

  const resteAPayer = Math.max(0, montantTotal - totalAdvancements);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Advancement handlers
  const addAdvancement = () => {
    const newAdvancement = {
      id: Date.now(),
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: "espece",
      reference: "",
      notes: "",
    };
    setFormData((prev) => ({
      ...prev,
      advancements: [...prev.advancements, newAdvancement],
    }));
  };

  const removeAdvancement = async (index) => {
    const result = await MySwal.fire({
      title: "Supprimer cet acompte?",
      text: "Êtes-vous sûr de vouloir supprimer cet acompte?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer!",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      const updatedAdvancements = formData.advancements.filter(
        (_, i) => i !== index,
      );
      setFormData((prev) => ({
        ...prev,
        advancements: updatedAdvancements,
      }));
    }
  };

  const handleAdvancementChange = (index, field, value) => {
    const updatedAdvancements = [...formData.advancements];

    if (field === "amount") {
      const newAmount = parseFloat(value) || 0;
      // Vérifier que le montant ne dépasse pas le reste à payer
      const totalSansCeluiCi = updatedAdvancements.reduce(
        (sum, adv, i) =>
          i === index ? sum : sum + parseFloat(adv.amount || 0),
        0,
      );

      if (newAmount + totalSansCeluiCi > montantTotal) {
        topTost("Le total des acomptes dépasse le montant total!", "error");
        return;
      }

      updatedAdvancements[index] = {
        ...updatedAdvancements[index],
        [field]: newAmount,
      };
    } else {
      updatedAdvancements[index] = {
        ...updatedAdvancements[index],
        [field]: field === "paymentDate" ? value : value,
      };
    }

    setFormData((prev) => ({
      ...prev,
      advancements: updatedAdvancements,
    }));
  };

  const handlePrint = () => {
    if (!bon) return;

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR");
    };

    console.log("Infos Bom:" + JSON.stringify(bon));
    const issueDate = bon.date_creation
      ? new Date(bon.date_creation)
      : new Date();

    const printWindow = window.open("", "_blank");

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Bon Livraison ${bon.deliveryNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      margin: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .invoice-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .table th, .table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    .table th {
      background-color: #f5f5f5;
    }
    .totals {
      text-align: right;
      margin-top: 20px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">Bon de Livraison</h2>
    <p style="margin: 5px 0;">ALUMINIUM OULAD BRAHIM</p>
    <p style="margin: 0;">Tél: +212 661-431237</p>
  </div>

  <div class="invoice-info">
    <div>
      <p><strong>Client:</strong> ${bon.customerName || ""}</p>
      <p><strong>Date livraison:</strong> ${formatDate(bon.date_livraison)}</p>
    </div>
    <div style="text-align:right;">
      <p><strong>N° Bon:</strong> ${bon.deliveryNumber}</p>
      <p><strong>Date création:</strong> ${formatDate(issueDate)}</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix U. (Dh)</th>
        <th>Total (Dh)</th>
      </tr>
    </thead>
    <tbody>
      ${(bon.produits || [])
        .map(
          (prod) => `
        <tr>
          <td>${prod.reference || "N/A"}</td>
          <td>${prod.designation || "Produit"}</td>
          <td>${prod.BonLivraisonProduit?.quantite || 0}</td>
          <td>${parseFloat(
            prod.BonLivraisonProduit?.prix_unitaire || 0,
          ).toFixed(2)}</td>
          <td>${parseFloat(prod.BonLivraisonProduit?.total_ligne || 0).toFixed(2)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Sous-total produits:</strong> ${sousTotal.toFixed(2)} Dh</p>
    ${remise > 0 ? `<p><strong>Remise globale:</strong> -${remise.toFixed(2)} Dh</p>` : ""}
    <p><strong>Montant HT:</strong> ${montantHT.toFixed(2)} Dh</p>
    <p style="font-size:14px; font-weight:bold;">
      <strong>Montant TTC:</strong> ${montantTotal.toFixed(2)} Dh
    </p>
    
    ${
      totalAdvancements > 0
        ? `
      <p><strong>Total acomptes:</strong> -${totalAdvancements.toFixed(2)} Dh</p>
      <p style="font-weight:bold; color:${resteAPayer > 0 ? "#dc3545" : "#28a745"}">
        <strong>Reste à payer:</strong> ${resteAPayer.toFixed(2)} Dh
      </p>
    `
        : ""
    }
  </div>

</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const generateAndDownloadPDF = async () => {
    try {
      const pdfContainer = document.createElement("div");
      pdfContainer.id = "pdf-container";
      pdfContainer.style.width = "210mm";
      pdfContainer.style.minHeight = "297mm";
      pdfContainer.style.padding = "15mm 20mm";
      pdfContainer.style.background = "white";
      pdfContainer.style.color = "#000";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      pdfContainer.style.fontSize = "11px";
      pdfContainer.style.lineHeight = "1.5";
      pdfContainer.style.position = "absolute";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.top = "0";

      const formatDate = (date) => {
        if (!date) return "";
        const d = new Date(date);
        return isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR");
      };

      const issueDate = bon.date_creation
        ? new Date(bon.date_creation)
        : new Date();

      pdfContainer.innerHTML = `
    <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
      <h1 style="margin:0; color:#2c5aa0;">Bon de Livraison</h1>
      <h3 style="margin:5px 0;">ALUMINIUM OULAD BRAHIM</h3>
      <p style="font-size:10px;">Tél: +212 661-431237</p>
    </div>

    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
      <div>
        <h4 style="margin-bottom:5px;">Client</h4>
        <p><strong>Nom:</strong> ${bon.customerName || "Client inconnu"}</p>
        <p><strong>Date livraison:</strong> ${formatDate(bon.date_livraison)}</p>
      </div>
      <div style="text-align:right;">
        <h4 style="margin-bottom:5px;">Informations du Bon</h4>
        <p><strong>N°:</strong> ${bon.deliveryNumber}</p>
        <p><strong>Date création:</strong> ${formatDate(issueDate)}</p>
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
      <thead>
        <tr style="background-color:#2c5aa0; color:#fff;">
          <th style="padding:6px; border:1px solid #2c5aa0;">Code</th>
          <th style="padding:6px; border:1px solid #2c5aa0;">Produit</th>
          <th style="padding:6px; border:1px solid #2c5aa0;">Qté</th>
          <th style="padding:6px; border:1px solid #2c5aa0;">Prix U.</th>
          <th style="padding:6px; border:1px solid #2c5aa0;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${(bon.produits || [])
          .map(
            (prod, i) => `
          <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
            <td style="border:1px solid #ddd; padding:5px;">${prod.reference || "N/A"}</td>
            <td style="border:1px solid #ddd; padding:5px;">${prod.designation || "Produit"}</td>
            <td style="border:1px solid #ddd; padding:5px; text-align:center;">${
              prod.BonLivraisonProduit?.quantite || 0
            }</td>
            <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(
              prod.BonLivraisonProduit?.prix_unitaire || 0,
            ).toFixed(2)} Dh</td>
            <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(
              prod.BonLivraisonProduit?.total_ligne || 0,
            ).toFixed(2)} Dh</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <div style="text-align:right; margin-top:20px;">
      <p><strong>Sous-total produits:</strong> ${sousTotal.toFixed(2)} Dh</p>
      ${
        remise > 0
          ? `<p><strong>Remise globale:</strong> -${remise.toFixed(2)} Dh</p>`
          : ""
      }
      <p><strong>Montant HT:</strong> ${montantHT.toFixed(2)} Dh</p>
      <p style="font-size:13px; font-weight:bold; color:#2c5aa0;">
        <strong>Montant TTC:</strong> ${montantTotal.toFixed(2)} Dh
      </p>
      
      ${
        totalAdvancements > 0
          ? `
        <p><strong>Total acomptes:</strong> -${totalAdvancements.toFixed(2)} Dh</p>
        <p style="font-weight:bold; color:${
          resteAPayer > 0 ? "#dc3545" : "#28a745"
        }">
          <strong>Reste à payer:</strong> ${resteAPayer.toFixed(2)} Dh
        </p>
      `
          : ""
      }
    </div>
    `;

      document.body.appendChild(pdfContainer);

      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
      });

      document.body.removeChild(pdfContainer);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`Bon-Livraison-${bon.deliveryNumber}.pdf`);
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };

  const handleSubmit = async () => {
    // Valider que le total des acomptes ne dépasse pas le montant total
    if (totalAdvancements > montantTotal) {
      topTost(
        "Le total des acomptes ne peut pas dépasser le montant total",
        "error",
      );
      return;
    }

    // Valider les acomptes individuels
    for (const adv of formData.advancements) {
      if (!adv.amount || adv.amount <= 0) {
        topTost("Tous les acomptes doivent avoir un montant positif", "error");
        return;
      }
      if (!adv.paymentDate) {
        topTost("Tous les acomptes doivent avoir une date", "error");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Préparer les données pour le backend
      const updateData = {
        status: formData.status,
        notes: formData.notes,
        remise: formData.remise,
        date_livraison: formData.date_livraison
          ? formData.date_livraison.toISOString().split("T")[0]
          : null,
        advancements: formData.advancements.map((adv) => ({
          id: adv.id,
          amount: adv.amount,
          paymentDate: adv.paymentDate.toISOString().split("T")[0],
          paymentMethod: adv.paymentMethod,
          reference: adv.reference,
          notes: adv.notes,
        })),
      };

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.put(
        `${config_url}/api/bon-livraisons/${bon.id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      topTost("Bon de livraison mis à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.bon || response.data);
      }

      toggle();
    } catch (error) {
      console.error("Error updating bon:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la mise à jour du bon de livraison";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return "";

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";

    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR");
  };

  // Get date from bon
  const issueDate = bon.date_creation
    ? new Date(bon.date_creation)
    : new Date();

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        <div className="d-flex align-items-center">
          <FiPrinter className="me-2" />
          Bon de Livraison #{bon.num_bon_livraison}
          <Badge color={getStatusBadge(formData.status)} className="ms-2">
            {statusOptions.find((opt) => opt.value === formData.status)
              ?.label || formData.status}
          </Badge>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="row">
          {/* Client Information */}
          <div className="col-md-6">
            <div className="mb-3">
              <h6>
                <FiUser className="me-2" />
                Client
              </h6>
              <div className="p-3 bg-light rounded">
                <p>
                  <strong>Nom:</strong> {bon.customerName || "Client inconnu"}
                </p>
                <p>
                  <strong>Téléphone:</strong>{" "}
                  {bon.customerPhone || "Non spécifié"}
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <h6>
                <FiCalendar className="me-2" />
                Informations du Bon
              </h6>
              <div className="p-3 bg-light rounded">
                <p>
                  <strong>Date création:</strong> {formatDate(issueDate)}{" "}
                </p>

                {/* Date de Livraison modifiable */}
                <div className="form-group mb-2">
                  <label className="form-label d-block">
                    <strong>Date livraison:</strong>
                  </label>
                  <DatePicker
                    selected={formData.date_livraison}
                    onChange={(date) =>
                      handleInputChange("date_livraison", date)
                    }
                    className="form-control form-control-sm"
                    dateFormat="dd/MM/yyyy"
                    showTimeSelect={false}
                    todayButton="Aujourd'hui"
                    isClearable
                    placeholderText="Sélectionner une date"
                  />
                </div>

                <p>
                  <strong>Mode règlement:</strong>{" "}
                  {bon.mode_reglement || "Non spécifié"}
                </p>
              </div>
            </div>
          </div>

          {/* Status, Remise and Notes */}
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">
                <FiCreditCard className="me-2" />
                Statut
              </label>
              <Input
                type="select"
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Input>
            </div>
          </div>

          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">
                <FiPercent className="me-2" />
                Remise Globale
              </label>
              <div className="input-group">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.remise}
                  onChange={(e) => {
                    const newRemise = parseFloat(e.target.value) || 0;
                    handleInputChange("remise", newRemise);
                  }}
                  placeholder="Montant de la remise"
                />
                <span className="input-group-text">DH</span>
              </div>
              <small className="text-muted">
                Remise totale appliquée au bon
              </small>
            </div>
          </div>

          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Notes</label>
              <Input
                type="textarea"
                rows="3"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>

          {/* Advancements Section */}
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>
                <FiDollarSign className="me-2" />
                Acomptes
              </h6>
              <Button color="primary" size="sm" onClick={addAdvancement}>
                <FiPlus className="me-1" />
                Ajouter Acompte
              </Button>
            </div>

            {formData.advancements.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant (Dh)</th>
                      <th>Méthode</th>
                      <th>Référence</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.advancements.map((advancement, index) => (
                      <tr key={advancement.id || index}>
                        <td>
                          <DatePicker
                            selected={advancement.paymentDate}
                            onChange={(date) =>
                              handleAdvancementChange(
                                index,
                                "paymentDate",
                                date,
                              )
                            }
                            className="form-control form-control-sm"
                            dateFormat="dd/MM/yyyy"
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            className="form-control-sm"
                            value={advancement.amount}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "amount",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                        <td>
                          <Input
                            type="select"
                            className="form-control-sm"
                            value={advancement.paymentMethod}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "paymentMethod",
                                e.target.value,
                              )
                            }
                          >
                            {paymentMethodOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Input>
                        </td>
                        <td>
                          <Input
                            type="text"
                            className="form-control-sm"
                            value={advancement.reference}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "reference",
                                e.target.value,
                              )
                            }
                            placeholder="N° chèque, référence..."
                          />
                        </td>
                        <td>
                          <Input
                            type="text"
                            className="form-control-sm"
                            value={advancement.notes}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "notes",
                                e.target.value,
                              )
                            }
                            placeholder="Notes..."
                          />
                        </td>
                        <td>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => removeAdvancement(index)}
                          >
                            <FiTrash2 />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                Aucun acompte enregistré. Cliquez sur "Ajouter Acompte" pour en
                ajouter.
              </div>
            )}
          </div>

          {/* Products Section */}
          <div className="col-12 mt-4">
            <h6>Produits</h6>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Prix Unitaire</th>
                    <th>Remise Ligne</th>
                    <th>Total Ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {(bon.produits || []).map((prod, index) => (
                    <tr key={prod.id || index}>
                      <td>{prod.reference || "N/A"}</td>
                      <td>{prod.designation || "Produit"}</td>
                      <td>{prod.BonLivraisonProduit?.quantite || 0}</td>
                      <td>
                        {parseFloat(
                          prod.BonLivraisonProduit?.prix_unitaire || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(
                          prod.BonLivraisonProduit?.remise_ligne || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(
                          prod.BonLivraisonProduit?.total_ligne || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section CORRIGÉE */}
          <div className="col-12 mt-4">
            <div className="bg-light p-3 rounded">
              <div className="row">
                <div className="col-md-6">
                  <h6>Résumé</h6>
                  <p>
                    <strong>N° Bon:</strong> {bon.deliveryNumber}
                  </p>
                  <p>
                    <strong>Client:</strong>{" "}
                    {bon.customerName || "Client inconnu"}
                  </p>
                  <p>
                    <strong>Statut:</strong>{" "}
                    {
                      statusOptions.find((opt) => opt.value === formData.status)
                        ?.label
                    }
                  </p>
                  <p>
                    <strong>Date livraison:</strong>{" "}
                    {formData.date_livraison
                      ? formatDateOnly(formData.date_livraison)
                      : "Non définie"}
                  </p>
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
                  <div className="d-flex justify-content-between">
                    <span>Sous-total produits:</span>
                    <span>{sousTotal.toFixed(2)} Dh</span>
                  </div>
                  {remise > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>
                        <FiPercent className="me-1" />
                        Remise globale:
                      </span>
                      <span>-{remise.toFixed(2)} Dh</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Montant HT:</span>
                    <span>{montantHT.toFixed(2)} Dh</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold text-primary">
                    <span>Montant TTC:</span>
                    <span>{montantTotal.toFixed(2)} Dh</span>
                  </div>

                  {totalAdvancements > 0 && (
                    <>
                      <div className="d-flex justify-content-between text-success mt-2">
                        <span>Total acomptes:</span>
                        <span>{totalAdvancements.toFixed(2)} Dh</span>
                      </div>
                      <div className="d-flex justify-content-between fw-bold border-top pt-1 mt-1">
                        <span>Reste à payer:</span>
                        <span
                          className={
                            resteAPayer > 0 ? "text-warning" : "text-success"
                          }
                        >
                          {resteAPayer.toFixed(2)} Dh
                        </span>
                      </div>
                      <div className="mt-2">
                        <small className="text-muted">
                          {resteAPayer === 0
                            ? "✅ Bon entièrement payé"
                            : `⚠️ Reste ${resteAPayer.toFixed(2)} Dh à payer`}
                        </small>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="d-flex justify-content-between w-100">
          <div>
            <Button
              onClick={handlePrint}
              color="outline-primary"
              className="me-2"
            >
              <FiPrinter className="me-2" />
              Imprimer
            </Button>
            <Button
              onClick={generateAndDownloadPDF}
              color="outline-secondary"
              className="mt-4"
            >
              <FiDownload className="me-2" />
              PDF
            </Button>
          </div>

          <div>
            <Button onClick={toggle} color="secondary" className="me-2">
              <FiX className="me-2" />
              Fermer
            </Button>
            <Button
              onClick={handleSubmit}
              color="primary"
              disabled={isSubmitting}
              className="mt-4"
            >
              <FiSave className="me-2" />
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default BonLivrDetailsModal;
