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
  FiUser,
  FiCalendar,
  FiArrowLeft,
  FiShoppingCart,
} from "react-icons/fi";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "payé", label: "Payé" },
  { value: "partiellement_payée", label: "Partiellement Payé" },
  { value: "annulée", label: "Annulé" },
];

// Your totalToFrenchText function (unchanged)
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

    if (num >= 100) {
      const h = Math.floor(num / 100);
      result += h === 1 ? "cent" : units[h] + " cent";
      num %= 100;
      if (num === 0 && h > 1) result += "s";
      if (num > 0) result += " ";
    }

    if (num < 10) result += units[num];
    else if (num < 20) result += teens[num - 10];
    else {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7) {
        result += "soixante" + (u === 1 ? " et onze" : "-" + teens[u]);
      } else if (t === 9) {
        result += "quatre-vingt" + "-" + teens[u];
      } else {
        result += tens[t];
        if (u === 1 && t !== 8) result += " et un";
        else if (u > 0) result += "-" + units[u];
        if (t === 8 && u === 0) result += "s";
      }
    }
    return result;
  };

  const convertNumberToWords = (num) => {
    if (num === 0) return "zéro";
    let result = "";

    if (num >= 1000000000) {
      const b = Math.floor(num / 1000000000);
      result +=
        convertLessThanOneThousand(b) + " milliard" + (b > 1 ? "s" : "") + " ";
      num %= 1000000000;
    }
    if (num >= 1000000) {
      const m = Math.floor(num / 1000000);
      result +=
        convertLessThanOneThousand(m) + " million" + (m > 1 ? "s" : "") + " ";
      num %= 1000000;
    }
    if (num >= 1000) {
      const t = Math.floor(num / 1000);
      result +=
        (t === 1 ? "mille" : convertLessThanOneThousand(t) + " mille") + " ";
      num %= 1000;
    }
    if (num > 0) result += convertLessThanOneThousand(num);

    return result.trim();
  };

  const dirhams = Math.floor(amount);
  const centimes = Math.round((amount - dirhams) * 100);

  let text =
    convertNumberToWords(dirhams) + " dirham" + (dirhams > 1 ? "s" : "");
  if (centimes > 0) {
    text +=
      " et " +
      convertNumberToWords(centimes) +
      " centime" +
      (centimes > 1 ? "s" : "");
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
};

const parseDateSafely = (dateInput) => {
  if (!dateInput) return null;

  // If it's already a valid Date object
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return dateInput;
  }

  // Try to parse as ISO string (like "2026-01-30T00:00:00.000Z")
  const date = new Date(dateInput);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // If that fails, try your existing dd/MM/yyyy format parsing
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
        const fallbackDate = new Date(year, month - 1, day);
        if (!isNaN(fallbackDate.getTime())) return fallbackDate;
      }
    }
  }

  return null;
};

const BonLivraisonDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bon, setBon] = useState(null);
  const [formData, setFormData] = useState({
    status: "brouillon",
    notes: "",
    advancements: [],
  });

  useEffect(() => {
    if (id) fetchBonDetails();
  }, [id]);

  const fetchBonDetails = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.get(`${config_url}/api/bon-livraisons/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data.bon || res.data;
      setBon(data);

      setFormData({
        status: data.status || "brouillon",
        notes: data.notes || "",
        advancements: (data.advancements || []).map((adv) => ({
          id: adv.id,
          amount: parseFloat(adv.amount) || 0,
          paymentDate: adv.paymentDate ? new Date(adv.paymentDate) : new Date(),
          paymentMethod: adv.paymentMethod || "espece",
          reference: adv.reference || "",
          notes: adv.notes || "",
        })),
      });
    } catch (err) {
      console.error(err);
      topTost("Erreur chargement bon de livraison", "error");
      navigate("/bon-livraisons");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner color="primary" />
        <div className="mt-3">Chargement du bon de livraison...</div>
      </Container>
    );
  }

  if (!bon) {
    return (
      <Container className="py-5">
        <Alert color="danger">Bon de livraison introuvable</Alert>
        <Button
          color="primary"
          onClick={() => navigate("/bon-livraison/create")}
        >
          <FiArrowLeft className="me-2" /> Retour
        </Button>
      </Container>
    );
  }

  // ─── Data normalization ───────────────────────────────
  const numBL = bon.num_bon_livraison || "—";
  const clientName = bon.client?.nom_complete || "—";
  const clientPhone = bon.client?.telephone || "—";
  const clientAddress = bon.client?.address || "—";
  const clientVille = bon.client?.ville || "";

  const montantHT = parseFloat(bon.montant_ht || 0);
  const montantTTC = parseFloat(bon.montant_ttc || 0);
  const totalAcomptes = parseFloat(bon.totalAdvancements || 0);
  const restant = parseFloat(bon.remainingAmount || montantTTC - totalAcomptes);

  const produits = Array.isArray(bon.produits) ? bon.produits : [];

  const formatDateTimeLocal = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const local = new Date(d.getTime() + 60 * 60 * 1000); // Morocco UTC+1
    return local.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
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

  const formatDateOnly = (dateInput) => {
    if (!dateInput) return "—";

    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return "—";

      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };
  const getStatusColor = (s) => {
    switch (s) {
      case "brouillon":
        return "warning";
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

  const issueDate = parseDateSafely(bon.date_creation) || new Date();

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Format creation date with time (like in UI)
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

    const creationDateFormatted = formatDateWithTime(bon.date_creation);
    const txt = totalToFrenchText(montantTTC);

    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>Bon de Livraison ${numBL}</title>
  <meta charset="UTF-8">
  <style>
    @page { margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
    th { background: #f5f5f5; }
    .totals { text-align: right; margin-top: 15px; }
    .italic { font-style: italic; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Bon de Livraison</h2>
    <p>ALUMINIUM OULAD BRAHIM – Tél: +212 671953725</p>
  </div>

  <div style="display:flex;justify-content:space-between;margin:20px 0;">
    <div>
      <strong>Client :</strong> ${clientName}<br/>
    </div>
    <div style="text-align:right;">
      <strong>N° Bon :</strong> ${numBL}<br/>
      <strong>Date création :</strong> ${creationDateFormatted}<br/>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix U (DH)</th>
        <th>Total (DH)</th>
      </tr>
    </thead>
    <tbody>
      ${produits
        .map(
          (p) => `
        <tr>
          <td>${p.reference || "—"}</td>
          <td>${p.designation || "—"}</td>
          <td style="text-align:center">${p.BonLivraisonProduit?.quantite || 0}</td>
          <td style="text-align:right">${Number(p.BonLivraisonProduit?.prix_unitaire || 0).toFixed(2)}</td>
          <td style="text-align:right">${Number(p.BonLivraisonProduit?.total_ligne || 0).toFixed(2)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Total à payer :</strong> ${montantTTC.toFixed(2)} DH</p>
    <p class="italic"><strong>${txt}</strong></p>
  </div>
  
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() {
        window.close();
      }, 100);
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
      container.style.padding = "15mm 20mm";
      container.style.background = "white";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "11px";
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";

      const formatDateForPDF = (dateString) => {
        if (!dateString) return "—";
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return "—";
          return date.toLocaleDateString("fr-FR");
        } catch {
          return "—";
        }
      };

      const pdfTotalText = totalToFrenchText(montantTTC);

      container.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
          <h1 style="margin:0; color:#2c5aa0;">Bon de Livraison</h1>
          <h3 style="margin:5px 0;">ALUMINIUM OULAD BRAHIM</h3>
          <p style="font-size:10px;">Tél: +212 671953725</p>
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
          <div>
            <h4 style="margin-bottom:5px;">Client</h4>
            <p>${clientName}<br/>
            ${clientPhone}</p>
          </div>
          <div style="text-align:right;">
            <h4 style="margin-bottom:5px;">Bon de Livraison</h4>
            <p><strong>N°:</strong> ${numBL}</p>
            <p><strong>Date création:</strong> ${formatDateForPDF(bon.date_creation)}</p>
            <p><strong>Date livraison:</strong> ${formatDateForPDF(bon.date_livraison)}</p>
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
            ${produits
              .map(
                (p, i) => `
              <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
                <td style="border:1px solid #ddd; padding:5px;">${p.reference || "—"}</td>
                <td style="border:1px solid #ddd; padding:5px;">${p.designation || "—"}</td>
                <td style="border:1px solid #ddd; padding:5px; text-align:center;">${p.BonLivraisonProduit?.quantite || 0}</td>
                <td style="border:1px solid #ddd; padding:5px; text-align:right;">${Number(p.BonLivraisonProduit?.prix_unitaire || 0).toFixed(2)} </td>
                <td style="border:1px solid #ddd; padding:5px; text-align:right;">${Number(p.BonLivraisonProduit?.total_ligne || 0).toFixed(2)} </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div style="text-align:right; margin-top:20px;">
          <p><strong>Total à payer :</strong> ${montantTTC.toFixed(2)} DH</p>
          <p style="font-size:10px; font-style:italic;">
           <strong>${pdfTotalText}</strong>
          </p>
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

      pdf.save(`Bon-Livraison-${numBL}.pdf`);
      topTost("PDF généré et téléchargé !", "success");
    } catch (err) {
      console.error("PDF generation error:", err);
      topTost("Erreur lors de la création du PDF", "error");
    }
  };

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button
            color="light"
            onClick={() => navigate("/bon-livraison/create")}
          >
            <FiArrowLeft className="me-2" /> Retour
          </Button>
          <h3 className="mt-3 mb-1">
            Bon de Livraison #{numBL}
            <Badge color={getStatusColor(bon.status)} className="ms-3">
              {statusOptions.find((o) => o.value === bon.status)?.label ||
                bon.status}
            </Badge>
          </h3>
        </div>

        <div className="d-flex gap-2 flex-wrap">
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
                <strong>Nom :</strong> {clientName}
              </p>
              <p>
                <strong>Téléphone :</strong> {clientPhone}
              </p>
              <p>
                <strong>Adresse :</strong> {clientAddress}
              </p>
              <p>
                <strong>Ville :</strong> {clientVille}
              </p>
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiCalendar className="me-2" /> Bon de livraison
            </h5>
            <div className="mt-2">
              <p>
                <strong>Créé le :</strong> {formatDate(issueDate)}{" "}
              </p>
              <p>
                <strong>Date livraison :</strong>{" "}
                {formatDateOnly(bon.date_livraison)}
              </p>
              <p>
                <strong>Mode règlement :</strong> {bon.mode_reglement || "—"}
              </p>
              {bon.notes && (
                <p>
                  <strong>Notes :</strong> {bon.notes}
                </p>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Products Table */}
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
                <th>Total </th>
              </tr>
            </thead>
            <tbody>
              {produits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    Aucun produit
                  </td>
                </tr>
              ) : (
                produits.map((prod) => (
                  <tr key={prod.id}>
                    <td>{prod.reference || "—"}</td>
                    <td>{prod.designation || "—"}</td>
                    <td className="text-center">
                      {prod.BonLivraisonProduit?.quantite || 0}
                    </td>
                    <td className="text-end">
                      {Number(
                        prod.BonLivraisonProduit?.prix_unitaire || 0,
                      ).toFixed(2)}{" "}
                    </td>
                    <td className="text-end">
                      {Number(
                        prod.BonLivraisonProduit?.total_ligne || 0,
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
                <span>Total a Payer</span>
                <strong>{montantHT.toFixed(2)} </strong>
              </div>
              <div className="mt-3 small fst-italic">
                <strong>{totalToFrenchText(montantTTC)}</strong>
              </div>
            </div>
          </Col>

          <Col md={6}>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-2">
                <span> Paiement (التسبيقات)</span>
                <strong className="text-success">
                  {totalAcomptes.toFixed(2)}
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

export default BonLivraisonDetailsPage;
