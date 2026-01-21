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

// Move totalToFrenchText outside and make it synchronous
const totalToFrenchText = (amount) => {
  if (amount === 0) return "Zéro dirham";

  const units = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
  ];
  const teens = [
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
    "dix-sept",
    "dix-huit",
    "dix-neuf",
  ];
  const tens = [
    "",
    "",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante",
    "quatre-vingt",
    "quatre-vingt",
  ];

  const convertLessThanOneThousand = (num) => {
    if (num === 0) return "";

    let result = "";

    // Hundreds
    if (num >= 100) {
      const h = Math.floor(num / 100);
      result += h === 1 ? "cent" : units[h] + " cent";
      num %= 100;
      if (num === 0 && h > 1) result += "s"; // deux cents
      if (num > 0) result += " ";
    }

    // Tens & units
    if (num < 10) {
      result += units[num];
    } else if (num < 20) {
      result += teens[num - 10];
    } else {
      const t = Math.floor(num / 10);
      const u = num % 10;

      if (t === 7) {
        result += "soixante";
        result += u === 1 ? " et onze" : "-" + teens[u];
      } else if (t === 9) {
        result += "quatre-vingt";
        result += "-" + teens[u];
      } else {
        result += tens[t];
        if (u === 1 && t !== 8) {
          result += " et un";
        } else if (u > 0) {
          result += "-" + units[u];
        }
        if (t === 8 && u === 0) result += "s"; // quatre-vingts
      }
    }

    return result;
  };
  const convertNumberToWords = (num) => {
    if (num === 0) return "zéro";

    let result = "";

    // Billions (not needed for our use case, but kept for completeness)
    if (num >= 1000000000) {
      const billions = Math.floor(num / 1000000000);
      result += convertLessThanOneThousand(billions) + " milliard";
      if (billions > 1) result += "s";
      num %= 1000000000;
      if (num > 0) result += " ";
    }

    // Millions
    if (num >= 1000000) {
      const millions = Math.floor(num / 1000000);
      result += convertLessThanOneThousand(millions) + " million";
      if (millions > 1) result += "s";
      num %= 1000000;
      if (num > 0) result += " ";
    }

    // Thousands
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      if (thousands === 1) {
        result += "mille";
      } else {
        result += convertLessThanOneThousand(thousands) + " mille";
      }
      num %= 1000;
      if (num > 0) {
        if (num < 100) result += " ";
        else result += " ";
      }
    }

    // Hundreds, tens and units
    if (num > 0) {
      result += convertLessThanOneThousand(num);
    }

    return result.trim();
  };

  const dirhams = Math.floor(amount);
  const centimes = Math.round((amount - dirhams) * 100);

  let text = convertNumberToWords(dirhams) + " dirham";
  if (dirhams > 1) text += "s";

  if (centimes > 0) {
    text += " et " + convertNumberToWords(centimes) + " centime";
    if (centimes > 1) text += "s";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
};

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
  const [totalText, setTotalText] = useState("");
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);

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

  // Calculate total in French text
  useEffect(() => {
    const calculateTotalText = () => {
      if (facture) {
        const total = parseFloat(facture.montant_ttc || facture.totalTTC) || 0;
        if (total > 0) {
          setIsCalculatingTotal(true);
          try {
            const text = totalToFrenchText(total);
            setTotalText(text);
          } catch (error) {
            console.error("Error converting total to French text:", error);
            setTotalText(`${total.toFixed(2)} dirhams`);
          } finally {
            setIsCalculatingTotal(false);
          }
        } else {
          setTotalText("Zéro dirham");
        }
      }
    };

    if (facture) {
      calculateTotalText();
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

  // Calculate total payments from form data
  const totalPayments = formData.advancements.reduce(
    (sum, adv) => sum + parseFloat(adv.amount || 0),
    0,
  );

  // Calculate HT before global discount from products for display
  const calculateHTBeforeDiscount = () => {
    if (facture.products && facture.products.length > 0) {
      return facture.products.reduce((sum, prod) => {
        const totalLigne = parseFloat(prod.FactureProduit?.total_ligne || 0);
        return sum + totalLigne;
      }, 0);
    }
    return facture.totalHT || 0;
  };

  const totalHTBeforeDiscount = calculateHTBeforeDiscount();
  const globalDiscount = parseFloat(facture.globalDiscount || 0);
  const montantHTAfterRemise = totalHTBeforeDiscount - globalDiscount;
  const montantTVA = parseFloat(facture.montantTVA || 0);
  const totalTTC = parseFloat(facture.totalTTC || facture.montant_ttc || 0);
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
      return d.toLocaleDateString("fr-FR");
    };

    const issueDate = facture.date_facturation
      ? new Date(facture.date_facturation)
      : facture.createdAt || new Date();

    // Get the total text for printing
    const printTotalText = totalText || totalToFrenchText(totalTTC);

    const printWindow = window.open("", "_blank");

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Facture ${facture.invoiceNumber || facture.num_facture}</title>
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
      <p><strong>Nom Client:</strong> ${facture.clientName || facture.client?.nom_complete}</p>
    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>N° Facture:</strong> ${facture.invoiceNumber || facture.num_facture}</p>
      <p><strong>Date facturation:</strong> ${formatDate(issueDate)}</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix U.</th>
        <th>Total Ligne HT</th>
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
          <td>${parseFloat(prod.FactureProduit?.total_ligne || 0).toFixed(2)} Dh</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Total HT:</strong> ${totalHTBeforeDiscount.toFixed(2)} Dh</p>
    <p><strong>TVA (${facture.tva || 0}%):</strong> ${montantTVA.toFixed(2)} Dh</p>
    <p><strong>Total TTC:</strong> ${totalTTC.toFixed(2)} Dh</p>

    <p style="font-size:10px; font-style:italic;">
      Arrêté le présent Facture à la somme de :
      <strong>${printTotalText}</strong>
    </p>

    ${
      totalPayments > 0
        ? `
      <p><strong>Total payé:</strong> ${totalPayments.toFixed(2)} Dh</p>
      <p style="font-weight:bold; font-size:11px; color:${
        remainingAmount > 0 ? "#dc3545" : "#28a745"
      }">
        <strong>Reste à payer:</strong> ${remainingAmount.toFixed(2)} Dh
      </p>
    `
        : ""
    }
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
        return new Date(date).toLocaleDateString("fr-FR");
      };

      const issueDate = facture.date_facturation
        ? new Date(facture.date_facturation)
        : facture.createdAt || new Date();

      // Get the total text for PDF
      const pdfTotalText = totalText || totalToFrenchText(totalTTC);

      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">Facture</h1>
        <h3 style="margin:5px 0;">Hassan - Aluminium-Inox</h3>
        <p style="font-size:10px;">Tél: +212 661-431237</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div>
          <h4 style="margin-bottom:5px;">Client</h4>
          <p><strong>Nom:</strong> ${facture.clientName || facture.client?.nom_complete}</p>
        </div>
        <div style="text-align:right;">
          <h4 style="margin-bottom:5px;">Informations de la Facture</h4>
          <p><strong>N°:</strong> ${facture.invoiceNumber || facture.num_facture}</p>
          <p><strong>Date facturation:</strong> ${formatDate(issueDate)}</p>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
        <thead>
          <tr style="background-color:#2c5aa0; color:#fff;">
            <th style="padding:6px; border:1px solid #2c5aa0;">Code</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Produit</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Qté</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Prix U.</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Total Ligne HT</th>
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
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(prod.FactureProduit?.total_ligne || 0).toFixed(2)} Dh</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        <p><strong>Total HT:</strong> ${totalHTBeforeDiscount.toFixed(2)} Dh</p>
        <p><strong>TVA (${facture.tva || 0}%):</strong> ${montantTVA.toFixed(2)} Dh</p>
        <p style="font-size:13px; font-weight:bold; color:#2c5aa0;">
          <strong>Total TTC:</strong> ${totalTTC.toFixed(2)} Dh
        </p>
        <p style="font-size:10px; font-style:italic;">
          Arrêté le présent Facture à la somme de :
          <strong>${pdfTotalText}</strong>
        </p>
        
        ${
          totalPayments > 0
            ? `
          <div style="border-top:1px solid #ddd; margin-top:10px; padding-top:10px;">
            <p><strong>Total payé:</strong> ${totalPayments.toFixed(2)} Dh</p>
            <p style="font-weight:bold; color:${
              remainingAmount > 0 ? "#dc3545" : "#28a745"
            }">
              <strong>Reste à payer:</strong> ${remainingAmount.toFixed(2)} Dh
            </p>
          </div>
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

      pdf.save(`Facture-${facture.invoiceNumber || facture.num_facture}.pdf`);
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
          Facture #{facture.invoiceNumber || facture.num_facture}
          <Badge color={getStatusBadge(formData.status)} className="ms-2">
            {statusOptions.find((opt) => opt.value === formData.status)
              ?.label || formData.status}
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
                  <strong>Nom:</strong>{" "}
                  {facture.clientName || facture.client?.nom_complete}
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
                  {facture.createdAt
                    ? format(facture.createdAt, "dd/MM/yyyy", { locale: fr })
                    : "N/A"}
                </p>
                <p>
                  <strong>Date facturation:</strong>{" "}
                  {facture.invoiceDate || "N/A"}
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
                    <th>Total Ligne HT</th>
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
                    <strong>N° Facture:</strong>{" "}
                    {facture.invoiceNumber || facture.num_facture}
                  </p>
                  <p>
                    <strong>Client:</strong>{" "}
                    {facture.clientName || facture.client?.nom_complete}
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
                    <span>Total HT avant remise:</span>
                    <span>{totalHTBeforeDiscount.toFixed(2)} Dh</span>
                  </div>
                  {globalDiscount > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Remise globale:</span>
                      <span>-{globalDiscount.toFixed(2)} Dh</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between">
                    <span>HT après remise:</span>
                    <span>{montantHTAfterRemise.toFixed(2)} Dh</span>
                  </div>
                  <div className="d-flex justify-content-between text-success">
                    <span>TVA ({facture.tva || 0}%):</span>
                    <span>{montantTVA.toFixed(2)} Dh</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Total TTC:</span>
                    <span>{totalTTC.toFixed(2)} Dh</span>
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
              className="mt-4"
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
                className="mt-4"
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
