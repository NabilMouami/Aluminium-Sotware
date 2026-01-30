import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
  Button,
} from "reactstrap";
import {
  FiX,
  FiPrinter,
  FiDownload,
  FiSave,
  FiCheck,
  FiTag,
  FiUser,
  FiFileText,
  FiClipboard,
  FiShoppingCart,
  FiPercent,
} from "react-icons/fi";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

// Bon Avoir status options
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "valide", label: "Validé" },
  { value: "utilise", label: "Utilisé" },
  { value: "annule", label: "Annulé" },
];

// Motif options
const motifOptions = [
  { value: "retour_produit", label: "Retour Produit" },
  { value: "erreur_facturation", label: "Erreur Facturation" },
  { value: "remise_commerciale", label: "Remise Commerciale" },
  { value: "annulation", label: "Annulation" },
  { value: "autre", label: "Autre" },
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
  const hundreds = [
    "",
    "cent",
    "deux cent",
    "trois cent",
    "quatre cent",
    "cinq cent",
    "six cent",
    "sept cent",
    "huit cent",
    "neuf cent",
  ];

  const convertLessThanOneThousand = (num) => {
    if (num === 0) return "";

    let result = "";

    // Hundreds
    if (num >= 100) {
      result += hundreds[Math.floor(num / 100)];
      num %= 100;
      if (num > 0) result += " ";
    }

    // Tens and units
    if (num >= 10 && num < 20) {
      result += teens[num - 10];
    } else if (num >= 20) {
      result += tens[Math.floor(num / 10)];
      num %= 10;
      if (num > 0) {
        if (Math.floor((num + 10) / 10) === 1) {
          result += "-" + teens[num - 10];
        } else {
          result += num === 1 ? " et un" : "-" + units[num];
        }
      }
    } else if (num > 0) {
      result += units[num];
    }

    return result;
  };

  const convertNumberToWords = (num) => {
    if (num === 0) return "zéro";

    let result = "";

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

const BonAvoirDetailsModal = ({
  isOpen,
  toggle,
  bonAvoir,
  onUpdate,
  onValidate,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    status: "brouillon",
    motif: "retour_produit",
    notes: "",
  });
  const [totalText, setTotalText] = useState("");

  // Initialize form data when bonAvoir changes
  useEffect(() => {
    if (bonAvoir) {
      console.log("Initializing form with bonAvoir:", bonAvoir);
      setFormData({
        status: bonAvoir.status || "brouillon",
        motif: bonAvoir.motif || "retour_produit",
        notes: bonAvoir.notes || "",
      });
    }
  }, [bonAvoir]);

  // Calculate total in French text
  useEffect(() => {
    const calculateTotalText = () => {
      if (bonAvoir) {
        const total = parseFloat(bonAvoir.montant_total) || 0;
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

    if (bonAvoir) {
      calculateTotalText();
    }
  }, [bonAvoir]);

  if (!bonAvoir) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "warning";
      case "valide":
        return "primary";
      case "utilise":
        return "success";
      case "annule":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getMotifBadge = (motif) => {
    switch (motif) {
      case "retour_produit":
        return "info";
      case "erreur_facturation":
        return "warning";
      case "remise_commerciale":
        return "success";
      case "annulation":
        return "danger";
      case "autre":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getMotifLabel = (motif) => {
    return motifOptions.find((opt) => opt.value === motif)?.label || motif;
  };

  const getStatusLabel = (status) => {
    return statusOptions.find((opt) => opt.value === status)?.label || status;
  };

  const total = parseFloat(bonAvoir.montant_total) || 0;
  const totalQuantites = bonAvoir.total_quantites || 0;
  const produitsCount = bonAvoir.produits_count || 0;

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
        motif: formData.motif,
        notes: formData.notes,
      };

      console.log("Sending update data to backend:", updateData);

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.put(
        `${config_url}/api/bon-avoirs/${bonAvoir.id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Update response from backend:", response.data);

      topTost("Bon d'avoir mis à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.bon || response.data);
      }

      toggle();
    } catch (error) {
      console.error("Error updating bon avoir:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la mise à jour du bon d'avoir";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidate = async () => {
    const result = await MySwal.fire({
      title: "Valider ce bon d'avoir ?",
      text: "Voulez-vous valider ce bon d'avoir ? Cette action le rendra utilisable pour les clients.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, valider",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        setIsSubmitting(true);
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.patch(
          `${config_url}/api/bon-avoirs/${bonAvoir.id}/validate`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.data.success) {
          setFormData((prev) => ({ ...prev, status: "valide" }));
          topTost(`Bon d'avoir validé avec succès!`, "success");

          if (onValidate) {
            onValidate(response.data.bon || response.data);
          }

          if (onUpdate) {
            onUpdate(response.data.bon || response.data);
          }
        }
      } catch (error) {
        console.error("Error validating bon avoir:", error);
        const errorMsg =
          error.response?.data?.message || "Erreur lors de la validation";
        topTost(errorMsg, "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrint = () => {
    if (!bonAvoir) return;

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR");
    };

    const issueDate = bonAvoir.date_creation
      ? new Date(bonAvoir.date_creation)
      : new Date();

    const printWindow = window.open("", "_blank");

    const printTotalText = totalToFrenchText(total);

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Bon d'Avoir ${bonAvoir.num_bon_avoir}</title>
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
    .conditions {
      margin-top: 25px;
    }
    .conditions h3 {
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
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">Bon d'Avoir</h2>
    <p style="margin: 5px 0;">Hassan - Aluminium-Inox</p>
    <p style="margin: 0;">Tél: +212 661-431237</p>
  </div>

  <div class="invoice-info">
    <div class="info-block">
      <p><strong>Client:</strong> ${bonAvoir.client_name || "Client inconnu"}</p>
      <p><strong>Téléphone:</strong> ${bonAvoir.client_phone || "Non spécifié"}</p>
      <p><strong>Bon Livraison:</strong> ${bonAvoir.bon_livraison_ref}</p>
    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>N° Bon d'Avoir:</strong> ${bonAvoir.num_bon_avoir}</p>
      <p><strong>Date création:</strong> ${formatDate(issueDate)}</p>
      <p><strong>Motif:</strong> ${getMotifLabel(bonAvoir.motif)}</p>
      <p><strong>Statut:</strong> ${getStatusLabel(bonAvoir.status)}</p>
    </div>
  </div>


  <table class="table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Designation</th>
        <th>Qté</th>
        <th>Prix U.</th>
        <th>Remise</th>
        <th>Total Ligne</th>
      </tr>
    </thead>
    <tbody>
      ${(bonAvoir.produits || [])
        .map(
          (prod) => `
        <tr>
          <td>${prod.reference || "N/A"}</td>
          <td>${prod.designation || "Produit"}</td>
          <td>${parseFloat(prod.BonAvoirProduit?.quantite || 0).toFixed(2)}</td>
          <td>${parseFloat(prod.BonAvoirProduit?.prix_unitaire || 0).toFixed(2)} Dh</td>
          <td>${parseFloat(prod.BonAvoirProduit?.remise || 0).toFixed(2)} Dh</td>
          <td>${parseFloat(prod.BonAvoirProduit?.total_ligne || 0).toFixed(2)} Dh</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p style="font-size:14px; font-weight:bold;">
      <strong>Montant Total:</strong> ${total.toFixed(2)} Dh
    </p>

    <p style="font-size:10px; font-style:italic;">
    Arrêté le présent bon d'avoir à la somme de :
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

      const issueDate = bonAvoir.date_creation
        ? new Date(bonAvoir.date_creation)
        : new Date();

      const pdfTotalText = totalToFrenchText(total);

      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">Bon d'Avoir</h1>
        <h3 style="margin:5px 0;">Hassan - Aluminium-Inox</h3>
        <p style="font-size:10px;">Tél: +212 661-431237</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div>
          <h4 style="margin-bottom:5px;">Client</h4>
          <p><strong>Nom:</strong> ${bonAvoir.client_name || "Client inconnu"}</p>
          <p><strong>Téléphone:</strong> ${bonAvoir.client_phone || "Non spécifié"}</p>
          <p><strong>Bon Livraison:</strong> ${bonAvoir.bon_livraison_ref}</p>
        </div>
        <div>
          <h4 style="margin-bottom:5px;">Informations du Bon d'Avoir</h4>
          <p><strong>N°:</strong> ${bonAvoir.num_bon_avoir}</p>
          <p><strong>Date création:</strong> ${formatDate(issueDate)}</p>
          <p><strong>Motif:</strong> ${getMotifLabel(bonAvoir.motif)}</p>
          <p><strong>Statut:</strong> ${getStatusLabel(bonAvoir.status)}</p>
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
          ${(bonAvoir.produits || [])
            .map(
              (prod, i) => `
            <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
              <td style="border:1px solid #ddd; padding:5px;">${prod.reference || "N/A"}</td>
              <td style="border:1px solid #ddd; padding:5px;">${prod.designation || "Produit"}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:center;">${parseFloat(prod.BonAvoirProduit?.quantite || 0).toFixed(2)}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(prod.BonAvoirProduit?.prix_unitaire || 0).toFixed(2)} Dh</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(prod.BonAvoirProduit?.remise || 0).toFixed(2)} Dh</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right; font-weight:bold;">${parseFloat(prod.BonAvoirProduit?.total_ligne || 0).toFixed(2)} Dh</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        <p style="font-size:14px; font-weight:bold; color:#2c5aa0;">
          Montant Total: ${total.toFixed(2)} Dh
        </p>
        <p style="font-size:10px; font-style:italic;">
          Arrêté le présent bon d'avoir à la somme de : <strong>${pdfTotalText}</strong>
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

      pdf.save(`Bon-Avoir-${bonAvoir.num_bon_avoir}.pdf`);
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };

  const canValidate = bonAvoir.status === "brouillon";
  const canEdit = ["brouillon", "valide"].includes(bonAvoir.status);
  const isUsed = bonAvoir.status === "utilise";

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        <div className="d-flex align-items-center">
          <FiTag className="me-2" />
          Bon d'Avoir #{bonAvoir.num_bon_avoir}
          <Badge color={getStatusBadge(formData.status)} className="ms-2">
            {getStatusLabel(formData.status)}
          </Badge>
          <Badge color={getMotifBadge(bonAvoir.motif)} className="ms-2">
            {getMotifLabel(bonAvoir.motif)}
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
                  <strong>Nom:</strong>{" "}
                  {bonAvoir.client_name || "Client inconnu"}
                </p>
                <p>
                  <strong>Téléphone:</strong>{" "}
                  {bonAvoir.client_phone || "Non spécifié"}
                </p>
                <p>
                  <strong>Adresse:</strong>{" "}
                  {bonAvoir.client?.address || "Non spécifiée"}
                </p>
              </div>
            </div>
          </div>

          {/* Bon Avoir Information */}
          <div className="col-md-6">
            <div className="mb-3">
              <h6>
                <FiFileText className="me-2" />
                Informations du Bon d'Avoir
              </h6>
              <div className="p-3 bg-light rounded">
                <p>
                  <strong>Date création:</strong>{" "}
                  {new Date(bonAvoir.date_creation).toLocaleDateString("fr-FR")}
                </p>
                <p>
                  <strong>Bon Livraison:</strong> {bonAvoir.bon_livraison_ref}
                </p>
                {isUsed && bonAvoir.utilise_le && (
                  <p>
                    <strong>Utilisé le:</strong>{" "}
                    {new Date(bonAvoir.utilise_le).toLocaleDateString("fr-FR")}
                  </p>
                )}
                <p>
                  <strong>Motif:</strong> {getMotifLabel(bonAvoir.motif)}
                </p>
              </div>
            </div>
          </div>

          {/* Status and Editable Fields */}
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Statut *</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                disabled={!canEdit || isUsed}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Motif *</label>
              <select
                className="form-control"
                value={formData.motif}
                onChange={(e) => handleInputChange("motif", e.target.value)}
                disabled={!canEdit || isUsed}
              >
                {motifOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                disabled={!canEdit || isUsed}
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
                    <th>Quantité</th>
                    <th>Prix Unitaire</th>
                    <th>Remise</th>
                    <th>Total Ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {(bonAvoir.produits || []).map((prod, index) => (
                    <tr key={prod.id || index}>
                      <td>{prod.reference || "N/A"}</td>
                      <td>{prod.designation || "Produit"}</td>
                      <td>
                        {parseFloat(
                          prod.BonAvoirProduit?.quantite || 0,
                        ).toFixed(2)}
                      </td>
                      <td>
                        {parseFloat(
                          prod.BonAvoirProduit?.prix_unitaire || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(prod.BonAvoirProduit?.remise || 0).toFixed(
                          2,
                        )}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(
                          prod.BonAvoirProduit?.total_ligne || 0,
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
                  <h6>Résumé du Bon d'Avoir</h6>
                  <p>
                    <strong>N° Bon d'Avoir:</strong> {bonAvoir.num_bon_avoir}
                  </p>
                  <p>
                    <strong>Client:</strong>{" "}
                    {bonAvoir.client_name || "Client inconnu"}
                  </p>
                  <p>
                    <strong>Produits:</strong> {produitsCount} article(s)
                  </p>
                  <p>
                    <strong>Statut:</strong> {getStatusLabel(formData.status)}
                  </p>
                  <p>
                    <strong>Motif:</strong> {getMotifLabel(formData.motif)}
                  </p>
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Montant Total:</span>
                    <span>{total.toFixed(2)} Dh</span>
                  </div>
                  {totalText && (
                    <div
                      className="text-start mt-2"
                      style={{ fontSize: "0.85em", fontStyle: "italic" }}
                    >
                      <small>
                        Arrêté le présent bon d'avoir à la somme de :
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
              className="me-2"
            >
              <FiDownload className="me-2" />
              PDF
            </Button>
          </div>

          <div>
            {canValidate && (
              <Button
                onClick={handleValidate}
                color="info"
                className="me-2"
                disabled={isSubmitting}
              >
                <FiCheck className="me-2" />
                Valider
              </Button>
            )}

            <Button onClick={toggle} color="danger" className="me-2">
              <FiX className="me-2" />
              Fermer
            </Button>

            {canEdit && !isUsed && (
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

export default BonAvoirDetailsModal;
