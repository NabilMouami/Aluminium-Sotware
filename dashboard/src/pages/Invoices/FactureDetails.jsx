import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Spinner,
  Alert,
} from "reactstrap";
import {
  FiPrinter,
  FiDownload,
  FiCalendar,
  FiUser,
  FiArrowLeft,
  FiShoppingCart,
} from "react-icons/fi";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "payée", label: "Payée" },
  { value: "partiellement_payée", label: "Partiellement Payée" },
  { value: "annulée", label: "Annulée" },
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

const FactureDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [totalText, setTotalText] = useState("");
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);

  const [facture, setFacture] = useState(null);
  const [formData, setFormData] = useState({
    status: "brouillon",
    notes: "",
    mode_reglement: "espèces",
    advancements: [],
  });

  useEffect(() => {
    if (id) {
      fetchFactureDetails();
    }
  }, [id]);

  const fetchFactureDetails = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/factures/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const f = response.data.facture || response.data;
      setFacture(f);

      setFormData({
        status: f.status || "brouillon",
        notes: f.notes || "",
        mode_reglement: f.mode_reglement || "espèces",
        advancements: f.advancements || [],
      });
    } catch (error) {
      console.error("Error fetching facture:", error);
      topTost("Erreur lors du chargement de la facture", "error");
      navigate("/factures");
    } finally {
      setLoading(false);
    }
  };

  // Calculate total in French text
  useEffect(() => {
    const calculateTotalText = () => {
      if (facture) {
        const total = parseFloat(facture.montant_ttc) || 0;
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

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner color="primary" />
        <div className="mt-3">Chargement de la facture...</div>
      </Container>
    );
  }

  if (!facture) {
    return (
      <Container className="py-5">
        <Alert color="danger">Facture introuvable</Alert>
        <Button color="primary" onClick={() => navigate("/facture/create")}>
          <FiArrowLeft className="me-2" /> Retour
        </Button>
      </Container>
    );
  }

  // ────────────────────────────────────────────────
  //  Normalized / safe values
  // ────────────────────────────────────────────────
  const numFacture = facture.num_facture || "—";
  const clientName = facture.client?.nom_complete || "—";
  const clientPhone = facture.client?.telephone || "—";
  const clientAddress = facture.client?.address || "—";
  const clientVille = facture.client?.ville || "";

  const montantHT = parseFloat(facture.montant_ht || 0);
  const montantTVA = parseFloat(facture.montant_tva || 0);
  const montantTTC = parseFloat(facture.montant_ttc || 0);
  const montantPaye = parseFloat(facture.montant_paye || 0);
  const restant = parseFloat(
    facture.montant_restant || montantTTC - montantPaye,
  );

  const tvaRate = parseFloat(facture.tva || 20);
  const dateFacturation = facture.date_facturation
    ? new Date(facture.date_facturation).toLocaleDateString("fr-FR")
    : "—";

  const statusLabel =
    statusOptions.find((opt) => opt.value === facture.status)?.label ||
    facture.status;

  const produits = Array.isArray(facture.produits) ? facture.produits : [];

  const getStatusColor = (status) => {
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
  const total = parseFloat(facture.montant_ttc) || 0;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");

    const formatDateWithTime = (dateString) => {
      if (!dateString) return "—";
      try {
        const date = new Date(dateString);
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

    const creationDateFormatted = formatDateWithTime(facture.date_creation);

    const printTotalText = totalToFrenchText(total);

    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>Facture ${numFacture}</title>

  <style>
    @page {
      size: A4;
      margin: 10mm;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      margin: 0;
      color: #000;
    }

    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 6px;
      text-align: left;
    }

    th {
      background: #f5f5f5;
    }

    .totals {
      text-align: right;
      margin-top: 20px;
    }

    .strong {
      font-weight: bold;
    }
  </style>
</head>

<body onload="window.print(); window.onafterprint = () => window.close();">

  <div class="header">
    <h2 style="margin:0;">FACTURE</h2>
    <p style="margin:5px 0;">ALUMINIUM OULAD BRAHIM</p>
    <p style="margin:0;">Tél: +212 671953725</p>
  </div>

  <div style="display:flex; justify-content:space-between; margin:20px 0;">
    <div>
      <strong>Client:</strong> ${clientName}
    </div>
    <div style="text-align:right;">
      <strong>N° Facture:</strong> ${numFacture}<br/>
      <strong>Date création :</strong> ${creationDateFormatted}<br/>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix U</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${produits
        .map(
          (p) => `
        <tr>
          <td>${p.reference || "—"}</td>
          <td>${p.designation || "—"}</td>
          <td>${p.FactureProduit?.quantite || 0}</td>
          <td>${Number(p.FactureProduit?.prix_unitaire || 0).toFixed(2)}</td>
          <td>${Number(p.FactureProduit?.montant_ht_ligne || 0).toFixed(2)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Total HT:</strong> ${montantHT.toFixed(2)}</p>
    <p><strong>TVA ${tvaRate}%:</strong> ${montantTVA.toFixed(2)}</p>
    <p class="strong">Total TTC: ${montantTTC.toFixed(2)}</p>
    <p style="font-size:10px; font-style:italic;">
      <strong>${printTotalText}</strong>
    </p>
  </div>

</body>
</html>
`;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "—";

    const date = new Date(isoString);

    // Will automatically use browser's timezone (good enough in most cases)
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
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

      const issueDate = facture.date_facturation
        ? new Date(facture.date_facturation)
        : facture.createdAt || new Date();

      const formatDateWithTime = (dateString) => {
        if (!dateString) return "—";
        try {
          const date = new Date(dateString);
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

      const creationDateFormatted = formatDateWithTime(facture.date_creation);

      // Get the total text for PDF
      const printTotalText = totalToFrenchText(total);
      const produits = Array.isArray(facture.produits) ? facture.produits : [];

      pdfContainer.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
          <h1 style="margin:0; color:#2c5aa0;">Facture</h1>
          <h3 style="margin:5px 0;">ALUMINIUM OULAD BRAHIM</h3>
          <p style="font-size:10px;">Tél: +212 671953725</p>
        </div>
  
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
          <div>
            <h4 style="margin-bottom:5px;">Client</h4>
            <p><strong>Client:</strong> ${facture.clientName || facture.client?.nom_complete}</p>
          </div>
          <div style="text-align:right;">
            <h4 style="margin-bottom:5px;">Informations de la Facture</h4>
            <p><strong>N°:</strong> ${facture.invoiceNumber || facture.num_facture}</p>
      <strong>Date création :</strong> ${creationDateFormatted}<br/>
          </div>
        </div>
  
        <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
          <thead>
            <tr style="background-color:#2c5aa0; color:#fff;">
              <th style="padding:6px; border:1px solid #2c5aa0;">Code</th>
              <th style="padding:6px; border:1px solid #2c5aa0;">Produit</th>
              <th style="padding:6px; border:1px solid #2c5aa0;">Qté</th>
              <th style="padding:6px; border:1px solid #2c5aa0;">Prix U</th>
              <th style="padding:6px; border:1px solid #2c5aa0;">Total Ligne</th>
            </tr>
          </thead>
          <tbody>
            ${produits
              .map(
                (p, i) => `
                  <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
              <td style="border:1px solid #ddd; padding:5px;">${p.reference || "N/A"}</td>
              <td style="border:1px solid #ddd; padding:5px;">${p.designation || "Produit"}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:center;">${p.FactureProduit?.quantite || 0}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(p.FactureProduit?.prix_unitaire || 0).toFixed(2)}</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(p.FactureProduit?.total_ligne || 0).toFixed(2)}</td>
            </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
  
        <div class="totals">
          <p><strong>Total HT:</strong> ${montantHT.toFixed(2)} </p>
          <p><strong>TVA ${tvaRate}%:</strong> ${montantTVA.toFixed(2)} </p>
          <p class="strong">Total TTC: ${montantTTC.toFixed(2)} </p>
    <p style="font-size:10px; font-style:italic;">
      <strong>${printTotalText}</strong>
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
    <Container className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button color="light" onClick={() => navigate("/facture/create")}>
            <FiArrowLeft className="me-2" /> Retour
          </Button>
          <h3 className="mt-3 mb-1">
            Facture #{numFacture}
            <Badge color={getStatusColor(facture.status)} className="ms-3">
              {statusLabel}
            </Badge>
          </h3>
        </div>

        <div className="d-flex gap-2">
          <Button color="outline-primary" onClick={handlePrint}>
            <FiPrinter className="me-2" /> Imprimer
          </Button>
          <Button color="outline-secondary" onClick={generateAndDownloadPDF}>
            <FiDownload className="me-2" /> PDF
          </Button>
        </div>
      </div>

      <Row>
        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiUser className="me-2" /> Client
            </h5>
            <div className="mt-2">
              <p>
                <strong>Nom:</strong> {clientName}
              </p>
              <p>
                <strong>Téléphone:</strong> {clientPhone}
              </p>
              <p>
                <strong>Adresse:</strong> {clientAddress}
              </p>
              <p>
                <strong>Ville:</strong> {clientVille}
              </p>
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiCalendar className="me-2" /> Facture
            </h5>
            <div className="mt-2">
              <p>
                <strong>Date facturation:</strong> {dateFacturation}
              </p>
              <p>
                <strong>Créée le :</strong>{" "}
                {formatDateTime(facture.date_creation)}
              </p>{" "}
              <p>
                <strong>Mode règlement:</strong> {facture.mode_reglement}
              </p>
              {facture.notes && (
                <p>
                  <strong>Notes:</strong> {facture.notes}
                </p>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Products */}
      <Card className="p-3 mb-4">
        <h5>
          <FiShoppingCart className="me-2" /> Produits
        </h5>
        <div className="table-responsive mt-3">
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th>Code</th>
                <th>Désignation</th>
                <th>Qté</th>
                <th>Prix U</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {produits.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
                    Aucun produit
                  </td>
                </tr>
              ) : (
                produits.map((prod) => (
                  <tr key={prod.id}>
                    <td>{prod.reference}</td>
                    <td>{prod.designation}</td>
                    <td className="text-center">
                      {prod.FactureProduit?.quantite || 0}
                    </td>
                    <td className="text-end">
                      {Number(prod.FactureProduit?.prix_unitaire || 0).toFixed(
                        2,
                      )}{" "}
                    </td>
                    <td className="text-end">
                      {Number(
                        prod.FactureProduit?.montant_ht_ligne || 0,
                      ).toFixed(2)}{" "}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-3">
        <h5>Résumé financier</h5>
        <Row className="mt-3">
          <Col md={6}>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-2">
                <span>Total HT</span>
                <strong>{montantHT.toFixed(2)} </strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>TVA {tvaRate}%</span>
                <strong>{montantTVA.toFixed(2)} </strong>
              </div>
              <div className="d-flex justify-content-between border-top pt-2 fw-bold fs-5">
                <span>Total TTC</span>
                <span className="text-primary">{montantTTC.toFixed(2)} </span>
              </div>

              {totalText && (
                <div className="mt-3 small fst-italic">
                  Arrêté à la somme de :<br />
                  <strong>{totalText}</strong>
                </div>
              )}
            </div>
          </Col>

          <Col md={6}>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-2">
                <span>Montant payé</span>
                <strong className="text-success">
                  {montantPaye.toFixed(2)}
                </strong>
              </div>
              <div className="d-flex justify-content-between fw-bold border-top pt-2">
                <span>Reste à payer</span>
                <span className={restant > 0 ? "text-danger" : "text-success"}>
                  {restant.toFixed(2)}
                </span>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </Container>
  );
};

export default FactureDetailsPage;
