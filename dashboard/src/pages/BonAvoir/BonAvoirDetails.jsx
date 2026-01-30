import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  FiFileText,
  FiExternalLink,
} from "react-icons/fi";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "utilisé", label: "Utilisé" },
  { value: "annulé", label: "Annulé" },
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

const BonAvoirDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bon, setBon] = useState(null);

  useEffect(() => {
    if (id) fetchBonDetails();
  }, [id]);

  const fetchBonDetails = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.get(`${config_url}/api/bon-avoirs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data.bon || res.data;
      setBon(data);
    } catch (err) {
      console.error(err);
      topTost("Erreur chargement bon d'avoir", "error");
      navigate("/bon-avoirs");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner color="primary" />
        <div className="mt-3">Chargement du bon d'avoir...</div>
      </Container>
    );
  }

  if (!bon) {
    return (
      <Container className="py-5">
        <Alert color="danger">Bon d'avoir introuvable</Alert>
        <Button color="primary" onClick={() => navigate("/bon-avoir/create")}>
          <FiArrowLeft className="me-2" /> Retour
        </Button>
      </Container>
    );
  }

  // ─── Data normalization ───────────────────────────────
  const numBAV = bon.num_bon_avoir || "—";
  const clientName = bon.client?.nom_complete || "—";
  const clientPhone = bon.client?.telephone || "—";
  const clientAddress = bon.client?.address || "—";
  const clientVille = bon.client?.ville || "";

  const numBL = bon.bonLivraison?.num_bon_livraison || "—";
  const montantBL = parseFloat(bon.bonLivraison?.montant_ttc || 0);
  const montantAvoir = parseFloat(bon.montant_total || 0);
  const pourcentageBL = montantBL > 0 ? (montantAvoir / montantBL) * 100 : 0;

  const produits = Array.isArray(bon.produits) ? bon.produits : [];

  const formatDateTimeLocal = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDateOnly = (iso) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR") : "Non utilisé";

  const getStatusColor = (s) => {
    switch (s) {
      case "brouillon":
        return "warning";
      case "utilisé":
        return "success";
      case "annulé":
        return "danger";
      default:
        return "secondary";
    }
  };

  // ─── Print (window) ───────────────────────────────────
  const handlePrint = () => {
    const win = window.open("", "_blank");
    const txt = totalToFrenchText(montantAvoir);

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BAV ${numBAV}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 25px; font-size: 12px; }
          .header { text-align:center; border-bottom:2px solid #000; padding-bottom:12px; }
          table { width:100%; border-collapse:collapse; margin:20px 0; }
          th,td { border:1px solid #ccc; padding:8px; }
          th { background:#f8f8f8; }
          .right { text-align:right; }
          .italic { font-style:italic; font-size:11px; }
          .company-info { margin-bottom:20px; }
          .title { font-size:20px; font-weight:bold; margin:10px 0; color:#d32f2f; }
          .info-box { background:#f8f8f8; padding:10px; margin:10px 0; border-radius:5px; }
        </style>
      </head>
      <body>
        <div class="header">
                  <div class="title">Bon d'Avoir</div>

          <div class="company-info">
            <h2>ALUMINIUM OULAD BRAHIM</h2>
            <p>Tél: +212 661-431237</p>
          </div>
        </div>

        <div class="info-box">
          <div style="display:flex;justify-content:space-between;">
            <div>
              <strong>Client :</strong> ${clientName}<br/>
              Tél : ${clientPhone}<br/>
            </div>
            <div class="right">
              <strong>N° Avoir :</strong> ${numBAV}<br/>
              <strong>Date création :</strong> ${formatDateTimeLocal(bon.date_creation)}<br/>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin:15px 0;">
          <div>
            <strong>Bon de livraison associé :</strong> ${numBL}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Désignation</th>
              <th>Qté retournée</th>
              <th>Prix unitaire</th>
              <th>Total </th>
            </tr>
          </thead>
          <tbody>
            ${produits
              .map(
                (p) => `
              <tr>
                <td>${p.reference || "—"}</td>
                <td>${p.designation || "—"}</td>
                <td>${p.BonAvoirProduit?.quantite || 0}</td>
                <td>${Number(p.BonAvoirProduit?.prix_unitaire || 0).toFixed(2)}</td>
                <td>${Number(p.BonAvoirProduit?.total_ligne || 0).toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div style="display:flex; justify-content:space-between; margin:20px 0;">
          <div style="width:45%;">
          </div>
          <div style="width:45%; text-align:right;">
            <p><strong>Montant de l'avoir :</strong> ${montantAvoir.toFixed(2)} </p>
            <p class="italic"> <strong>${txt}</strong></p>
          </div>
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
      const pdfTotalText = totalToFrenchText(montantAvoir);

      container.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #d32f2f; padding-bottom:10px; margin-bottom:15px;">
          <h1 style="margin:0; color:#d32f2f;">Bon d'Avoir</h1>
          <h3 style="margin:5px 0;">ALUMINIUM OULAD BRAHIM</h3>
          <p style="font-size:10px;">Tél: +212 661-431237</p>
        </div>

        <div style="background-color:#f8f8f8; padding:15px; border-radius:5px; margin-bottom:15px;">
          <div style="display:flex; justify-content:space-between;">
            <div>
              <h4 style="margin-bottom:5px; color:#333;">Client</h4>
              <p><strong>Nom:</strong> ${clientName}</p>
              <p><strong>Tél:</strong> ${clientPhone}</p>
            </div>
            <div style="text-align:right;">
              <h4 style="margin-bottom:5px; color:#333;">Bon d'Avoir</h4>
              <p><strong>N° Bon Achat:</strong> ${numBAV}</p>
              <p><strong>Date:</strong> ${issueDate.toLocaleDateString("fr-FR")}</p>
            </div>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
          <thead>
            <tr style="background-color:#d32f2f; color:#fff;">
              <th style="padding:6px; border:1px solid #d32f2f;">Code</th>
              <th style="padding:6px; border:1px solid #d32f2f;">Désignation</th>
              <th style="padding:6px; border:1px solid #d32f2f;">Qté retour</th>
              <th style="padding:6px; border:1px solid #d32f2f;">Prix unitaire</th>
              <th style="padding:6px; border:1px solid #d32f2f;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${produits
              .map(
                (p, i) => `
              <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
                <td style="border:1px solid #ddd; padding:5px;">${p.reference || "—"}</td>
                <td style="border:1px solid #ddd; padding:5px;">${p.designation || "—"}</td>
                <td style="border:1px solid #ddd; padding:5px; text-align:center;">${p.BonAvoirProduit?.quantite || 0}</td>
                <td style="border:1px solid #ddd; padding:5px; text-align:right;">${Number(p.BonAvoirProduit?.prix_unitaire || 0).toFixed(2)} </td>
                <td style="border:1px solid #ddd; padding:5px; text-align:right;">${Number(p.BonAvoirProduit?.total_ligne || 0).toFixed(2)} </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div style="display:flex; justify-content:space-between; margin-top:20px;">
          <div style="width:45%;">
            <div style="background-color:#f0f0f0; padding:10px; border-radius:5px;">
              <strong style="color:#d32f2f;">Informations BL associé</strong>
              <p style="margin:5px 0;"><strong>N° BL:</strong> ${numBL}</p>
              <p style="margin:5px 0;"><strong>Montant BL:</strong> ${montantBL.toFixed(2)} </p>
              <p style="margin:5px 0;"><strong>% du BL:</strong> ${pourcentageBL.toFixed(1)}%</p>
            </div>
          </div>
          <div style="width:45%; text-align:right;">
            <h4 style="color:#d32f2f;">Montant de l'avoir</h4>
            <p style="font-size:14px; font-weight:bold;">${montantAvoir.toFixed(2)} </p>
            <p style="font-size:9px; font-style:italic; margin-top:5px;">
              <br/>
              <strong>${pdfTotalText}</strong>
            </p>
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

      pdf.save(`Bon-Avoir-${numBAV}.pdf`);
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
          <Button color="light" onClick={() => navigate("/bon-avoir/create")}>
            <FiArrowLeft className="me-2" /> Retour
          </Button>
          <h3 className="mt-3 mb-1">
            Bon d'Avoir #{numBAV}
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
              <FiCalendar className="me-2" /> Détails de l'avoir
            </h5>
            <div className="mt-2">
              <p>
                <strong>Créé le :</strong>{" "}
                {formatDateTimeLocal(bon.date_creation)}
              </p>
              <p>
                <strong>Utilisé le :</strong> {formatDateOnly(bon.utilise_le)}
              </p>
              <p>
                <strong>Statut :</strong>{" "}
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

      {/* Bon de Livraison associé */}
      <Card className="p-3 mb-4">
        <h5>
          <FiFileText className="me-2" /> Bon de Livraison associé
        </h5>
        <div className="mt-2">
          <Row>
            <Col md={6}>
              <p>
                <strong>N° BL :</strong> {numBL}
              </p>
              <p>
                <strong>Montant BL :</strong> {montantBL.toFixed(2)}
              </p>
            </Col>
            <Col md={6}>
              <p>
                <strong>Montant Avoir :</strong> {montantAvoir.toFixed(2)}
              </p>
              <p>
                <strong>% du BL :</strong> {pourcentageBL.toFixed(1)}%
              </p>
            </Col>
          </Row>
          {bon.bon_livraison_id && (
            <div className="mt-3">
              <Link
                to={`/bon-livraisons/${bon.bon_livraison_id}`}
                className="btn btn-sm btn-outline-primary"
              >
                <FiExternalLink className="me-1" /> Voir le bon de livraison
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Products Table */}
      <Card className="p-3 mb-4">
        <h5>
          <FiShoppingCart className="me-2" /> Produits retournés
        </h5>
        <div className="table-responsive mt-3">
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th>Code</th>
                <th>Désignation</th>
                <th>Qté retour</th>
                <th>Stock actuel</th>
                <th>Prix unitaire</th>
                <th>Total </th>
              </tr>
            </thead>
            <tbody>
              {produits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    Aucun produit retourné
                  </td>
                </tr>
              ) : (
                produits.map((prod) => (
                  <tr key={prod.id}>
                    <td>{prod.reference || "—"}</td>
                    <td>{prod.designation || "—"}</td>
                    <td className="text-center">
                      {prod.BonAvoirProduit?.quantite || 0}
                    </td>
                    <td className="text-center">{prod.qty || 0}</td>
                    <td className="text-end">
                      {Number(prod.BonAvoirProduit?.prix_unitaire || 0).toFixed(
                        2,
                      )}{" "}
                    </td>
                    <td className="text-end">
                      {Number(prod.BonAvoirProduit?.total_ligne || 0).toFixed(
                        2,
                      )}{" "}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {produits.length > 0 && (
              <tfoot className="table-light">
                <tr>
                  <td colSpan={5} className="text-end fw-bold">
                    Total
                  </td>
                  <td className="text-end fw-bold text-danger">
                    {montantAvoir.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-3">
        <h5>Résumé de l'avoir</h5>
        <Row className="mt-3">
          <Col md={6}>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-2">
                <span>Montant total de l'avoir</span>
                <strong className="text-danger">
                  {montantAvoir.toFixed(2)}{" "}
                </strong>
              </div>
              <div className="mt-3 small fst-italic">
                Arrêté à la somme de :<br />
                <strong>{totalToFrenchText(montantAvoir)}</strong>
              </div>
            </div>
          </Col>

          <Col md={6}>
            <div className="p-3 bg-light rounded">
              <div className="mb-3">
                <strong>Relation avec le BL</strong>
                <div className="mt-2">
                  <div className="d-flex justify-content-between">
                    <span>Montant BL</span>
                    <span>{montantBL.toFixed(2)} </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Montant Avoir</span>
                    <span>{montantAvoir.toFixed(2)} </span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold">
                    <span>% du BL</span>
                    <span>{pourcentageBL.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div className="progress mt-2">
                <div
                  className="progress-bar bg-warning"
                  style={{ width: `${Math.min(pourcentageBL, 100)}%` }}
                >
                  {pourcentageBL.toFixed(1)}%
                </div>
              </div>
              <small className="text-muted d-flex justify-content-between mt-1">
                <span>0%</span>
                <span>100%</span>
              </small>
            </div>
          </Col>
        </Row>
      </Card>
    </Container>
  );
};

export default BonAvoirDetailsPage;
