import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
  Button,
  Input,
  Label,
} from "reactstrap";
import {
  FiX,
  FiPrinter,
  FiDownload,
  FiSave,
  FiPlus,
  FiTrash2,
  FiEye,
  FiFileText,
  FiDollarSign,
  FiPercent,
  FiCalendar,
  FiUser,
  FiClock,
  FiCreditCard,
  FiTag,
  FiCheckCircle,
  FiXCircle,
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
import { format, parseISO, isBefore } from "date-fns";
import { fr } from "date-fns/locale";

const MySwal = withReactContent(Swal);

// Invoice status options matching your backend
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "payée", label: "Payée" },
  { value: "partiellement_payée", label: "Partiellement Payée" },
  { value: "annulée", label: "Annulée" },
];

// Payment methods for advancements
const paymentMethodOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
];

// Payment types
const paymentTypeOptions = [
  { value: "paiement", label: "Paiement" },
  { value: "acompte", label: "Acompte" },
  { value: "avoir", label: "Avoir" },
];

const FactureDetailsModal = ({
  isOpen,
  toggle,
  facture,
  onUpdate,
  footerContent,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    status: "brouillon",
    notes: "",
    advancements: [],
    mode_reglement: "espèces",
  });

  // Initialize form data when facture changes
  useEffect(() => {
    if (facture) {
      console.log("Initializing form with facture:", facture);

      // Check if invoice is overdue
      const isOverdue = facture.dueDateRaw
        ? isBefore(parseISO(facture.dueDateRaw), new Date()) &&
          !facture.isFullyPaid
        : false;

      setFormData({
        status: facture.status || "brouillon",
        notes: facture.notes || "",
        mode_reglement: facture.mode_reglement || "espèces",
        advancements: facture.advancements
          ? facture.advancements.map((adv) => ({
              id: adv.id,
              amount: parseFloat(adv.amount) || 0,
              paymentDate: adv.paymentDate
                ? new Date(adv.paymentDate)
                : new Date(),
              paymentMethod: adv.paymentMethod || "espece",
              paymentType: adv.type || "paiement",
              reference: adv.reference || "",
              notes: adv.notes || "",
            }))
          : [],
        isOverdue: isOverdue,
      });
    }
  }, [facture]);

  if (!facture) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "warning";
      case "payée":
        return "success";
      case "partiellement_payée":
        return "primary";
      case "annulée":
        return "dark";
      default:
        return "secondary";
    }
  };

  const getPaymentStatusBadge = () => {
    if (formData.isOverdue) return "danger";
    if (facture.isFullyPaid) return "success";
    if (facture.paidAmount > 0) return "warning";
    return "danger";
  };

  // Calculate total payments
  const totalPayments = formData.advancements.reduce(
    (sum, adv) => sum + parseFloat(adv.amount || 0),
    0,
  );

  const totalTTC = parseFloat(facture.totalTTC) || 0;
  const remainingAmount = Math.max(0, totalTTC - totalPayments);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Payment handlers
  const addPayment = () => {
    const newPayment = {
      id: Date.now(), // Temporary ID for new payments
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: "espece",
      paymentType: "paiement",
      reference: "",
      notes: "",
    };
    setFormData((prev) => ({
      ...prev,
      advancements: [...prev.advancements, newPayment],
    }));
  };

  const removePayment = async (index) => {
    const result = await MySwal.fire({
      title: "Supprimer ce paiement?",
      text: "Êtes-vous sûr de vouloir supprimer ce paiement?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer!",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      const updatedPayments = formData.advancements.filter(
        (_, i) => i !== index,
      );
      setFormData((prev) => ({
        ...prev,
        advancements: updatedPayments,
      }));
    }
  };

  const handlePaymentChange = (index, field, value) => {
    const updatedPayments = [...formData.advancements];
    updatedPayments[index] = {
      ...updatedPayments[index],
      [field]:
        field === "paymentDate"
          ? value
          : field === "paymentMethod" ||
              field === "paymentType" ||
              field === "reference" ||
              field === "notes"
            ? value
            : parseFloat(value) || 0,
    };
    setFormData((prev) => ({
      ...prev,
      advancements: updatedPayments,
    }));
  };

  const handleSubmit = async () => {
    // Validate payments don't exceed total
    if (totalPayments > totalTTC) {
      topTost(
        "Le total des paiements ne peut pas dépasser le montant TTC",
        "error",
      );
      return;
    }

    // Validate individual payments
    for (const payment of formData.advancements) {
      if (!payment.amount || payment.amount <= 0) {
        topTost("Tous les paiements doivent avoir un montant positif", "error");
        return;
      }
      if (!payment.paymentDate) {
        topTost("Tous les paiements doivent avoir une date", "error");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare the data for backend
      const updateData = {
        status: formData.status,
        mode_reglement: formData.mode_reglement,
        notes: formData.notes,
        advancements: formData.advancements.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          paymentDate: payment.paymentDate.toISOString().split("T")[0],
          paymentMethod: payment.paymentMethod,
          type: payment.paymentType,
          reference: payment.reference,
          notes: payment.notes,
        })),
      };

      console.log("Sending update data to backend:", updateData);

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.put(
        `${config_url}/api/factures/${facture.id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Update response from backend:", response.data);

      topTost("Facture mise à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.facture || response.data);
      }

      toggle();
    } catch (error) {
      console.error("Error updating facture:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la mise à jour de la facture";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelFacture = async () => {
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
        `${config_url}/api/factures/${facture.id}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      topTost("Facture annulée avec succès!", "success");

      if (onUpdate) {
        onUpdate({
          ...facture,
          status: "annulée",
          isFullyPaid: false,
          paymentStatus: "annulée",
        });
      }

      toggle();
    } catch (error) {
      console.error("Error cancelling facture:", error);
      const errorMessage =
        error.response?.data?.message || "Échec de l'annulation de la facture";
      topTost(errorMessage, "error");
    }
  };

  const handlePrint = () => {
    if (!facture) return;

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return format(d, "dd/MM/yyyy", { locale: fr });
    };

    const issueDate = facture.invoiceDate
      ? new Date(facture.invoiceDate)
      : facture.createdAt || new Date();

    const printWindow = window.open("", "_blank");
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Facture ${facture.invoiceNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      margin: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .company-info, .invoice-info {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .info-block {
      flex: 1;
      min-width: 220px;
    }
    .info-block p {
      margin: 3px 0;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .table th, .table td {
      border: 1px solid #ddd;
      padding: 6px;
      text-align: left;
    }
    .table th {
      background-color: #f5f5f5;
    }
    .totals {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-top: 20px;
    }
    .totals p {
      margin: 2px 0;
    }
    .advancements {
      margin-top: 25px;
    }
    .advancements h3 {
      margin-bottom: 5px;
      font-size: 12px;
    }
    .notes {
      margin-top: 20px;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #333;
      padding-top: 15px;
      text-align: center;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: bold;
      margin-left: 5px;
    }
    .status-brouillon { background: #ffc107; color: #000; }
    .status-payée { background: #28a745; color: #fff; }
    .status-partiellement_payée { background: #007bff; color: #fff; }
    .status-annulée { background: #6c757d; color: #fff; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">Facture</h2>
    <p style="margin: 5px 0;">Hassan - Aluminium-Inox</p>
    <p style="margin: 0;">Tél: +212 661-431237</p>
  </div>

  <div class="invoice-info">
    <div class="info-block">
      <p><strong>Nom Client:</strong> ${facture.clientName}</p>
      <p><strong>Téléphone:</strong> ${facture.clientPhone || "Non spécifié"}</p>
    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>N° Facture:</strong> ${facture.invoiceNumber} 
        <span class="status-badge status-${facture.status}">${facture.status}</span>
      </p>
      <p><strong>Date facturation:</strong> ${formatDate(issueDate)}</p>
      <p><strong>Date échéance:</strong> ${formatDate(facture.dueDateRaw)}</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix U.</th>
        <th>Remise Ligne</th>
        <th>Total Ligne</th>
      </tr>
    </thead>
    <tbody>
      ${(facture.products || [])
        .map(
          (prod) => `
        <tr>
          <td>${prod.reference || "N/A"}</td>
          <td>${prod.designation || "Produit"}</td>
          <td>${prod.FactureProduit?.quantite || 0}</td>
          <td>${parseFloat(prod.FactureProduit?.prix_unitaire || 0).toFixed(2)} Dh</td>
          <td>${parseFloat(prod.FactureProduit?.remise_ligne || 0).toFixed(2)} Dh</td>
          <td>${parseFloat(prod.FactureProduit?.total_ligne || 0).toFixed(2)} Dh</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Total HT:</strong> ${facture.totalHT.toFixed(2)} Dh</p>
    ${
      facture.globalDiscount > 0
        ? `<p><strong>Remise globale:</strong> -${facture.globalDiscount.toFixed(2)} Dh</p>`
        : ""
    }
    <p><strong>HT après remise:</strong> ${(facture.totalHT - facture.globalDiscount).toFixed(2)} Dh</p>
    <p><strong>TVA (${facture.tva}%):</strong> ${facture.montantTVA.toFixed(2)} Dh</p>
    <p><strong>Total TTC:</strong> ${facture.totalTTC.toFixed(2)} Dh</p>
    ${
      totalPayments > 0
        ? `
      <p><strong>Total payé:</strong> -${totalPayments.toFixed(2)} Dh</p>
      <p style="font-weight:bold; font-size:11px; color:${remainingAmount > 0 ? "#dc3545" : "#28a745"}">
        <strong>Reste à payer:</strong> ${remainingAmount.toFixed(2)} Dh
      </p>
    `
        : ""
    }
  </div>

  ${
    facture.isLinkedToBL && facture.bon_livraison
      ? `
    <div class="notes">
      <p><strong>Note:</strong> Cette facture est basée sur le Bon de Livraison ${facture.bon_livraison.num_bon_livraison}</p>
    </div>
  `
      : ""
  }

  ${
    facture.notes
      ? `
    <div class="notes">
      <p><strong>Notes:</strong> ${facture.notes}</p>
    </div>
  `
      : ""
  }

  <div class="footer">
    <p>Mode de règlement: ${facture.mode_reglement || "Espèces"}</p>
    <p>Merci de votre confiance!</p>
  </div>
</body>
</html>
`;

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
        return format(new Date(date), "dd/MM/yyyy", { locale: fr });
      };

      const issueDate = facture.invoiceDate
        ? new Date(facture.invoiceDate)
        : facture.createdAt || new Date();

      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">Facture</h1>
        <h3 style="margin:5px 0;">Hassan - Aluminium-Inox</h3>
        <p style="font-size:10px;">Tél: +212 661-431237</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div>
          <h4 style="margin-bottom:5px;">Client</h4>
          <p><strong>Nom:</strong> ${facture.clientName}</p>
          ${facture.clientPhone ? `<p><strong>Téléphone:</strong> ${facture.clientPhone}</p>` : ""}
        </div>
        <div style="text-align:right;">
          <h4 style="margin-bottom:5px;">Informations de la Facture</h4>
          <p><strong>N°:</strong> ${facture.invoiceNumber}</p>
          <p><strong>Date facturation:</strong> ${formatDate(issueDate)}</p>
          <p><strong>Date échéance:</strong> ${formatDate(facture.dueDateRaw)}</p>
          <p><strong>Mode règlement:</strong> ${facture.mode_reglement || "Espèces"}</p>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
        <thead>
          <tr style="background-color:#2c5aa0; color:#fff;">
            <th style="padding:6px; border:1px solid #2c5aa0;">Code</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Désignation</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Qté</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Prix U.</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Remise Ligne</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Total Ligne</th>
          </tr>
        </thead>
        <tbody>
          ${(facture.products || [])
            .map(
              (prod, i) => `
            <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
              <td style="border:1px solid #ddd; padding:5px;">${prod.reference || "N/A"}</td>
              <td style="border:1px solid #ddd; padding:5px;">${prod.designation || "Produit"}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:center;">${prod.FactureProduit?.quantite || 0}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(prod.FactureProduit?.prix_unitaire || 0).toFixed(2)} Dh</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(prod.FactureProduit?.remise_ligne || 0).toFixed(2)} Dh</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(prod.FactureProduit?.total_ligne || 0).toFixed(2)} Dh</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        <p><strong>Total HT:</strong> ${facture.totalHT.toFixed(2)} Dh</p>
        ${
          facture.globalDiscount > 0
            ? `<p><strong>Remise globale:</strong> -${facture.globalDiscount.toFixed(2)} Dh</p>`
            : ""
        }
        <p><strong>HT après remise:</strong> ${(facture.totalHT - facture.globalDiscount).toFixed(2)} Dh</p>
        <p><strong>TVA (${facture.tva}%):</strong> ${facture.montantTVA.toFixed(2)} Dh</p>
        <p style="font-size:13px; font-weight:bold; color:#2c5aa0;">
          <strong>Total TTC:</strong> ${facture.totalTTC.toFixed(2)} Dh
        </p>
        ${
          totalPayments > 0
            ? `
          <p><strong>Total payé:</strong> -${totalPayments.toFixed(2)} Dh</p>
          <p style="font-size:13px; font-weight:bold; color:${remainingAmount > 0 ? "#dc3545" : "#28a745"};">
            <strong>Reste à payer:</strong> ${remainingAmount.toFixed(2)} Dh
          </p>
        `
            : ""
        }
      </div>

      ${
        facture.isLinkedToBL && facture.bon_livraison
          ? `
        <div style="margin-top:20px; padding:10px; background:#f8f9fa; border-radius:5px;">
          <p style="margin:0;"><strong>Note:</strong> Cette facture est basée sur le Bon de Livraison ${facture.bon_livraison.num_bon_livraison}</p>
        </div>
      `
          : ""
      }

      ${
        facture.notes
          ? `
        <div style="margin-top:15px; padding:10px; background:#f8f9fa; border-radius:5px;">
          <p style="margin:0;"><strong>Notes:</strong> ${facture.notes}</p>
        </div>
      `
          : ""
      }
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

        while (heightLeft > 1) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`Facture-${facture.invoiceNumber}.pdf`);
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        <div className="d-flex align-items-center">
          <FiFileText className="me-2" />
          Facture #{facture.invoiceNumber}
          <Badge color={getStatusBadge(formData.status)} className="ms-2">
            {statusOptions.find((opt) => opt.value === formData.status)
              ?.label || formData.status}
          </Badge>
          <Badge color={getPaymentStatusBadge()} className="ms-2">
            {formData.isOverdue
              ? "En Retard"
              : facture.isFullyPaid
                ? "Payée"
                : facture.paidAmount > 0
                  ? "Part. Payée"
                  : "Impayée"}
          </Badge>
          {facture.isLinkedToBL && (
            <Badge color="info" className="ms-2">
              <FiTag className="me-1" />
              BL: {facture.bon_livraison?.num_bon_livraison || "N/A"}
            </Badge>
          )}
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="row">
          {/* Client Information (Read-only) */}
          <div className="col-md-6">
            <div className="mb-3">
              <h6>
                <FiUser className="me-2" />
                Client
              </h6>
              <div className="p-3 bg-light rounded">
                <p>
                  <strong>Nom:</strong> {facture.clientName}
                </p>
                <p>
                  <strong>Téléphone:</strong>{" "}
                  {facture.clientPhone || "Non spécifié"}
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <h6>
                <FiCalendar className="me-2" />
                Informations de la Facture
              </h6>
              <div className="p-3 bg-light rounded">
                <p>
                  <strong>Date création:</strong>{" "}
                  {format(facture.createdAt, "dd/MM/yyyy", { locale: fr })}
                </p>
                <p>
                  <strong>Date facturation:</strong> {facture.invoiceDate}
                </p>
                <p>
                  <strong>Date échéance:</strong>{" "}
                  <span
                    className={formData.isOverdue ? "text-danger fw-bold" : ""}
                  >
                    {facture.dueDate}
                    {formData.isOverdue && <FiClock className="ms-1" />}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Status, Payment Method and Notes (Editable) */}
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">
                <FiFileText className="me-2" />
                Statut *
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
                <FiCreditCard className="me-2" />
                Mode de Règlement
              </label>
              <Input
                type="select"
                value={formData.mode_reglement}
                onChange={(e) =>
                  handleInputChange("mode_reglement", e.target.value)
                }
              >
                <option value="espèces">Espèces</option>
                <option value="carte_bancaire">Carte Bancaire</option>
                <option value="chèque">Chèque</option>
                <option value="virement">Virement</option>
                <option value="autre">Autre</option>
              </Input>
            </div>
          </div>

          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">
                <FiFileText className="me-2" />
                Notes
              </label>
              <Input
                type="textarea"
                rows="2"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>

          {/* Payments Section */}
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>
                <FiDollarSign className="me-2" />
                Paiements
              </h6>
              <Button color="primary" size="sm" onClick={addPayment}>
                <FiPlus className="me-1" />
                Ajouter Paiement
              </Button>
            </div>

            {formData.advancements.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant (Dh)</th>
                      <th>Type</th>
                      <th>Méthode</th>
                      <th>Référence</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.advancements.map((payment, index) => (
                      <tr key={payment.id || index}>
                        <td>
                          <DatePicker
                            selected={payment.paymentDate}
                            onChange={(date) =>
                              handlePaymentChange(index, "paymentDate", date)
                            }
                            className="form-control form-control-sm"
                            dateFormat="dd/MM/yyyy"
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            className="form-control-sm"
                            value={payment.amount}
                            onChange={(e) =>
                              handlePaymentChange(
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
                            value={payment.paymentType}
                            onChange={(e) =>
                              handlePaymentChange(
                                index,
                                "paymentType",
                                e.target.value,
                              )
                            }
                          >
                            {paymentTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Input>
                        </td>
                        <td>
                          <Input
                            type="select"
                            className="form-control-sm"
                            value={payment.paymentMethod}
                            onChange={(e) =>
                              handlePaymentChange(
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
                            value={payment.reference}
                            onChange={(e) =>
                              handlePaymentChange(
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
                            value={payment.notes}
                            onChange={(e) =>
                              handlePaymentChange(
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
                            onClick={() => removePayment(index)}
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
                Aucun paiement enregistré. Cliquez sur "Ajouter Paiement" pour
                en ajouter.
              </div>
            )}
          </div>

          {/* Products Section (Read-only) */}
          <div className="col-12 mt-4">
            <h6>
              <FiEye className="me-2" />
              Produits
            </h6>
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
                  {(facture.products || []).map((prod, index) => (
                    <tr key={prod.id || index}>
                      <td>{prod.reference || "N/A"}</td>
                      <td>{prod.designation || "Produit"}</td>
                      <td>{prod.FactureProduit?.quantite || 0}</td>
                      <td>
                        {parseFloat(
                          prod.FactureProduit?.prix_unitaire || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(
                          prod.FactureProduit?.remise_ligne || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(
                          prod.FactureProduit?.total_ligne || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          <div className="col-12">
            <div className="bg-light p-3 rounded mt-3">
              <div className="row">
                <div className="col-md-6">
                  <h6>Résumé de la Facture</h6>
                  <p>
                    <strong>N° Facture:</strong> {facture.invoiceNumber}
                  </p>
                  <p>
                    <strong>Client:</strong> {facture.clientName}
                  </p>
                  <p>
                    <strong>Statut:</strong>{" "}
                    {
                      statusOptions.find((opt) => opt.value === formData.status)
                        ?.label
                    }
                  </p>
                  {facture.isLinkedToBL && facture.bon_livraison && (
                    <p>
                      <strong>BL lié:</strong>{" "}
                      {facture.bon_livraison.num_bon_livraison}
                    </p>
                  )}
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
                  <div className="d-flex justify-content-between">
                    <span>Total HT:</span>
                    <span>{facture.totalHT.toFixed(2)} Dh</span>
                  </div>
                  {facture.globalDiscount > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Remise globale:</span>
                      <span>-{facture.globalDiscount.toFixed(2)} Dh</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between">
                    <span>HT après remise:</span>
                    <span>
                      {(facture.totalHT - facture.globalDiscount).toFixed(2)} Dh
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-success">
                    <span>TVA ({facture.tva}%):</span>
                    <span>{facture.montantTVA.toFixed(2)} Dh</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Total TTC:</span>
                    <span>{facture.totalTTC.toFixed(2)} Dh</span>
                  </div>
                  {totalPayments > 0 && (
                    <>
                      <div className="d-flex justify-content-between text-primary">
                        <span>Total payé:</span>
                        <span>{totalPayments.toFixed(2)} Dh</span>
                      </div>
                      <div className="d-flex justify-content-between fw-bold border-top pt-1">
                        <span>Reste à payer:</span>
                        <span
                          className={
                            remainingAmount > 0
                              ? "text-warning"
                              : "text-success"
                          }
                        >
                          {remainingAmount.toFixed(2)} Dh
                        </span>
                      </div>
                    </>
                  )}
                  {formData.isOverdue && (
                    <div className="d-flex justify-content-between text-danger fw-bold mt-2">
                      <span>
                        <FiClock className="me-1" />
                        Retard de paiement
                      </span>
                      <span>!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        {footerContent && <div className="w-100 mb-3">{footerContent}</div>}

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
              className="me-2"
            >
              <FiDownload className="me-2" />
              Télécharger PDF
            </Button>
            {facture.status !== "annulée" && (
              <Button
                onClick={handleCancelFacture}
                color="outline-danger"
                className="mt-4"
              >
                <FiXCircle className="me-2" />
                Annuler la Facture
              </Button>
            )}
          </div>

          <div>
            <Button onClick={toggle} color="secondary" className="me-2">
              <FiX className="me-2" />
              Fermer
            </Button>
            {facture.status !== "annulée" && (
              <Button
                onClick={handleSubmit}
                color="primary"
                disabled={isSubmitting}
              >
                <FiSave className="me-2" />
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default FactureDetailsModal;
