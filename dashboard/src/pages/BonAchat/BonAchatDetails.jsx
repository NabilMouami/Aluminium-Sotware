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
  FiTruck,
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

// Fonction pour convertir le total en texte français
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

const BonAchatDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bon, setBon] = useState(null);
  const [formData, setFormData] = useState({
    status: "brouillon",
    notes: "",
  });

  useEffect(() => {
    if (id) fetchBonDetails();
  }, [id]);

  const fetchBonDetails = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.get(`${config_url}/api/bon-achats/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data.bon || res.data;
      setBon(data);

      setFormData({
        status: data.status || "brouillon",
        notes: data.notes || "",
      });
    } catch (err) {
      console.error(err);
      topTost("Erreur chargement bon d'achat", "error");
      navigate("/bon-achats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner color="primary" />
        <div className="mt-3">Chargement du bon d'achat...</div>
      </Container>
    );
  }

  if (!bon) {
    return (
      <Container className="py-5">
        <Alert color="danger">Bon d'achat introuvable</Alert>
        <Button color="primary" onClick={() => navigate("/bon-achat/create")}>
          <FiArrowLeft className="me-2" /> Retour
        </Button>
      </Container>
    );
  }

  // ─── Data normalization ───────────────────────────────
  const numBA = bon.num_bon_achat || "—";
  const fornisseurName = bon.fornisseur?.nom_complete || "—";
  const fornisseurPhone = bon.fornisseur?.telephone || "—";
  const fornisseurAddress = bon.fornisseur?.address || "—";
  const fornisseurVille = bon.fornisseur?.ville || "";

  const montantHT = parseFloat(bon.montant_ht || 0);
  const montantTTC = parseFloat(bon.montant_ttc || 0);
  const totalQuantite = parseInt(bon.totalQuantite || 0);
  const montantRestant = parseFloat(bon.montantRestant || 0);

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

  // ─── Print (window) ───────────────────────────────────
  const handlePrint = () => {
    const win = window.open("", "_blank");
    const txt = totalToFrenchText(montantTTC);

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BA ${numBA}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 25px; font-size: 12px; }
          .header { text-align:center; border-bottom:2px solid #000; padding-bottom:12px; }
          table { width:100%; border-collapse:collapse; margin:20px 0; }
          th,td { border:1px solid #ccc; padding:8px; }
          th { background:#f8f8f8; }
          .right { text-align:right; }
          .italic { font-style:italic; font-size:11px; }
          .company-info { margin-bottom:20px; }
          .title { font-size:20px; font-weight:bold; margin:10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Bon d'Achat</div>
                    <div class="company-info">
            <h2>ALUMINIUM OULAD BRAHIM</h2>
            <p>Tél: +212 671953725</p>
          </div>

        </div>

        <div style="display:flex;justify-content:space-between;margin:20px 0;">
          <div>
            <strong>Fournisseur :</strong> ${fornisseurName}<br/>
          </div>
          <div class="right">
            <strong>N° Bon Achat :</strong> ${numBA}<br/>
            <strong>Date création :</strong> ${formatDateTimeLocal(bon.date_creation)}<br/>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Désignation</th>
              <th>Qté</th>
              <th>Prix Achat</th>
              <th>Prix Vente</th>
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
                <td class="right">${p.BonAchatProduit?.quantite || 0}</td>
                <td class="right">${Number(p.BonAchatProduit?.prix_unitaire || 0).toFixed(2)}</td>
                <td class="right">${Number(p.prix_vente || 0).toFixed(2)}</td>
                <td class="right">${Number(p.BonAchatProduit?.total_ligne || 0).toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="right">
          <p><strong>Total a Payer :</strong> ${montantHT.toFixed(2)} </p>
          <p class="italic"> <strong>${txt}</strong></p>
          <p><strong>Quantité totale :</strong> ${totalQuantite}</p>
        </div>

   
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  // ─── Generate & Download PDF ────────────────
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

      const issueDate = bon.date_creation
        ? new Date(bon.date_creation)
        : new Date();
      const pdfTotalText = totalToFrenchText(montantTTC);

      container.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
          <h1 style="margin:0; color:#2c5aa0;">Bon d'Achat</h1>
          <h3 style="margin:5px 0;">ALUMINIUM OULAD BRAHIM</h3>
          <p style="font-size:10px;">Tél: +212 671953725</p>
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
          <div>
            <h4 style="margin-bottom:5px;">Fournisseur</h4>
            <p><strong>Nom:</strong> ${fornisseurName}</p>
            <p><strong>Tél:</strong> ${fornisseurPhone}</p>
            <p><strong>Adresse:</strong> ${fornisseurAddress}</p>
            <p><strong>Ville:</strong> ${fornisseurVille}</p>
          </div>
          <div style="text-align:right;">
            <h4 style="margin-bottom:5px;">Bon d'Achat</h4>
            <p><strong>N°:</strong> ${numBA}</p>
            <p><strong>Date:</strong> ${issueDate.toLocaleDateString("fr-FR")}</p>
            <p><strong>Mode règlement:</strong> ${bon.mode_reglement || "—"}</p>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
          <thead>
            <tr style="background-color:#2c5aa0; color:#fff;">
              <th style="padding:6px; border:1px solid #2c5aa0;">Code</th>
              <th style="padding:6px; border:1px solid #2c5aa0;">Désignation</th>
              <th style="padding:6px; border:1px solid #2c5aa0;">Qté</th>
              <th style="padding:6px; border:1px solid #2c5aa0;">Prix Achat</th>
              <th style="padding:6px; border:1px solid #2c5aa0;">Prix Vente</th>
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
                <td style="border:1px solid #ddd; padding:5px; text-align:center;">${p.BonAchatProduit?.quantite || 0}</td>
                <td style="border:1px solid #ddd; padding:5px; text-align:right;">${Number(p.BonAchatProduit?.prix_unitaire || 0).toFixed(2)} </td>
                <td style="border:1px solid #ddd; padding:5px; text-align:right;">${Number(p.prix_vente || 0).toFixed(2)} </td>
                <td style="border:1px solid #ddd; padding:5px; text-align:right;">${Number(p.BonAchatProduit?.total_ligne || 0).toFixed(2)} </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div style="text-align:right; margin-top:20px;">
          <p><strong>Total a Payer :</strong> ${montantHT.toFixed(2)} </p>
          <p style="font-size:10px; font-style:italic;">
          <strong>${pdfTotalText}</strong>
          </p>
          ${
            montantRestant > 0
              ? `
            <p><strong>Montant payé :</strong> ${(montantTTC - montantRestant).toFixed(2)} </p>
          `
              : ""
          }
          <p><strong>Quantité totale :</strong> ${totalQuantite}</p>
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

      pdf.save(`Bon-Achat-${numBA}.pdf`);
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
          <Button color="light" onClick={() => navigate("/bon-achat/create")}>
            <FiArrowLeft className="me-2" /> Retour
          </Button>
          <h3 className="mt-3 mb-1">
            Bon d'Achat #{numBA}
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
              <FiTruck className="me-2" /> Fournisseur
            </h5>
            <div className="mt-2">
              <p>
                <strong>Nom :</strong> {fornisseurName}
              </p>
              <p>
                <strong>Téléphone :</strong> {fornisseurPhone}
              </p>
              <p>
                <strong>Adresse :</strong> {fornisseurAddress}
              </p>
              <p>
                <strong>Ville :</strong> {fornisseurVille}
              </p>
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiCalendar className="me-2" /> Détails du bon
            </h5>
            <div className="mt-2">
              <p>
                <strong>Créé le :</strong>{" "}
                {formatDateTimeLocal(bon.date_creation)}
              </p>
              <p>
                <strong>Mode règlement :</strong> {bon.mode_reglement || "—"}
              </p>
              <p>
                <strong>Status :</strong>{" "}
                <Badge color={getStatusColor(bon.status)} className="ms-2">
                  {statusOptions.find((o) => o.value === bon.status)?.label ||
                    bon.status}
                </Badge>
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
                <th>Stock</th>
                <th>Prix Achat</th>
                <th>Prix Vente</th>
                <th>Total </th>
              </tr>
            </thead>
            <tbody>
              {produits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Aucun produit
                  </td>
                </tr>
              ) : (
                produits.map((prod) => (
                  <tr key={prod.id}>
                    <td>{prod.reference || "—"}</td>
                    <td>{prod.designation || "—"}</td>
                    <td className="text-center">
                      {prod.BonAchatProduit?.quantite || 0}
                    </td>
                    <td className="text-center">{prod.qty || 0}</td>
                    <td className="text-end">
                      {Number(prod.BonAchatProduit?.prix_unitaire || 0).toFixed(
                        2,
                      )}{" "}
                    </td>
                    <td className="text-end">
                      {Number(prod.prix_vente || 0).toFixed(2)}{" "}
                    </td>
                    <td className="text-end">
                      {Number(prod.BonAchatProduit?.total_ligne || 0).toFixed(
                        2,
                      )}{" "}
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
          <div className="p-3 bg-light rounded">
            <div className="d-flex justify-content-between mb-2">
              <span>Quantité totale</span>
              <strong>{totalQuantite}</strong>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Total a Payer</span>
              <strong>{montantHT.toFixed(2)} </strong>
            </div>
          </div>
        </Row>
      </Card>
    </Container>
  );
};

export default BonAchatDetailsPage;
