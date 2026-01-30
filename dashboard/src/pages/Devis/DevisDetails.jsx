import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Input,
  Spinner,
  Alert,
} from "reactstrap";
import {
  FiPrinter,
  FiDownload,
  FiSave,
  FiFileText,
  FiUser,
  FiShoppingCart,
  FiArrowLeft,
  FiCalendar,
  FiCreditCard,
} from "react-icons/fi";
import Select from "react-select";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// Devis status options
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyé", label: "Envoyé" },
  { value: "accepté", label: "Accepté" },
  { value: "refusé", label: "Refusé" },
  { value: "expiré", label: "Expiré" },
  { value: "transformé_en_facture", label: "Transformé en Facture" },
  { value: "transformé_en_bl", label: "Transformé en BL" },
  { value: "en_attente", label: "En Attente" },
];

// Convert total to French text
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
      if (num === 0 && h > 1) result += "s";
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
        if (t === 8 && u === 0) result += "s";
      }
    }

    return result;
  };

  const convertNumberToWords = (num) => {
    if (num === 0) return "zéro";

    let result = "";

    // Billions
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

const DevisDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [devis, setDevis] = useState(null);
  const [formData, setFormData] = useState({
    status: "brouillon",
    notes: "",
    conditions_reglement: "",
    objet: "",
    conditions_generales: "",
  });
  const [totalText, setTotalText] = useState("");
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch devis details
  useEffect(() => {
    if (id) {
      fetchDevisDetails();
    }
  }, [id]);

  const fetchDevisDetails = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/devis/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const devisData = response.data.devis || response.data;
      setDevis(devisData);

      setFormData({
        status: devisData.status || "brouillon",
        notes: devisData.notes || "",
        conditions_reglement: devisData.conditions_reglement || "",
        objet: devisData.objet || "",
        conditions_generales: devisData.conditions_generales || "",
      });
    } catch (error) {
      console.error("Error fetching devis details:", error);
      topTost("Erreur lors du chargement du devis", "error");
      navigate("/devis");
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <Container className="py-5">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "60vh" }}
        >
          <Spinner color="primary" />
          <span className="ms-3">Chargement du devis...</span>
        </div>
      </Container>
    );
  }

  if (!devis) {
    return (
      <Container className="py-5">
        <Alert color="danger">Devis introuvable</Alert>
        <Button color="primary" onClick={() => navigate("/devis/list")}>
          <FiArrowLeft className="me-2" />
          Retour à la liste
        </Button>
      </Container>
    );
  }

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

  const getStatusLabel = (status) => {
    return statusOptions.find((opt) => opt.value === status)?.label || status;
  };

  const total = parseFloat(devis.montant_ttc) || 0;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

    const printTotalText = totalToFrenchText(total);

    const printWindow = window.open("", "_blank");

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
    <p style="margin: 5px 0;">ALUMINIUM OULAD BRAHIM</p>
    <p style="margin: 0;">Tél: +212 671953725</p>
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
        <th>Prix U</th>
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
          <td>${parseFloat(prod.DevisProduit?.prix_unitaire || 0).toFixed(2)} </td>
          <td>${parseFloat(prod.DevisProduit?.total_ligne || 0).toFixed(2)} </td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p style="font-size:14px; font-weight:bold;">
      <strong>Total a Payer:</strong> ${total.toFixed(2)} 
    </p>

    <p style="font-size:10px; font-style:italic;">
      <strong>${printTotalText}</strong>
    </p>
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

      const issueDate = devis.date_creation
        ? new Date(devis.date_creation)
        : new Date();

      const pdfTotalText = totalToFrenchText(total);

      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">Devis</h1>
        <h3 style="margin:5px 0;">ALUMINIUM OULAD BRAHIM</h3>
        <p style="font-size:10px;">Tél: +212 671953725</p>
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
            <th style="padding:6px; border:1px solid #2c5aa0;">Prix U</th>
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
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(prod.DevisProduit?.prix_unitaire || 0).toFixed(2)} </td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right; font-weight:bold;">${parseFloat(prod.DevisProduit?.total_ligne || 0).toFixed(2)} </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        <p style="font-size:14px; font-weight:bold; color:#2c5aa0;">
          Total a Payer: ${total.toFixed(2)} 
        </p>
        <p style="font-size:10px; font-style:italic;">
          : <strong>${pdfTotalText}</strong>
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

  const canEdit = ["brouillon", "en_attente", "refusé", "expiré"].includes(
    devis.status,
  );

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

  const issueDate = devis.date_creation
    ? new Date(devis.date_creation)
    : new Date();

  return (
    <Container className="py-4">
      {/* Header with back button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button
            color="light"
            className="mb-2"
            onClick={() => navigate("/devis")}
          >
            <FiArrowLeft className="me-2" />
            Retour à la liste
          </Button>
          <h2 className="mb-0">
            <FiFileText className="me-2" />
            Devis #{devis.num_devis}
            <Badge color={getStatusBadge(formData.status)} className="ms-2">
              {getStatusLabel(formData.status)}
            </Badge>
          </h2>
        </div>

        <div className="d-flex gap-2">
          <Button onClick={handlePrint} color="outline-primary">
            <FiPrinter className="me-2" />
            Imprimer
          </Button>
          <Button onClick={generateAndDownloadPDF} color="outline-secondary">
            <FiDownload className="me-2" />
            PDF
          </Button>
        </div>
      </div>

      <Row>
        {/* Client Information */}
        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiUser className="me-2" />
              Informations Client
            </h5>
            <div className="p-2">
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
              {devis.client?.email && (
                <p>
                  <strong>Email:</strong> {devis.client.email}
                </p>
              )}
              {devis.client?.address && (
                <p>
                  <strong>Adresse:</strong> {devis.client.address}
                </p>
              )}
            </div>
          </Card>
        </Col>

        {/* Devis Information */}
        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiCalendar className="me-2" />
              Informations du Devis
            </h5>
            <div className="p-2">
              <p>
                <strong>Date création:</strong> {formatDate(issueDate)}
              </p>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Status and Notes - Editable when in edit mode */}
      {isEditing && (
        <Row className="mb-4">
          <Col md={4}>
            <Card className="p-3">
              <label className="form-label">
                <FiCreditCard className="me-2" />
                Statut
              </label>
              <Select
                value={statusOptions.find(
                  (opt) => opt.value === formData.status,
                )}
                onChange={(opt) => handleInputChange("status", opt.value)}
                options={statusOptions}
                isDisabled={!isEditing}
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: "#ced4da",
                    "&:hover": {
                      borderColor: "#80bdff",
                    },
                  }),
                }}
              />
            </Card>
          </Col>

          <Col md={8}>
            <Card className="p-3">
              <label className="form-label">Notes</label>
              <Input
                type="textarea"
                rows="3"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notes supplémentaires..."
                disabled={!isEditing}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Products Section */}
      <Card className="p-3 mb-4">
        <h5>
          <FiShoppingCart className="me-2" />
          Produits
        </h5>
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Code</th>
                <th>Désignation</th>
                <th>Quantité</th>
                <th>Prix Unitaire</th>
                <th>Total Ligne</th>
              </tr>
            </thead>
            <tbody>
              {(devis.produits || []).map((prod, index) => (
                <tr key={prod.id || index}>
                  <td>{prod.reference || "N/A"}</td>
                  <td>{prod.designation || "Produit"}</td>
                  <td>
                    {parseFloat(prod.DevisProduit?.quantite || 0).toFixed(2)}
                  </td>
                  <td>
                    {parseFloat(prod.DevisProduit?.prix_unitaire || 0).toFixed(
                      2,
                    )}{" "}
                  </td>
                  <td>
                    {parseFloat(prod.DevisProduit?.total_ligne || 0).toFixed(
                      2,
                    )}{" "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Section */}
      <Card className="p-3">
        <h5>Résumé du Devis</h5>
        <Row>
          <Col md={6}>
            <div className="p-3">
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
              {formData.notes && (
                <div className="mt-3">
                  <strong>Notes:</strong>
                  <p className="text-muted">{formData.notes}</p>
                </div>
              )}
            </div>
          </Col>

          <Col md={6}>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between fw-bold border-top pt-2">
                <span>Total a Payer:</span>
                <span>{total.toFixed(2)} </span>
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
          </Col>
        </Row>
      </Card>

      {/* Action Buttons Footer */}
      <div className="d-flex justify-content-between mt-4 pt-3 border-top">
        <div>
          <Button
            onClick={handlePrint}
            color="outline-primary"
            className="mt-2"
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
          <Button
            color="secondary"
            className="me-2"
            onClick={() => navigate("/devis/create")}
          >
            <FiArrowLeft className="me-2" />
            Retour
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default DevisDetailsPage;
