import React, { useState, useEffect, useRef } from "react";
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
  FiFileText,
  FiUser,
  FiShoppingCart,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import Select from "react-select";
import AsyncSelect from "react-select/async";

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
  { value: "brouillon", label: "Non Payé" },
  { value: "envoyé", label: "Envoyé" },
  { value: "accepté", label: "Accepté" },
  { value: "refusé", label: "Refusé" },
  { value: "expiré", label: "Expiré" },
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
  onDevisUpdated,
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
  const [isCalculatingTotal, useIsCalculatingTotal] = useState(false);

  // Product management state
  const [lineItems, setLineItems] = useState([]);
  const [allProduits, setAllProduits] = useState([]);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Initialize form data and products when devis changes
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

      // Initialize line items from existing products
      const existingProducts = (devis.produits || []).map((prod) => ({
        id: prod.id,
        produit_id: prod.id,
        reference: prod.reference,
        designation: prod.designation,
        quantite: parseFloat(prod.DevisProduit?.quantite || 0),
        prix_unitaire: parseFloat(prod.DevisProduit?.prix_unitaire || 0),
        total_ligne: parseFloat(prod.DevisProduit?.total_ligne || 0),
        description: prod.DevisProduit?.description || "",
        unite: prod.DevisProduit?.unite || "unité",
      }));
      setLineItems(existingProducts);
    }
  }, [devis]);

  // Fetch products for selection
  useEffect(() => {
    if (isOpen) {
      fetchAllProduits();
    }
  }, [isOpen]);

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

    // Check if product already exists in line items
    if (lineItems.some((item) => item.produit_id === produit.id)) {
      topTost("Ce produit existe déjà dans le devis", "warning");
      return;
    }

    const newItem = {
      id: Date.now(), // Temporary ID for new items
      produit_id: produit.id,
      reference: produit.reference,
      designation: produit.designation,
      quantite: 1,
      prix_unitaire: parseFloat(produit.prix_vente) || 0,
      total_ligne: parseFloat(produit.prix_vente) || 0,
      description: "",
      unite: "unité",
    };

    setLineItems((prev) => [...prev, newItem]);
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

    // Recalculate total line
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
    const montant_ttc = montant_ht; // Devis doesn't have TVA by default

    return {
      montant_ht: montant_ht.toFixed(2),
      montant_ttc: montant_ttc.toFixed(2),
    };
  };

  const totals = calculateTotals();

  // Calculate total in French text
  useEffect(() => {
    const calculateTotalText = () => {
      if (devis) {
        const total = parseFloat(devis.montant_ttc) || 0;
        if (total > 0) {
          useIsCalculatingTotal(true);
          try {
            const text = totalToFrenchText(total);
            setTotalText(text);
          } catch (error) {
            console.error("Error converting total to French text:", error);
            setTotalText(`${total.toFixed(2)} dirhams`);
          } finally {
            useIsCalculatingTotal(false);
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
        return "danger";
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
      // Validate products if in edit mode
      if (isEditMode) {
        if (lineItems.length === 0) {
          topTost("Veuillez ajouter au moins un produit", "warning");
          setIsSubmitting(false);
          return;
        }

        // Validate quantities
        for (const item of lineItems) {
          if (!item.quantite || item.quantite <= 0) {
            topTost(
              `La quantité doit être positive pour ${item.designation}`,
              "warning",
            );
            setIsSubmitting(false);
            return;
          }
          if (!item.prix_unitaire || item.prix_unitaire < 0) {
            topTost(
              `Le prix doit être positif pour ${item.designation}`,
              "warning",
            );
            setIsSubmitting(false);
            return;
          }
        }
      }

      const updateData = {
        status: formData.status,
        notes: formData.notes,
        conditions_reglement: formData.conditions_reglement,
        objet: formData.objet,
        conditions_generales: formData.conditions_generales,
      };

      // Add products if in edit mode
      if (isEditMode && lineItems.length > 0) {
        updateData.produits = lineItems.map((item) => ({
          produit_id: item.produit_id,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          description: item.description || null,
          unite: item.unite || "unité",
        }));
      }

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

      if (onDevisUpdated && response.data?.devis) {
        onDevisUpdated(response.data.devis);
      } else if (onDevisUpdated) {
        onDevisUpdated({
          ...devis,
          ...updateData,
          updatedAt: new Date().toISOString(),
        });
      }
      topTost("Devis mis à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.devis || response.data);
      }

      setIsEditMode(false);
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

  const getStatusLabel = (status) => {
    return statusOptions.find((opt) => opt.value === status)?.label || status;
  };

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handlePrint = () => {
    if (!devis) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatDateWithTime = (dateStr) => {
      if (!dateStr) return "—";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const creationDateFormatted = formatDateWithTime(devis.date_creation);
    const totalText = totalToFrenchText(total);

    const content = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>DEVIS ${devis.num_devis}</title>

  <style>
    @page { size: A4; margin: 10mm; }

    * { box-sizing: border-box; text-transform: uppercase; }

    body {
      font-family: Arial, sans-serif;
      font-size: 0.6rem;
      margin: 0;
      padding: 5mm;
      color: #000;
      background: #fff;
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
        font-size: 20px;
      margin-top: 20px;
      font-weight: bold;
    }

    .net-label,
    .net-amount {
      border: 2px solid #000;
        font-size: 20px;
      padding: 10px 16px;
    }

    .italic {
      margin-top: 10px;
      text-align: right;
      font-style: italic;
      font-weight: bold;
      font-size: 0.7rem;
    }
  </style>
</head>

<body>

  <div style="display:flex;justify-content:space-between;align-items:center;">
    <h2>DEVIS</h2>
    <div>ALUMINIUM OULAD BRAHIM – Tél: +212 671953725</div>
  </div>

  <div style="display:flex;justify-content:space-between;margin:20px 0;">
    <div>
      <strong>Nom Client :</strong><br/>
      ${devis.client_name || devis.client?.nom_complete || "—"}
    </div>
    <div style="text-align:right;">
      <strong>N° Devis :</strong> ${devis.num_devis}<br/>
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
      ${(devis.produits || [])
        .map(
          (p) => `
        <tr>
          <td>${p.reference || "—"}</td>
          <td>${p.designation || "—"}</td>
          <td style="text-align:center;">
            ${Number(p.DevisProduit?.quantite || 0).toFixed(2)}
          </td>
          <td style="text-align:right;">
            ${Number(p.DevisProduit?.prix_unitaire || 0).toFixed(2)}
          </td>
          <td style="text-align:center;font-weight: bold">
            ${Number(p.DevisProduit?.total_ligne || 0).toFixed(2)}
          </td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="net-box">
    <span class="net-label">Net à payer</span>
    <span class="net-amount">${formatAmount(total)} DH</span>
  </div>

  <div class="italic">${totalText}</div>

  <script>
    window.onload = function () {
      window.print();
      setTimeout(() => window.close(), 150);
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

      Object.assign(container.style, {
        width: "210mm",
        padding: "10mm",
        fontFamily: "Arial, sans-serif",
        fontSize: "0.6rem",
        textTransform: "uppercase",
        background: "#fff",
        position: "absolute",
        left: "-9999px",
      });

      const formatDateWithTime = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      const creationDateFormatted = formatDateWithTime(devis.date_creation);
      const totalText = totalToFrenchText(total);

      container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
        <h2 style="font-size:0.9rem;margin:0;">DEVIS</h2>
        <div>ALUMINIUM OULAD BRAHIM – TÉL : +212 671953725</div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
        <div>
          <strong>Nom Client :</strong><br/>
          ${devis.client_name || devis.client?.nom_complete || "—"}
        </div>
        <div style="text-align:right;">
          <strong>N° Devis :</strong> ${devis.num_devis}<br/>
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
          ${(devis.produits || [])
            .map(
              (p) => `
            <tr>
              <td style="border:1.5px solid #000;padding:5px;">${p.reference || "—"}</td>
              <td style="border:1.5px solid #000;padding:5px;">${p.designation || "—"}</td>
              <td style="border:1.5px solid #000;padding:5px;text-align:center;">
                ${Number(p.DevisProduit?.quantite || 0).toFixed(2)}
              </td>
              <td style="border:1.5px solid #000;padding:5px;text-align:right;">
                ${Number(p.DevisProduit?.prix_unitaire || 0).toFixed(2)}
              </td>
              <td style="border:1.5px solid #000;padding:5px;text-align:right;">
                ${Number(p.DevisProduit?.total_ligne || 0).toFixed(2)}
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="margin-top:20px;text-align:right;">
        <div style="display:inline-flex;gap:15px;font-weight:bold;">
          <span style="border:2px solid #000;padding:8px 14px;">
            Net à payer
          </span>
          <span style="border:2px solid #000;padding:8px 14px;">
            ${formatAmount(total)} DH
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
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageWidth,
        imgHeight,
      );
      pdf.save(`Devis-${devis.num_devis}.pdf`);

      topTost("PDF généré avec succès", "success");
    } catch (err) {
      console.error(err);
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

  // Get date from bon
  const issueDate = devis.date_creation
    ? new Date(devis.date_creation)
    : new Date();

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
                  <strong>Date création:</strong> {formatDate(issueDate)}{" "}
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

              <div className="select-wrapper">
                <Select
                  value={statusOptions.find(
                    (opt) => opt.value === formData.status,
                  )}
                  onChange={(opt) => handleInputChange("status", opt.value)}
                  options={statusOptions}
                  styles={{
                    dropdownIndicator: (base, state) => ({
                      ...base,
                      transform: state.selectProps.menuIsOpen
                        ? "rotate(180deg)"
                        : null,
                      transition: "transform 0.25s ease",
                    }),
                  }}
                />
              </div>
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
              />
            </div>
          </div>

          {/* Products Section */}
          <div className="col-12 mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>
                <FiShoppingCart className="me-2" />
                Produits
              </h6>
              {!isEditMode && (
                <Button
                  color="primary"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                >
                  <FiPlus className="me-1" />
                  Modifier les produits
                </Button>
              )}
            </div>

            {isEditMode ? (
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
                    Aucun produit ajouté. Utilisez le sélecteur ci-dessus pour
                    ajouter des produits.
                  </div>
                )}

                <div className="d-flex justify-content-end mt-2">
                  <Button
                    color="secondary"
                    size="sm"
                    onClick={() => {
                      // Reset to original products
                      const existingProducts = (devis.produits || []).map(
                        (prod) => ({
                          id: prod.id,
                          produit_id: prod.id,
                          reference: prod.reference,
                          designation: prod.designation,
                          quantite: parseFloat(
                            prod.DevisProduit?.quantite || 0,
                          ),
                          prix_unitaire: parseFloat(
                            prod.DevisProduit?.prix_unitaire || 0,
                          ),
                          total_ligne: parseFloat(
                            prod.DevisProduit?.total_ligne || 0,
                          ),
                          description: prod.DevisProduit?.description || "",
                          unite: prod.DevisProduit?.unite || "unité",
                        }),
                      );
                      setLineItems(existingProducts);
                      setIsEditMode(false);
                    }}
                    className="me-2"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
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
                          {parseFloat(prod.DevisProduit?.quantite || 0).toFixed(
                            2,
                          )}
                        </td>
                        <td>
                          {parseFloat(
                            prod.DevisProduit?.prix_unitaire || 0,
                          ).toFixed(2)}{" "}
                        </td>
                        <td>
                          {parseFloat(
                            prod.DevisProduit?.total_ligne || 0,
                          ).toFixed(2)}{" "}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
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

export default DevisDetailsModal;
