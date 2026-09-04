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
  Input,
} from "reactstrap";
import {
  FiPrinter,
  FiDownload,
  FiUser,
  FiCalendar,
  FiArrowLeft,
  FiShoppingCart,
  FiPlus,
  FiTrash2,
  FiSave,
} from "react-icons/fi";
import Select from "react-select";
import AsyncSelect from "react-select/async";
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

  // Product management state
  const [lineItems, setLineItems] = useState([]);
  const [allProduits, setAllProduits] = useState([]);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [isEditProductsMode, setIsEditProductsMode] = useState(false);

  useEffect(() => {
    if (id) fetchBonDetails();
  }, [id]);

  // Fetch products when opening product edit mode
  useEffect(() => {
    if (isEditProductsMode) {
      fetchAllProduits();
    }
  }, [isEditProductsMode]);

  const fetchAllProduits = async () => {
    try {
      setLoadingProduits(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/produits`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const options = (response.data?.produits || []).map((produit) => ({
        value: produit.id,
        label: `${produit.reference} - ${produit.designation}`,
        data: {
          ...produit,
          displayText: `${produit.reference} - ${produit.designation} (Stock: ${produit.qty}, Prix: ${produit.prix_vente} DH)`,
        },
      }));

      setAllProduits(options);
    } catch (error) {
      console.error("Error loading produits:", error);
    } finally {
      setLoadingProduits(false);
    }
  };

  const loadProduits = async (inputValue) => {
    if (!inputValue) {
      return allProduits;
    }

    const filtered = allProduits.filter((option) => {
      const searchTerm = inputValue.toLowerCase();
      const produit = option.data;
      return (
        produit.reference?.toLowerCase().includes(searchTerm) ||
        produit.designation?.toLowerCase().includes(searchTerm) ||
        produit.categorie?.toLowerCase().includes(searchTerm)
      );
    });

    if (filtered.length === 0 && inputValue.length >= 2) {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(
          `${config_url}/api/produits/search?q=${inputValue}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const options = (response.data.produits || []).map((produit) => ({
          value: produit.id,
          label: `${produit.reference} - ${produit.designation}`,
          data: {
            ...produit,
            displayText: `${produit.reference} - ${produit.designation} (Stock: ${produit.qty}, Prix: ${produit.prix_vente} DH)`,
          },
        }));

        return options;
      } catch (error) {
        console.error("Error searching produits:", error);
        return [];
      }
    }

    return filtered;
  };

  // Calculate line item total
  const calculateLineTotal = (quantite, prix_unitaire) => {
    return (parseFloat(quantite) || 0) * (parseFloat(prix_unitaire) || 0);
  };

  // Add new product line
  const handleAddProduct = (selectedOption) => {
    if (!selectedOption) return;

    const produit = selectedOption.data;

    if (lineItems.some((item) => item.produit_id === produit.id)) {
      topTost("Ce produit existe déjà dans le bon de livraison", "warning");
      return;
    }

    const newItem = {
      id: Date.now(),
      produit_id: produit.id,
      reference: produit.reference,
      designation: produit.designation,
      quantite: 1,
      prix_unitaire: parseFloat(produit.prix_vente) || 0,
      total_ligne: parseFloat(produit.prix_vente) || 0,
    };

    setLineItems([...lineItems, newItem]);
  };

  // Remove product line
  const handleRemoveProduct = (index) => {
    const updatedItems = [...lineItems];
    updatedItems.splice(index, 1);
    setLineItems(updatedItems);
  };

  // Update line item field
  const handleLineItemChange = (index, field, value) => {
    const updatedItems = [...lineItems];
    updatedItems[index][field] = value;

    if (field === "quantite" || field === "prix_unitaire") {
      updatedItems[index].total_ligne = calculateLineTotal(
        updatedItems[index].quantite,
        updatedItems[index].prix_unitaire,
      );
    }

    setLineItems(updatedItems);
  };

  // Calculate totals
  const calculateTotals = () => {
    const montant_ht = lineItems.reduce(
      (sum, item) => sum + (item.total_ligne || 0),
      0,
    );
    const montant_ttc = montant_ht;
    return {
      montant_ht: montant_ht.toFixed(2),
      montant_ttc: montant_ttc.toFixed(2),
    };
  };

  const totals = calculateTotals();

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

      // Initialize line items from existing products
      const existingProducts = (data.produits || []).map((prod) => ({
        id: prod.id,
        produit_id: prod.id,
        reference: prod.reference,
        designation: prod.designation,
        quantite: parseFloat(prod.BonLivraisonProduit?.quantite || 0),
        prix_unitaire: parseFloat(prod.BonLivraisonProduit?.prix_unitaire || 0),
        total_ligne: parseFloat(prod.BonLivraisonProduit?.total_ligne || 0),
      }));
      setLineItems(existingProducts);
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

  const formatDateWithTime = (dateInput) => {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const issueDate = parseDateSafely(bon.date_creation) || new Date();
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const creationDateFormatted = formatDateWithTime(bon.date_creation);
    const totalText = totalToFrenchText(montantTTC);

    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>BON DE LIVRAISON ${numBL}</title>
  <meta charset="UTF-8" />

  <style>
    @page {
      size: A4;
       margin-left: 10mm;
      margin-right: 10mm; 
    }

    * { box-sizing: border-box; text-transform: uppercase; }
@media print {
  body { margin: 15mm; }
  .no-print { display: none; }
}
    body {
      font-family: Arial, sans-serif;
      font-size: 0.6rem;
      color: #000;
      margin: 0;
      padding: 5mm;
    }

    h2 { font-size: 0.9rem; margin: 0; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }

    th, td {
      border: 1.5px solid #000;
      padding: 5px;
    }

    th {
      background: #f2f2f2;
      text-align: center;
    }

    td { font-size: 0.8rem; }

    .net-box {
      display: flex;
      justify-content: flex-end;
      gap: 20px;
      font-weight: bold;
      font-size: 20px;
      margin-top: 20px;
    }

    .net-label, .net-amount {
      border: 2px solid #000;
      font-size: 20px;

      padding: 10px 16px;
    }

    .italic {
      margin-top: 10px;
      font-style: italic;
      font-weight: bold;
      font-size: 0.7rem;
      text-align: right;
    }
  </style>
</head>

<body>

  <div style="display:flex;justify-content:space-between;align-items:center;">
    <h2>Bon de Livraison</h2>
    <div>ALUMINIUM OULAD BRAHIM – Tél: +212 671953725</div>
  </div>

  <div style="display:flex;justify-content:space-between;margin:20px 0;">
    <div>
      <strong>Nom Client :</strong><br/>
      ${clientName}
    </div>
    <div style="text-align:right;">
      <strong>N° Bon :</strong> ${numBL}<br/>
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
      ${produits
        .map(
          (p) => `
        <tr>
          <td>${p.reference || "—"}</td>
          <td>${p.designation || "—"}</td>
          <td style="text-align:center;">${p.BonLivraisonProduit?.quantite || 0}</td>
          <td style="text-align:right;">${formatAmount(p.BonLivraisonProduit?.prix_unitaire)}</td>
          <td style="text-align:center;font-weight: bold;">${formatAmount(p.BonLivraisonProduit?.total_ligne)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="net-box">
    <span class="net-label">Net à payer</span>
    <span class="net-amount">${formatAmount(montantTTC)} DH</span>
  </div>

  <div class="italic">${totalText}</div>

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
      container.style.padding = "10mm";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "0.6rem";
      container.style.textTransform = "uppercase";
      container.style.position = "absolute";
      container.style.left = "-9999px";

      const creationDateFormatted = formatDateWithTime(bon.date_creation);
      const totalText = totalToFrenchText(montantTTC);

      container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
        <h2 style="font-size:0.9rem;margin:0;">Bon de Livraison</h2>
        <div>ALUMINIUM OULAD BRAHIM – Tél: +212 671953725</div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
        <div><strong>Nom Client :</strong><br/>${clientName}</div>
        <div style="text-align:right;">
          <strong>N° Bon :</strong> ${numBL}<br/>
          <strong>Date création :</strong> ${creationDateFormatted}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            ${["Code", "Désignation", "Qté", "Prix U", "Montant"]
              .map(
                (h) => `
              <th style="border:1.5px solid #000;padding:5px;background:#f2f2f2;">
                ${h}
              </th>
            `,
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${produits
            .map(
              (p) => `
            <tr>
              <td style="border:1.5px solid #000;padding:5px;">${p.reference || "—"}</td>
              <td style="border:1.5px solid #000;padding:5px;">${p.designation || "—"}</td>
              <td style="border:1.5px solid #000;padding:5px;text-align:center;">
                ${p.BonLivraisonProduit?.quantite || 0}
              </td>
              <td style="border:1.5px solid #000;padding:5px;text-align:right;">
                ${formatAmount(p.BonLivraisonProduit?.prix_unitaire)}
              </td>
              <td style="border:1.5px solid #000;padding:5px;text-align:right;">
                ${formatAmount(p.BonLivraisonProduit?.total_ligne)}
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="margin-top:20px;text-align:right;">
        <div style="display:inline-flex;gap:15px;font-weight:bold;">
          <span style="border:2px solid #000;padding:8px 14px;">Net à payer</span>
          <span style="border:2px solid #000;padding:8px 14px;">
            ${formatAmount(montantTTC)} DH
          </span>
        </div>
        <div style="margin-top:10px;font-style:italic;font-weight:bold;font-size:0.7rem;">
          ${totalText}
        </div>
      </div>
    `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#fff",
      });
      document.body.removeChild(container);

      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        imgWidth,
        imgHeight,
      );
      pdf.save(`Bon-Livraison-${numBL}.pdf`);

      topTost("PDF généré et téléchargé !", "success");
    } catch (err) {
      console.error(err);
      topTost("Erreur lors de la création du PDF", "error");
    }
  };

  const handleSave = async () => {
    try {
      // Validate products if in product edit mode
      if (isEditProductsMode) {
        if (lineItems.length === 0) {
          topTost("Veuillez ajouter au moins un produit", "warning");
          return;
        }

        for (const item of lineItems) {
          if (!item.quantite || item.quantite <= 0) {
            topTost(
              `La quantité doit être positive pour ${item.designation}`,
              "warning",
            );
            return;
          }
          if (!item.prix_unitaire || item.prix_unitaire < 0) {
            topTost(
              `Le prix doit être positif pour ${item.designation}`,
              "warning",
            );
            return;
          }
        }
      }

      const updateData = {};

      // Add products if in product edit mode
      if (isEditProductsMode && lineItems.length > 0) {
        updateData.produits = lineItems.map((item) => ({
          produitId: item.produit_id,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
        }));
      }

      if (Object.keys(updateData).length === 0) {
        topTost("Aucune modification à enregistrer", "info");
        return;
      }

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.put(
        `${config_url}/api/bon-livraisons/${id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.bon) {
        setBon(response.data.bon);
        // Re-initialize line items with updated data
        const existingProducts = (response.data.bon.produits || []).map(
          (prod) => ({
            id: prod.id,
            produit_id: prod.id,
            reference: prod.reference,
            designation: prod.designation,
            quantite: parseFloat(prod.BonLivraisonProduit?.quantite || 0),
            prix_unitaire: parseFloat(
              prod.BonLivraisonProduit?.prix_unitaire || 0,
            ),
            total_ligne: parseFloat(prod.BonLivraisonProduit?.total_ligne || 0),
          }),
        );
        setLineItems(existingProducts);
      }

      setIsEditProductsMode(false);
      topTost("Bon de livraison mis à jour avec succès!", "success");
    } catch (error) {
      console.error("Error saving bon:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la mise à jour du bon de livraison";
      topTost(errorMessage, "error");
    }
  };

  const handleCancelEdit = () => {
    // Reset line items to original products
    const existingProducts = (bon?.produits || []).map((prod) => ({
      id: prod.id,
      produit_id: prod.id,
      reference: prod.reference,
      designation: prod.designation,
      quantite: parseFloat(prod.BonLivraisonProduit?.quantite || 0),
      prix_unitaire: parseFloat(prod.BonLivraisonProduit?.prix_unitaire || 0),
      total_ligne: parseFloat(prod.BonLivraisonProduit?.total_ligne || 0),
    }));
    setLineItems(existingProducts);
    setIsEditProductsMode(false);
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
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>
            <FiShoppingCart className="me-2" /> Produits
          </h5>
          {!isEditProductsMode && (
            <Button
              color="primary"
              size="sm"
              onClick={() => setIsEditProductsMode(true)}
            >
              <FiPlus className="me-1" />
              Modifier les produits
            </Button>
          )}
        </div>

        {isEditProductsMode ? (
          <div className="border rounded p-3 bg-light">
            {/* Product Selector */}
            <div className="mb-3">
              <label className="form-label">Ajouter un produit</label>
              <AsyncSelect
                cacheOptions
                loadOptions={loadProduits}
                defaultOptions={allProduits}
                onChange={handleAddProduct}
                placeholder="Rechercher un produit..."
                isLoading={loadingProduits}
                isClearable
                formatOptionLabel={(option) => (
                  <div>
                    <div>{option.label}</div>
                    {option.data.displayText && (
                      <small className="text-muted">
                        {option.data.displayText}
                      </small>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Line Items Table */}
            {lineItems.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Désignation</th>
                      <th style={{ width: "100px" }}>Quantité</th>
                      <th style={{ width: "120px" }}>Prix Unitaire</th>
                      <th style={{ width: "120px" }}>Total Ligne</th>
                      <th style={{ width: "50px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={item.id || index}>
                        <td>{item.reference || "—"}</td>
                        <td>{item.designation || "Produit"}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.quantite}
                            onChange={(e) =>
                              handleLineItemChange(
                                index,
                                "quantite",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.prix_unitaire}
                            onChange={(e) =>
                              handleLineItemChange(
                                index,
                                "prix_unitaire",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="text-end">
                          {item.total_ligne?.toFixed(2) || "0.00"}
                        </td>
                        <td>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => handleRemoveProduct(index)}
                            className="p-1"
                          >
                            <FiTrash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-light">
                      <td colSpan="4" className="text-end fw-bold">
                        Total HT:
                      </td>
                      <td className="text-end fw-bold">
                        {totals.montant_ht} DH
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted py-3">
                Aucun produit ajouté.
              </div>
            )}

            <div className="d-flex justify-content-end mt-2 gap-2">
              <Button color="secondary" size="sm" onClick={handleCancelEdit}>
                Annuler
              </Button>
              <Button color="success" size="sm" onClick={handleSave}>
                <FiSave className="me-1" />
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
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
        )}
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
