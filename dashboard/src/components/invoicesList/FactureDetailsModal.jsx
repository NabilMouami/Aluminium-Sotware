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
  { value: "brouillon", label: "Non Payé" },
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
        return "danger";
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

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatDateWithTime = (dateString) => {
      if (!dateString) return "—";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const creationDateFormatted = formatDateWithTime(facture.createdAt);
    const pdfTotalText = totalText || totalToFrenchText(totalTTC);

    const content = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Facture ${facture.clientName || facture.client?.nom_complete}</title>

  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; text-transform: uppercase; }
    body { font-family: Arial, sans-serif; font-size: 0.8rem; margin: 0; color: #000; }
    .header { text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px; }
    h2 { margin:0 0 5px; font-size:1.5rem; }
    table { width:100%; border-collapse:collapse; margin:20px 0; }
    th, td { border:1.5px solid #000; padding:8px; text-align:left; }
    th { background:#f2f2f2; text-align:center; }
    .totals { margin-top:25px; text-align:right; }
    .net-box { display:inline-block; border:2px solid #000; padding:10px 16px; font-weight:bold; text-align:right; }
    .italic { font-style:italic; font-size:1rem; margin-top:10px; font-weight:bold; }
  </style>
</head>

<body onload="window.print(); setTimeout(() => window.close(), 100);">

  <div class="header">
    <h2>FACTURE</h2>
    <p>ALUMINIUM OULAD BRAHIM – Tél: +212 671953725</p>
  </div>

  <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
    <div>
      <strong>Client:</strong> ${facture.clientName || facture.client?.nom_complete || "—"}
    </div>
    <div style="text-align:right;">
      <strong>N° Facture:</strong> ${facture.invoiceNumber || facture.num_facture}<br/>
      <strong>Date création:</strong> ${creationDateFormatted}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix U</th>
        <th>Montant</th>
      </tr>
    </thead>
    <tbody>
      ${(facture.products || [])
        .map(
          (p) => `
        <tr>
          <td>${p.reference || "—"}</td>
          <td>${p.designation || "—"}</td>
          <td>${Number(p.FactureProduit?.quantite || 0).toFixed(2)}</td>
          <td>${Number(p.FactureProduit?.prix_unitaire || 0).toFixed(2)}</td>
          <td>${Number(p.FactureProduit?.total_ligne || 0).toFixed(2)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="net-box">TOTAL TTC: ${totalTTC.toFixed(2)}</div>
    <div class="italic">${pdfTotalText}</div>
  </div>

</body>
</html>
`;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const generateAndDownloadPDF = async () => {
    try {
      if (!facture) return;

      const container = document.createElement("div");
      Object.assign(container.style, {
        width: "210mm",
        padding: "15mm",
        background: "#fff",
        color: "#000",
        fontFamily: "Arial, sans-serif",
        fontSize: "0.8rem",
        textTransform: "uppercase",
        boxSizing: "border-box",
        position: "absolute",
        left: "-9999px",
        top: "0",
      });

      const formatDateWithTime = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "—";
        return date.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      const creationDateFormatted = formatDateWithTime(facture.createdAt);
      const pdfTotalText = totalText || totalToFrenchText(totalTTC);

      container.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">
        <h2 style="margin:0;">FACTURE</h2>
        <p>ALUMINIUM OULAD BRAHIM – Tél: +212 671953725</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div><strong>Client:</strong> ${facture.clientName || facture.client?.nom_complete || "—"}</div>
        <div style="text-align:right;">
          <strong>N° Facture:</strong> ${facture.invoiceNumber || facture.num_facture}<br/>
          <strong>Date création:</strong> ${creationDateFormatted}
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
        <thead>
          <tr>
            <th style="border:1.5px solid #000; padding:8px;">Code</th>
            <th style="border:1.5px solid #000; padding:8px;">Désignation</th>
            <th style="border:1.5px solid #000; padding:8px;">Qté</th>
            <th style="border:1.5px solid #000; padding:8px;">Prix U</th>
            <th style="border:1.5px solid #000; padding:8px;">Montant/th>
          </tr>
        </thead>
        <tbody>
          ${(facture.products || [])
            .map(
              (p) => `
            <tr>
              <td style="border:1.5px solid #000; padding:6px;">${p.reference || "—"}</td>
              <td style="border:1.5px solid #000; padding:6px;">${p.designation || "—"}</td>
              <td style="border:1.5px solid #000; padding:6px;">${Number(p.FactureProduit?.quantite || 0).toFixed(2)}</td>
              <td style="border:1.5px solid #000; padding:6px;">${Number(p.FactureProduit?.prix_unitaire || 0).toFixed(2)}</td>
              <td style="border:1.5px solid #000; padding:6px;">${Number(p.FactureProduit?.total_ligne || 0).toFixed(2)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        <div class="net-box" style="display:inline-block; border:2px solid #000; padding:10px 16px; font-weight:bold;">
          TOTAL TTC: ${totalTTC.toFixed(2)} 
        </div>
        <div class="italic" style="font-style:italic; font-weight:bold; margin-top:10px;">
          ${pdfTotalText}
        </div>
      </div>
    `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#fff",
      });
      document.body.removeChild(container);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          0,
          pageWidth,
          imgHeight,
        );
      } else {
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          position,
          pageWidth,
          imgHeight,
        );
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(
            canvas.toDataURL("image/png"),
            "PNG",
            0,
            position,
            pageWidth,
            imgHeight,
          );
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

  const formatDate = (dateInput) => {
    if (!dateInput) return "";

    const d = new Date(dateInput);

    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get date from bon
  const issueDate = facture.date_creation
    ? new Date(facture.date_creation)
    : new Date();

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
                  <strong>Date création:</strong> {formatDate(issueDate)}{" "}
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
                Paiements (التسبيقات)
              </h6>
              <Button
                color="primary"
                size="lg"
                className="fs-6"
                onClick={addPayment}
              >
                <FiPlus className="me-1" />
                Ajouter Paiement (التسبيقات)
              </Button>
            </div>

            {formData.advancements.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant ()</th>
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
                      </td>
                      <td>
                        {parseFloat(
                          prod.FactureProduit?.total_ligne || 0,
                        ).toFixed(2)}{" "}
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
                    <span>Total HT:</span>
                    <span>{totalHTBeforeDiscount.toFixed(2)} </span>
                  </div>
                  <div className="d-flex justify-content-between text-success">
                    <span>TVA ({facture.tva || 0}%):</span>
                    <span>{montantTVA.toFixed(2)} </span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Total TTC:</span>
                    <span>{totalTTC.toFixed(2)} </span>
                  </div>
                  {totalPayments > 0 && (
                    <>
                      <div className="d-flex justify-content-between text-primary">
                        <span>Total payé:</span>
                        <span>{totalPayments.toFixed(2)} </span>
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
                          {remainingAmount.toFixed(2)}
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
                className="mt-4 fs-6"
                size="lg"
              >
                <FiSave className="me-2" />
                {isSubmitting
                  ? "Enregistrement..."
                  : "Enregistrer تسجيل التعديل"}
              </Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default FactureDetailsModal;
