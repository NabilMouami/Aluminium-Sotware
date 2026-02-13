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

// Safe parser for date_creation in "dd/MM/yyyy" format
const parseDateSafely = (dateInput) => {
  if (!dateInput) return null;

  // If it's already a valid Date object
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return dateInput;
  }

  // Handle string in "dd/MM/yyyy" format (common in your backend)
  if (typeof dateInput === "string") {
    const parts = dateInput.trim().split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      // Validate reasonable values
      if (
        day >= 1 &&
        day <= 31 &&
        month >= 1 &&
        month <= 12 &&
        year >= 2000 &&
        year <= 2100
      ) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }

  // Fallback: try native parsing
  const fallback = new Date(dateInput);
  return isNaN(fallback.getTime()) ? null : fallback;
};

// Updated status options
const statusOptions = [
  { value: "brouillon", label: "Non Payé" },
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

const BonLivrDetailsModal = ({ isOpen, toggle, bon, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    status: "brouillon",
    notes: "",
    advancements: [],
  });
  const [totalText, setTotalText] = useState("");
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);

  // Initialize form data when bon changes
  useEffect(() => {
    if (bon) {
      console.log("Bon data for debugging:", {
        id: bon.id,
        montant_ht: bon.montant_ht,
        montant_ttc: bon.montant_ttc,
        produits: bon.produits?.length,
        advancements: bon.advancements?.length,
        totalProduits: calculateTotalFromProduits(bon.produits),
      });

      const formattedAdvancements = bon.advancements
        ? bon.advancements.map((adv) => ({
            id: adv.id,
            amount: parseFloat(adv.amount) || 0,
            paymentDate: adv.paymentDate
              ? parseDateSafely(adv.paymentDate) || new Date()
              : new Date(),
            paymentMethod: adv.paymentMethod || "espece",
            reference: adv.reference || "",
            notes: adv.notes || "",
          }))
        : [];

      setFormData({
        status: bon.status || "brouillon",
        notes: bon.notes || "",
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

  // Calculate total in French text
  useEffect(() => {
    const calculateTotalText = () => {
      if (bon) {
        const total = parseFloat(bon.montant_ttc) || 0;
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

    if (bon) {
      calculateTotalText();
    }
  }, [bon]);

  if (!bon) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "danger";
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
  const total = parseFloat(bon.montant_ttc) || 0;

  // Calculer les totaux CORRIGÉS avec remise dynamique
  const sousTotal = calculateTotalFromProduits(bon.produits);
  const montantHT = Math.max(0, sousTotal);
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
      title: "Supprimer cet Paiement?",
      text: "Êtes-vous sûr de vouloir supprimer cet paiement?",
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
        topTost("Le total des paiements dépasse le montant total!", "error");
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

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Date + time (same style as first function)
    const formatDateWithTime = (dateInput) => {
      if (!dateInput) return "—";
      try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "—";
        return date.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "—";
      }
    };

    const txt = totalToFrenchText(sousTotal);
    const creationDateFormatted = formatDateWithTime(bon.date_creation);

    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>BON DE LIVRAISON ${bon.deliveryNumber}</title>
  <meta charset="UTF-8">

  <style>
    @page {
      size: A4;
      margin-left: 10mm;
      margin-right: 10mm;
    }

    * {
      box-sizing: border-box;
      text-transform: uppercase;
    }

    body {
      width: 100%;
      margin: 0;
      padding-left: 5mm;
      padding-right: 5mm;
      font-family: Arial, sans-serif;
      font-size: 0.6rem;
      color: #000;
      background: #fff;
    }

    .header {
    display:flex;
    justify-content:space-between;

      text-align: center;
    }

    h2 {
      font-size: 0.9rem;
      letter-spacing: 1px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    th, td {
      border: 1.5px solid #000;
      padding: 5px;
      vertical-align: middle;
    }

    th {
      background: #f2f2f2;
      text-align: center;
    }

    td {
      text-align: left;
    }

    .totals {
      margin-top: 25px;
      text-align: right;
    }

    .net-box {
      display: inline-block;
      border: 2px solid #000;
      padding: 10px 16px;
      margin-right: 20px;
      margin-top: 8px;
      font-weight: bold;
      text-align: right;
    }

    .italic {
      font-style: italic;
      font-size: 0.7rem;
      margin: 20px;
      font-weight: bold;
    }
  </style>
</head>

<body>
  <div class="header">
    <h2>Bon de Livraison</h2>
    <p>ALUMINIUM OULAD BRAHIM – Tél: +212 671953725</p>
  </div>

  <div style="display:flex;justify-content:space-between;margin:20px 0;">
    <div>
      <strong>Nom Client :</strong> ${bon.customerName || "—"}
    </div>
    <div style="text-align:right;">
      <strong>N° Bon :</strong> ${bon.deliveryNumber}<br/>
      <strong>Date création :</strong> ${creationDateFormatted}
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
      ${(bon.produits || [])
        .map(
          (prod) => `
        <tr>
          <td>${prod.reference || "—"}</td>
          <td>${prod.designation || "—"}</td>
          <td style="text-align:center">
            ${prod.BonLivraisonProduit?.quantite || 0}
          </td>
          <td style="text-align:right">
            ${Number(prod.BonLivraisonProduit?.prix_unitaire || 0).toFixed(2)}
          </td>
          <td style="text-align:right">
            ${Number(prod.BonLivraisonProduit?.total_ligne || 0).toFixed(2)}
          </td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="net-box">
      NET À PAYER : ${sousTotal.toFixed(2)} DH
    </div>

    <div class="italic">
      ${txt}
    </div>
  </div>

  <script>
    window.onload = function () {
      window.print();
      setTimeout(() => window.close(), 100);
    };
  </script>
</body>
</html>
  `;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const generateAndDownloadPDF = async () => {
    try {
      const container = document.createElement("div");

      container.style.width = "210mm";
      container.style.minHeight = "150mm";
      container.style.padding = "15mm";
      container.style.background = "#fff";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "0.8rem";
      container.style.textTransform = "uppercase";
      container.style.boxSizing = "border-box";
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.color = "#000";

      // Date + time (same as print)
      const formatDateWithTime = (dateInput) => {
        if (!dateInput) return "—";
        try {
          const date = new Date(dateInput);
          if (isNaN(date.getTime())) return "—";
          return date.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          return "—";
        }
      };

      const totalText = totalToFrenchText(sousTotal);
      const creationDateFormatted = formatDateWithTime(bon.date_creation);

      container.innerHTML = `
  <div style="text-align:center; border-bottom:3px solid #000; padding-bottom:15px; margin-bottom:20px;">
    <h1 style="margin:0; letter-spacing:1px;">BON DE LIVRAISON</h1>
    <p style="margin:8px 0; font-weight:bold;">ALUMINIUM OULAD BRAHIM</p>
    <p>TÉL : +212 671953725</p>
  </div>

  <div style="display:flex; justify-content:space-between; margin-bottom:25px;">
    <div>
      <p><strong>NOM CLIENT :</strong><br/>${bon.customerName || "—"}</p>
    </div>
    <div style="text-align:right;">
      <p><strong>N° BON :</strong> ${bon.deliveryNumber}</p>
      <p><strong>DATE CRÉATION :</strong> ${creationDateFormatted}</p>
    </div>
  </div>

  <table style="width:100%; border-collapse:collapse; margin-bottom:25px;">
    <thead>
      <tr>
        <th style="border:1.5px solid #000; padding:10px; text-align:center;">CODE</th>
        <th style="border:1.5px solid #000; padding:10px; text-align:center;">DÉSIGNATION</th>
        <th style="border:1.5px solid #000; padding:10px; text-align:center;">QTÉ</th>
        <th style="border:1.5px solid #000; padding:10px; text-align:center;">PRIX U</th>
        <th style="border:1.5px solid #000; padding:10px; text-align:center;">MONTANT</th>
      </tr>
    </thead>
    <tbody>
      ${(bon.produits || [])
        .map(
          (p) => `
        <tr>
          <td style="border:1.5px solid #000; padding:8px;">${p.reference || "—"}</td>
          <td style="border:1.5px solid #000; padding:8px;">${p.designation || "—"}</td>
          <td style="border:1.5px solid #000; padding:8px; text-align:center;">
            ${p.BonLivraisonProduit?.quantite || 0}
          </td>
          <td style="border:1.5px solid #000; padding:8px; text-align:right;">
            ${Number(p.BonLivraisonProduit?.prix_unitaire || 0).toFixed(2)}
          </td>
          <td style="border:1.5px solid #000; padding:8px; text-align:right;">
            ${Number(p.BonLivraisonProduit?.total_ligne || 0).toFixed(2)}
          </td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div style="text-align:right; margin-top:25px;">
    <div style="
      display:inline-block;
      border:2px solid #000;
      padding:12px 18px;
      margin-right:20px;
      font-weight:bold;
    ">
      NET À PAYER : ${sousTotal.toFixed(2)}
    </div>

    <br/>

    <div style="
      display:inline-block;
      margin-top:12px;
      font-style:italic;
      font-weight:bold;
      font-size:1.1rem;
    ">
      ${totalText}
    </div>
  </div>
`;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Bon-Livraison-${bon.deliveryNumber}.pdf`);
      topTost("PDF généré et téléchargé !", "success");
    } catch (err) {
      console.error("PDF generation error:", err);
      topTost("Erreur lors de la création du PDF", "error");
    }
  };

  const handleSubmit = async () => {
    // Valider que le total des acomptes ne dépasse pas le montant total
    if (totalAdvancements > montantTotal) {
      topTost(
        "Le total des paiements ne peut pas dépasser le montant total",
        "error",
      );
      return;
    }

    // Valider les acomptes individuels
    for (const adv of formData.advancements) {
      if (!adv.amount || adv.amount <= 0) {
        topTost("Tous les paiements doivent avoir un montant positif", "error");
        return;
      }
      if (!adv.paymentDate) {
        topTost("Tous les paiements doivent avoir une date", "error");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Préparer les données pour le backend
      const updateData = {
        status: formData.status,
        notes: formData.notes,
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

    const d = parseDateSafely(dateInput);
    if (!d) return "";

    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get date from bon
  const issueDate = parseDateSafely(bon.date_creation) || new Date();

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

                <p>
                  <strong>Mode règlement:</strong>{" "}
                  {bon.mode_reglement || "Non spécifié"}
                </p>
              </div>
            </div>
          </div>

          {/* Status and Notes */}
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
                Paiements (التسبيقات)
              </h6>
              <Button
                color="primary"
                size="lg"
                className="fs-6"
                onClick={addAdvancement}
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
                      </td>
                      <td>
                        {parseFloat(
                          prod.BonLivraisonProduit?.total_ligne || 0,
                        ).toFixed(2)}{" "}
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
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
                  <div className="d-flex justify-content-between fw-bold text-primary">
                    <span>Toatal a Payer:</span>
                    <span>{sousTotal.toFixed(2)} </span>
                  </div>

                  {totalAdvancements > 0 && (
                    <>
                      <div className="d-flex justify-content-between text-success mt-2">
                        <span>Total paiements:</span>
                        <span>{totalAdvancements.toFixed(2)} </span>
                      </div>
                      <div className="d-flex justify-content-between fw-bold border-top pt-1 mt-1">
                        <span>Reste à payer:</span>
                        <span
                          className={
                            resteAPayer > 0 ? "text-warning" : "text-success"
                          }
                        >
                          {resteAPayer.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <small className="text-muted">
                          {resteAPayer === 0
                            ? "✅ Bon entièrement payé"
                            : `⚠️ Reste ${resteAPayer.toFixed(2)}  à payer`}
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
              className="mt-4 fs-6"
              size="lg"
            >
              <FiSave className="me-2" />
              {isSubmitting ? "Enregistrement..." : "Enregistrer تسجيل التعديل"}
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default BonLivrDetailsModal;
