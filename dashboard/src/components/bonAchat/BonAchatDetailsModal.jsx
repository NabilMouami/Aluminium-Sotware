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
  FiCheckCircle,
  FiTruck,
  FiCreditCard,
  FiPackage,
  FiUser,
  FiShoppingCart,
  FiFileText,
} from "react-icons/fi";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

// Bon Achat status options
const statusOptions = [
  { value: "brouillon", label: "Non Payé" },
  { value: "payé", label: "Payé" },
  { value: "partiellement_payée", label: "Partiellement Payé" },
  { value: "annulée", label: "Annulé" },
];

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

const BonAchatDetailsModal = ({
  isOpen,
  toggle,
  bonAchat,
  onUpdate,
  onReceiveStock,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [formData, setFormData] = useState({
    status: "brouillon",
    notes: "",
    mode_reglement: "espèces",
  });
  const [totalText, setTotalText] = useState("");

  // Initialize form data when bonAchat changes
  useEffect(() => {
    if (bonAchat) {
      console.log("Initializing form with bonAchat:", bonAchat);
      setFormData({
        status: bonAchat.status || "brouillon",
        notes: bonAchat.notes || "",
        mode_reglement: bonAchat.mode_reglement || "espèces",
      });
    }
  }, [bonAchat]);

  // Calculate total in French text
  useEffect(() => {
    const calculateTotalText = () => {
      if (bonAchat) {
        const total = parseFloat(bonAchat.montant_ttc) || 0;
        if (total > 0) {
          try {
            const text = totalToFrenchText(total);
            setTotalText(text);
          } catch (error) {
            console.error("Error converting total to French text:", error);
            setTotalText(`${total.toFixed(2)} dirhams`);
          }
        } else {
          setTotalText("Zéro dirham");
        }
      }
    };

    if (bonAchat) {
      calculateTotalText();
    }
  }, [bonAchat]);

  if (!bonAchat) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "warning";
      case "en_cours":
        return "primary";
      case "reçu":
        return "success";
      case "annulé":
        return "danger";
      case "partiellement_payée":
        return "info";
      default:
        return "secondary";
    }
  };

  const total = parseFloat(bonAchat.montant_ttc) || 0;
  const totalQuantite = bonAchat.totalQuantite || 0;
  const totalQuantiteRecue = bonAchat.totalQuantiteRecue || 0;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const updateData = {
        status: formData.status,
        notes: formData.notes,
        mode_reglement: formData.mode_reglement,
      };

      console.log("Sending update data to backend:", updateData);

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.put(
        `${config_url}/api/bon-achats/${bonAchat.id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Update response from backend:", response.data);

      topTost("Bon d'achat mis à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.bon || response.data);
      }

      toggle();
    } catch (error) {
      console.error("Error updating bon achat:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la mise à jour du bon d'achat";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStockStatus = async (status = "reçu") => {
    try {
      setIsReceiving(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.patch(
        `${config_url}/api/bon-achats/${bonAchat.id}/receive`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setFormData((prev) => ({ ...prev, status }));
        topTost(`Stock réceptionné avec succès!`, "success");

        if (onReceiveStock) {
          onReceiveStock(response.data.bonAchat || response.data);
        }

        if (onUpdate) {
          onUpdate(response.data.bonAchat || response.data);
        }
      }
    } catch (error) {
      console.error("Error receiving stock:", error);
      const errorMsg =
        error.response?.data?.message || "Erreur lors de la réception du stock";
      topTost(errorMsg, "error");
    } finally {
      setIsReceiving(false);
    }
  };

  const getStatusLabel = (status) => {
    return statusOptions.find((opt) => opt.value === status)?.label || status;
  };

  const handlePrint = () => {
    if (!bonAchat) return;

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR");
    };

    const issueDate = bonAchat.date_creation
      ? new Date(bonAchat.date_creation)
      : new Date();

    const printWindow = window.open("", "_blank");

    const printTotalText = totalToFrenchText(total);

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Bon d'Achat ${bonAchat.num_bon_achat}</title>
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
    <h2 style="margin: 0;">Bon d'Achat</h2>
    <p style="margin: 5px 0;">ALUMINIUM OULAD BRAHIM</p>
    <p style="margin: 0;">Tél: +212 671953725</p>
  </div>

  <div class="invoice-info">
    <div class="info-block">
      <p><strong>Fournisseur:</strong> ${bonAchat.fornisseur?.nom_complete || "Fournisseur inconnu"}</p>
      <p><strong>Téléphone:</strong> ${bonAchat.fornisseur?.telephone || "Non spécifié"}</p>
    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>N° Bon d'Achat:</strong> ${bonAchat.num_bon_achat}</p>
      <p><strong>Date création:</strong> ${formatDate(issueDate)}</p>
    </div>
  </div>


  <table class="table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Designation</th>
        <th>Qté</th>
        <th>Prix U.</th>
        <th>Remise Ligne</th>
        <th>Total Ligne</th>
      </tr>
    </thead>
    <tbody>
      ${(bonAchat.produits || [])
        .map(
          (prod) => `
        <tr>
          <td>${prod.reference || "N/A"}</td>
          <td>${prod.designation || "Produit"}</td>
          <td>${parseFloat(prod.BonAchatProduit?.quantite || 0).toFixed(2)}</td>
          <td>${parseFloat(prod.BonAchatProduit?.prix_unitaire || 0).toFixed(2)} Dh</td>
          <td>${parseFloat(prod.BonAchatProduit?.remise_ligne || 0).toFixed(2)} Dh</td>
          <td>${parseFloat(prod.BonAchatProduit?.total_ligne || 0).toFixed(2)} Dh</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    ${
      parseFloat(bonAchat.remise) > 0
        ? `
      <p><strong>Sous-total:</strong> ${(total + parseFloat(bonAchat.remise)).toFixed(2)} Dh</p>
      <p><strong>Remise globale:</strong> -${parseFloat(bonAchat.remise).toFixed(2)} Dh</p>
    `
        : ""
    }
    <p style="font-size:14px; font-weight:bold;">
      <strong>Total a Payer:</strong> ${total.toFixed(2)} Dh
    </p>

    <p style="font-size:10px; font-style:italic;">
      Arrêté le présent bon d'achat à la somme de :
      <strong>${printTotalText}</strong>
    </p>
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
      pdfContainer.style.minHeight = "150mm";
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

      const issueDate = bonAchat.date_creation
        ? new Date(bonAchat.date_creation)
        : new Date();

      const remise = parseFloat(bonAchat.remise) || 0;
      const sousTotal = total + remise;

      const pdfTotalText = totalToFrenchText(total);

      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">Bon d'Achat</h1>
        <h3 style="margin:5px 0;">ALUMINIUM OULAD BRAHIM</h3>
        <p style="font-size:10px;">Tél: +212 671953725</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div>
          <h4 style="margin-bottom:5px;">Fournisseur</h4>
          <p><strong>Nom:</strong> ${bonAchat.fornisseur?.nom_complete || "Fournisseur inconnu"}</p>
          <p><strong>Téléphone:</strong> ${bonAchat.fornisseur?.telephone || "Non spécifié"}</p>
        </div>
        <div>
          <h4 style="margin-bottom:5px;">Informations du Bon d'Achat</h4>
          <p><strong>N°:</strong> ${bonAchat.num_bon_achat}</p>
          <p><strong>Date création:</strong> ${formatDate(issueDate)}</p>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
        <thead>
          <tr style="background-color:#2c5aa0; color:#fff;">
            <th style="padding:6px; border:1px solid #2c5aa0;">Code</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Désignation</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Qté</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Prix U.</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Remise</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(bonAchat.produits || [])
            .map(
              (prod, i) => `
            <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
              <td style="border:1px solid #ddd; padding:5px;">${prod.reference || "N/A"}</td>
              <td style="border:1px solid #ddd; padding:5px;">${prod.designation || "Produit"}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:center;">${parseFloat(prod.BonAchatProduit?.quantite || 0).toFixed(2)}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(prod.BonAchatProduit?.prix_unitaire || 0).toFixed(2)} Dh</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(prod.BonAchatProduit?.remise_ligne || 0).toFixed(2)} Dh</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right; font-weight:bold;">${parseFloat(prod.BonAchatProduit?.total_ligne || 0).toFixed(2)} Dh</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        ${
          remise > 0
            ? `
          <p><strong>Sous-total:</strong> ${sousTotal.toFixed(2)} Dh</p>
          <p><strong>Remise globale:</strong> -${remise.toFixed(2)} Dh</p>
        `
            : ""
        }
        <p style="font-size:14px; font-weight:bold; color:#2c5aa0;">
          Total a Payer: ${total.toFixed(2)} Dh
        </p>
        <p style="font-size:10px; font-style:italic;">
          Arrêté le présent bon d'achat à la somme de : <strong>${pdfTotalText}</strong>
        </p>
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

        while (heightLeft > 1) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`Bon-Achat-${bonAchat.num_bon_achat}.pdf`);
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };

  const canReceive = ["brouillon", "en_cours", "partiellement_reçu"].includes(
    bonAchat.status,
  );
  const canEdit = ["brouillon", "en_cours"].includes(bonAchat.status);

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        <div className="d-flex align-items-center">
          <FiPackage className="me-2" />
          Bon d'Achat #{bonAchat.num_bon_achat}
        </div>
        <Badge color={getStatusBadge(formData.status)} className="ms-2">
          {statusOptions.find((opt) => opt.value === formData.status)?.label ||
            formData.status}
        </Badge>
      </ModalHeader>

      <ModalBody>
        <div className="row">
          {/* Fournisseur Information */}
          <div className="col-md-6">
            <div className="mb-3">
              <h6>
                <FiUser className="me-2" />
                Fournisseur
              </h6>
              <div className="p-3 bg-light rounded">
                <p>
                  <strong>Nom:</strong>{" "}
                  {bonAchat.fornisseur?.nom_complete || "Fournisseur inconnu"}
                </p>
                <p>
                  <strong>Téléphone:</strong>{" "}
                  {bonAchat.fornisseur?.telephone || "Non spécifié"}
                </p>
              </div>
            </div>
          </div>

          {/* Bon Achat Information */}
          <div className="col-md-6">
            <div className="mb-3">
              <h6>
                <FiFileText className="me-2" />
                Informations du Bon d'Achat
              </h6>
              <div className="p-3 bg-light rounded">
                <p>
                  <strong>Date création:</strong>{" "}
                  {new Date(
                    bonAchat.date_creation || bonAchat.createdAt,
                  ).toLocaleDateString("fr-FR")}
                </p>
                <p>
                  <strong>Quantité totale:</strong> {totalQuantite} unités
                </p>
                <p>
                  <strong>Quantité reçue:</strong> {totalQuantiteRecue} unités
                </p>
              </div>
            </div>
          </div>
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

          <div className="col-12">
            <div className="form-group mb-3">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notes supplémentaires..."
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Products Section */}
          <div className="col-12 mt-4">
            <h6>
              <FiShoppingCart className="me-2" />
              Produits
            </h6>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Désignation</th>
                    <th>Stock Actuel</th>
                    <th>Quantité Achetée</th>
                    <th>Prix Unitaire</th>
                    <th>Remise Ligne</th>
                    <th>Total Ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {(bonAchat.produits || []).map((prod, index) => (
                    <tr key={prod.id || index}>
                      <td>{prod.reference || "N/A"}</td>
                      <td>{prod.designation || "Produit"}</td>
                      <td
                        className={
                          parseFloat(prod.qty) < 0 ? "text-danger" : ""
                        }
                      >
                        {parseFloat(prod.qty || 0).toFixed(2)} unités
                      </td>
                      <td className="text-primary fw-bold">
                        {parseFloat(
                          prod.BonAchatProduit?.quantite || 0,
                        ).toFixed(2)}{" "}
                        unités
                      </td>
                      <td>
                        {parseFloat(
                          prod.BonAchatProduit?.prix_unitaire || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(
                          prod.BonAchatProduit?.remise_ligne || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td className="fw-bold">
                        {parseFloat(
                          prod.BonAchatProduit?.total_ligne || 0,
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
                  <h6>Résumé du Bon d'Achat</h6>
                  <p>
                    <strong>N° Bon d'Achat:</strong> {bonAchat.num_bon_achat}
                  </p>
                  <p>
                    <strong>Fournisseur:</strong>{" "}
                    {bonAchat.fornisseur?.nom_complete || "Fournisseur inconnu"}
                  </p>
                  <p>
                    <strong>Produits:</strong> {bonAchat.produits?.length || 0}{" "}
                    article(s)
                  </p>
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
                  <div className="d-flex justify-content-between">
                    <span>Montant HT:</span>
                    <span>
                      {parseFloat(bonAchat.montant_ht || 0).toFixed(2)} Dh
                    </span>
                  </div>
                  {parseFloat(bonAchat.remise) > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Remise globale:</span>
                      <span>
                        -{parseFloat(bonAchat.remise || 0).toFixed(2)} Dh
                      </span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Total a Payer:</span>
                    <span>{total.toFixed(2)} Dh</span>
                  </div>
                  {totalText && (
                    <div
                      className="text-start mt-2"
                      style={{ fontSize: "0.85em", fontStyle: "italic" }}
                    >
                      <small>
                        Arrêté le présent bon d'achat à la somme de :
                      </small>
                      <br />
                      <strong>{totalText}</strong>
                    </div>
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
            <Button onClick={toggle} color="danger" className="me-2">
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

export default BonAchatDetailsModal;
