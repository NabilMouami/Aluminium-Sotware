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

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatDateWithTime = (dateStr) => {
      if (!dateStr) return "—";
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleString("fr-FR", {
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

    const creationDateFormatted = formatDateWithTime(devis.date_creation);
    const printTotalText = totalToFrenchText(total);

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>DEVIS ${devis.num_devis}</title>
  <meta charset="UTF-8" />

  <style>
    @page {
      size: A4;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
      text-transform: uppercase;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 0.8rem;
      margin: 0;
      padding: 10mm;
      color: #000;
      background: #fff;
    }

    .header {
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    h2 {
      margin: 0 0 10px;
      font-size: 2rem;
      letter-spacing: 1px;
    }

    .info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    th, td {
      border: 1.5px solid #000;
      padding: 10px;
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
      font-size: 1.1rem;
      margin: 30px;
      font-weight: bold;
    }
  </style>
</head>

<body>
  <div class="header">
    <h2>DEVIS</h2>
    <p>ALUMINIUM OULAD BRAHIM – TÉL: +212 671953725</p>
  </div>

  <div class="info">
    <div>
      <strong>NOM CLIENT :</strong><br/>
      ${devis.client_name || devis.client?.nom_complete || "—"}
    </div>

    <div style="text-align:right;">
      <strong>N° DEVIS :</strong> ${devis.num_devis}<br/>
      <strong>DATE CRÉATION :</strong> ${creationDateFormatted}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>CODE</th>
        <th>DÉSIGNATION</th>
        <th>QTÉ</th>
        <th>PRIX U</th>
        <th>MONTANT</th>
      </tr>
    </thead>
    <tbody>
      ${(devis.produits || [])
        .map(
          (prod) => `
        <tr>
          <td>${prod.reference || "—"}</td>
          <td>${prod.designation || "—"}</td>
          <td style="text-align:center;">
            ${Number(prod.DevisProduit?.quantite || 0).toFixed(2)}
          </td>
          <td style="text-align:right;">
            ${Number(prod.DevisProduit?.prix_unitaire || 0).toFixed(2)}
          </td>
          <td style="text-align:right;">
            ${Number(prod.DevisProduit?.total_ligne || 0).toFixed(2)}
          </td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="net-box">
      TOTAL À PAYER : ${total.toFixed(2)} DH
    </div>

    <div class="italic">
      ${printTotalText}
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
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const generateAndDownloadPDF = async () => {
    try {
      const container = document.createElement("div");

      container.style.width = "210mm";
      container.style.minHeight = "150mm";
      container.style.padding = "15mm";
      container.style.background = "#fff";
      container.style.color = "#000";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "0.8rem";
      container.style.textTransform = "uppercase";
      container.style.boxSizing = "border-box";
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";

      const formatDateWithTime = (dateStr) => {
        if (!dateStr) return "—";
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return "—";
          return d.toLocaleString("fr-FR", {
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

      const creationDateFormatted = formatDateWithTime(devis.date_creation);
      const totalText = totalToFrenchText(total);

      container.innerHTML = `
  <div style="text-align:center; border-bottom:3px solid #000; padding-bottom:15px; margin-bottom:20px;">
    <h1 style="margin:0; letter-spacing:1px;">DEVIS</h1>
    <p style="margin:8px 0; font-weight:bold;">ALUMINIUM OULAD BRAHIM</p>
    <p>TÉL : +212 671953725</p>
  </div>

  <div style="display:flex; justify-content:space-between; margin-bottom:25px;">
    <div>
      <p><strong>NOM CLIENT :</strong><br/>
        ${devis.client_name || devis.client?.nom_complete || "—"}
      </p>
    </div>
    <div style="text-align:right;">
      <p><strong>N° DEVIS :</strong> ${devis.num_devis}</p>
      <p><strong>DATE CRÉATION :</strong> ${creationDateFormatted}</p>
    </div>
  </div>

  <table style="width:100%; border-collapse:collapse; margin-bottom:25px;">
    <thead>
      <tr>
        <th style="border:1.5px solid #000; padding:10px;">CODE</th>
        <th style="border:1.5px solid #000; padding:10px;">DÉSIGNATION</th>
        <th style="border:1.5px solid #000; padding:10px;">QTÉ</th>
        <th style="border:1.5px solid #000; padding:10px;">PRIX U</th>
        <th style="border:1.5px solid #000; padding:10px;">MONTANT</th>
      </tr>
    </thead>
    <tbody>
      ${(devis.produits || [])
        .map(
          (prod) => `
        <tr>
          <td style="border:1.5px solid #000; padding:8px;">${prod.reference || "—"}</td>
          <td style="border:1.5px solid #000; padding:8px;">${prod.designation || "—"}</td>
          <td style="border:1.5px solid #000; padding:8px; text-align:center;">
            ${Number(prod.DevisProduit?.quantite || 0).toFixed(2)}
          </td>
          <td style="border:1.5px solid #000; padding:8px; text-align:right;">
            ${Number(prod.DevisProduit?.prix_unitaire || 0).toFixed(2)}
          </td>
          <td style="border:1.5px solid #000; padding:8px; text-align:right;">
            ${Number(prod.DevisProduit?.total_ligne || 0).toFixed(2)}
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
      NET À PAYER : ${total.toFixed(2)} 
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

      pdf.save(`Devis-${devis.num_devis}.pdf`);
      topTost("PDF généré et téléchargé !", "success");
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
