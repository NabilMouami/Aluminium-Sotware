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
  FiSend,
  FiCheckCircle,
  FiEdit,
  FiFileText,
  FiUser,
  FiShoppingCart,
} from "react-icons/fi";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

// Devis status options
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyé", label: "Envoyé" },
  { value: "accepté", label: "Accepté" },
  { value: "refusé", label: "Refusé" },
  { value: "expiré", label: "Expiré" },
  { value: "transformé_en_commande", label: "Transformé en Commande" },
  { value: "transformé_en_facture", label: "Transformé en Facture" },
  { value: "transformé_en_bl", label: "Transformé en BL" },
  { value: "en_attente", label: "En Attente" },
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

const DevisDetailsModal = ({
  isOpen,
  toggle,
  devis,
  onUpdate,
  onConvertToBL,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    status: "brouillon",
    notes: "",
    conditions_reglement: "",
    objet: "",
    conditions_generales: "",
  });
  const [totalText, setTotalText] = useState("");
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);

  // Initialize form data when devis changes
  useEffect(() => {
    if (devis) {
      console.log("Initializing form with devis:", devis);
      setFormData({
        status: devis.status || "brouillon",
        notes: devis.notes || "",
        conditions_reglement: devis.conditions_reglement || "",
        objet: devis.objet || "",
        conditions_generales: devis.conditions_generales || "",
      });
    }
  }, [devis]);

  // Calculate total in French text
  useEffect(() => {
    const calculateTotalText = () => {
      if (devis) {
        const total = parseFloat(devis.montant_ttc) || 0;
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

    if (devis) {
      calculateTotalText();
    }
  }, [devis]);

  if (!devis) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "warning";
      case "envoyé":
        return "primary";
      case "accepté":
        return "success";
      case "refusé":
        return "danger";
      case "expiré":
        return "dark";
      case "transformé_en_commande":
        return "info";
      case "transformé_en_facture":
        return "info";
      case "transformé_en_bl":
        return "info";
      case "en_attente":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const total = parseFloat(devis.montant_ttc) || 0;

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
        conditions_reglement: formData.conditions_reglement,
        objet: formData.objet,
        conditions_generales: formData.conditions_generales,
      };

      console.log("Sending update data to backend:", updateData);

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.put(
        `${config_url}/api/devis/${devis.id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Update response from backend:", response.data);

      topTost("Devis mis à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.devis || response.data);
      }

      toggle();
    } catch (error) {
      console.error("Error updating devis:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la mise à jour du devis";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendDevis = async () => {
    const result = await MySwal.fire({
      title: "Envoyer ce devis ?",
      text: "Voulez-vous marquer ce devis comme 'envoyé' au client ?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, envoyer",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      await handleUpdateStatus("envoyé");
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setIsSubmitting(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.patch(
        `${config_url}/api/devis/${devis.id}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setFormData((prev) => ({ ...prev, status: newStatus }));
        topTost(`Statut mis à jour: ${getStatusLabel(newStatus)}`, "success");

        if (onUpdate) {
          onUpdate(response.data.devis || response.data);
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      topTost("Erreur lors de la mise à jour du statut", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToBL = async () => {
    const result = await MySwal.fire({
      title: "Convertir en Bon de Livraison ?",
      text: "Voulez-vous convertir ce devis en bon de livraison ? Cette action créera un nouveau bon de livraison.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, convertir",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        setIsSubmitting(true);
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.post(
          `${config_url}/api/devis/${devis.id}/convert-to-bl`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.data.success) {
          // Update devis status
          await handleUpdateStatus("transformé_en_commande");

          topTost("Devis converti en bon de livraison avec succès", "success");

          // Optionally redirect to the new BL
          MySwal.fire({
            title: "Conversion réussie !",
            text: "Voulez-vous voir le bon de livraison créé ?",
            icon: "success",
            showCancelButton: true,
            confirmButtonText: "Voir le BL",
            cancelButtonText: "Rester ici",
          }).then((result) => {
            if (result.isConfirmed && response.data.bonLivraison) {
              window.location.href = `/bon-livraisons/${response.data.bonLivraison.id}`;
            }
          });

          if (onConvertToBL) {
            onConvertToBL(response.data.bonLivraison);
          }

          toggle();
        }
      } catch (error) {
        console.error("Error converting devis:", error);
        const errorMsg =
          error.response?.data?.message || "Erreur lors de la conversion";
        topTost(errorMsg, "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getStatusLabel = (status) => {
    return statusOptions.find((opt) => opt.value === status)?.label || status;
  };

  const handlePrint = () => {
    if (!devis) return;

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR");
    };

    const issueDate = devis.date_creation
      ? new Date(devis.date_creation)
      : new Date();

    const printWindow = window.open("", "_blank");

    // Calculate total text for print
    const printTotalText = totalToFrenchText(total);

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Devis ${devis.num_devis}</title>
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
    <h2 style="margin: 0;">Devis</h2>
    <p style="margin: 5px 0;">Hassan - Aluminium-Inox</p>
    <p style="margin: 0;">Tél: +212 661-431237</p>
  </div>

  <div class="invoice-info">
    <div class="info-block">
      <p><strong>Nom Client:</strong> ${devis.client_name || devis.client?.nom_complete || "Client inconnu"}</p>
    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>N° Devis:</strong> ${devis.num_devis}</p>
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
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${(devis.produits || [])
        .map(
          (prod) => `
        <tr>
          <td>${prod.reference || "N/A"}</td>
          <td>${prod.designation || "Produit"}</td>
          <td>${parseFloat(prod.DevisProduit?.quantite || 0).toFixed(2)}</td>
          <td>${parseFloat(prod.DevisProduit?.prix_unitaire || 0).toFixed(2)} Dh</td>
          <td>${parseFloat(prod.DevisProduit?.total_ligne || 0).toFixed(2)} Dh</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    ${
      parseFloat(devis.remise) > 0
        ? `
      <p><strong>Sous-total:</strong> ${(total + parseFloat(devis.remise)).toFixed(2)} Dh</p>
      <p><strong>Remise globale:</strong> -${parseFloat(devis.remise).toFixed(2)} Dh</p>
    `
        : ""
    }
    <p style="font-size:14px; font-weight:bold;">
      <strong>Total a Payer:</strong> ${total.toFixed(2)} Dh
    </p>

     <p style="font-size:10px; font-style:italic;">
    Arrêté le présent devis à la somme de :
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

      const issueDate = devis.date_creation
        ? new Date(devis.date_creation)
        : new Date();

      const remise = parseFloat(devis.remise) || 0;
      const sousTotal = total + remise;

      // Calculate total text for PDF
      const pdfTotalText = totalToFrenchText(total);

      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">Devis</h1>
        <h3 style="margin:5px 0;">Hassan - Aluminium-Inox</h3>
        <p style="font-size:10px;">Tél: +212 661-431237</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div>
          <h4 style="margin-bottom:5px;">Client</h4>
          <p><strong>Nom client:</strong> ${devis.client_name || devis.client?.nom_complete || "Client inconnu"}</p>
        </div>
        <div>
          <h4 style="margin-bottom:5px;">Informations du Devis</h4>
          <p><strong>N°:</strong> ${devis.num_devis}</p>
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
            <th style="padding:6px; border:1px solid #2c5aa0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(devis.produits || [])
            .map(
              (prod, i) => `
            <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
              <td style="border:1px solid #ddd; padding:5px;">${prod.reference || "N/A"}</td>
              <td style="border:1px solid #ddd; padding:5px;">${prod.designation || "Produit"}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:center;">${parseFloat(prod.DevisProduit?.quantite || 0).toFixed(2)}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(prod.DevisProduit?.prix_unitaire || 0).toFixed(2)} Dh</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right; font-weight:bold;">${parseFloat(prod.DevisProduit?.total_ligne || 0).toFixed(2)} Dh</td>
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
          Arrêté le présent devis à la somme de : <strong>${pdfTotalText}</strong>
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

      pdf.save(`Devis-${devis.num_devis}.pdf`);
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };

  const canConvertToBL = devis.status === "accepté";
  const canSend = devis.status === "brouillon" || devis.status === "en_attente";
  const canEdit = ["brouillon", "en_attente", "refusé", "expiré"].includes(
    devis.status,
  );

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        <div className="d-flex align-items-center">
          <FiFileText className="me-2" />
          Devis #{devis.num_devis}
          <Badge color={getStatusBadge(formData.status)} className="ms-2">
            {getStatusLabel(formData.status)}
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
                  {devis.client_name ||
                    devis.client?.nom_complete ||
                    "Client inconnu"}
                </p>
                <p>
                  <strong>Téléphone:</strong>{" "}
                  {devis.client_phone ||
                    devis.client?.telephone ||
                    "Non spécifié"}
                </p>
                <p>
                  <strong>Adresse:</strong>{" "}
                  {devis.client?.address || "Non spécifiée"}
                </p>
              </div>
            </div>
          </div>

          {/* Devis Information */}
          <div className="col-md-6">
            <div className="mb-3">
              <h6>
                <FiFileText className="me-2" />
                Informations du Devis
              </h6>
              <div className="p-3 bg-light rounded">
                <p>
                  <strong>Date création:</strong>{" "}
                  {new Date(
                    devis.date_creation || devis.createdAt,
                  ).toLocaleDateString("fr-FR")}
                </p>
                <p>
                  <strong>Date acceptation:</strong>{" "}
                  {devis.date_acceptation
                    ? new Date(devis.date_acceptation).toLocaleDateString(
                        "fr-FR",
                      )
                    : "Non accepté"}
                </p>
                <p>
                  <strong>Mode règlement:</strong>{" "}
                  {devis.mode_reglement || "Non spécifié"}
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
                disabled={!canEdit}
              >
                {statusOptions.map((option) => (
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
                    <th>Quantité</th>
                    <th>Prix Unitaire</th>
                    <th>Remise Ligne</th>
                    <th>Total Ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {(devis.produits || []).map((prod, index) => (
                    <tr key={prod.id || index}>
                      <td>{prod.reference || "N/A"}</td>
                      <td>{prod.designation || "Produit"}</td>
                      <td>
                        {parseFloat(prod.DevisProduit?.quantite || 0).toFixed(
                          2,
                        )}
                      </td>
                      <td>
                        {parseFloat(
                          prod.DevisProduit?.prix_unitaire || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(
                          prod.DevisProduit?.remise_ligne || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(
                          prod.DevisProduit?.total_ligne || 0,
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
                  <h6>Résumé du Devis</h6>
                  <p>
                    <strong>N° Devis:</strong> {devis.num_devis}
                  </p>
                  <p>
                    <strong>Client:</strong>{" "}
                    {devis.client_name ||
                      devis.client?.nom_complete ||
                      "Client inconnu"}
                  </p>
                  <p>
                    <strong>Produits:</strong> {devis.produits?.length || 0}{" "}
                    article(s)
                  </p>
                  <p>
                    <strong>Statut:</strong> {getStatusLabel(formData.status)}
                  </p>
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
                  <div className="d-flex justify-content-between">
                    <span>Montant HT:</span>
                    <span>
                      {parseFloat(devis.montant_ht || 0).toFixed(2)} Dh
                    </span>
                  </div>
                  {parseFloat(devis.remise) > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Remise globale:</span>
                      <span>
                        -{parseFloat(devis.remise || 0).toFixed(2)} Dh
                      </span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Total a Payer:</span>
                    <span>{total.toFixed(2)} Dh</span>
                  </div>
                  {isCalculatingTotal ? (
                    <div
                      className="text-start mt-2"
                      style={{ fontSize: "0.85em", fontStyle: "italic" }}
                    >
                      <small>Calcul en cours...</small>
                    </div>
                  ) : totalText ? (
                    <div
                      className="text-start mt-2"
                      style={{ fontSize: "0.85em", fontStyle: "italic" }}
                    >
                      <small>Arrêté le présent devis à la somme de :</small>
                      <br />
                      <strong>{totalText}</strong>
                    </div>
                  ) : null}
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
            {canSend && (
              <Button
                onClick={handleSendDevis}
                color="info"
                className="me-2"
                disabled={isSubmitting}
              >
                <FiSend className="me-2" />
                Envoyer
              </Button>
            )}

            {canConvertToBL && (
              <Button
                onClick={handleConvertToBL}
                color="success"
                className="me-2"
                disabled={isSubmitting}
              >
                <FiCheckCircle className="me-2" />
                Convertir en BL
              </Button>
            )}

            <Button onClick={toggle} color="danger" className="me-2">
              <FiX className="me-2" />
              Fermer
            </Button>

            {canEdit && (
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

export default DevisDetailsModal;
