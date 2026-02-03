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
  FiFileText,
  FiUser,
  FiShoppingCart,
} from "react-icons/fi";
import Select from "react-select";

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
      // ─── Most important part ────────────────────────────────
      if (onDevisUpdated && response.data?.devis) {
        // Pass the fresh devis object returned by the server
        onDevisUpdated(response.data.devis);
      } else if (onDevisUpdated) {
        // Fallback: merge what we sent + id + maybe updatedAt
        onDevisUpdated({
          ...devis, // old values
          ...updateData, // new values
          updatedAt: new Date().toISOString(), // optional
        });
      }
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

  const getStatusLabel = (status) => {
    return statusOptions.find((opt) => opt.value === status)?.label || status;
  };

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
    const printTotalText = totalToFrenchText(total);

    const printContent = `
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
    }

    th { background: #f2f2f2; text-align: center; }

    .totals {
      margin-top: 25px;
      text-align: right;
    }

    .net-box {
      display: inline-block;
      border: 2px solid #000;
      padding: 10px 16px;
      margin-right: 20px;
      font-weight: bold;
    }

    .italic {
      font-style: italic;
      font-size: 1.1rem;
      margin-top: 15px;
      font-weight: bold;
    }
  </style>
</head>

<body>
  <div class="header">
    <h2>DEVIS</h2>
    <p>ALUMINIUM OULAD BRAHIM – TÉL : +212 671953725</p>
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
      setTimeout(() => window.close(), 150);
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

      Object.assign(container.style, {
        width: "210mm",
        padding: "15mm",
        background: "#fff",
        color: "#000",
        fontFamily: "Arial, sans-serif",
        fontSize: "0.8rem",
        textTransform: "uppercase",
        boxSizing: "border-box",
        position: "absolute",
        left: "-9999px",
        top: "0",
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
      <div style="text-align:center; border-bottom:3px solid #000; padding-bottom:15px; margin-bottom:20px;">
        <h1 style="margin:0; letter-spacing:1px;">DEVIS</h1>
        <p style="font-weight:bold;">ALUMINIUM OULAD BRAHIM</p>
        <p>TÉL : +212 671953725</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:25px;">
        <div>
          <strong>NOM CLIENT :</strong><br/>
          ${devis.client_name || devis.client?.nom_complete || "—"}
        </div>
        <div style="text-align:right;">
          <strong>N° DEVIS :</strong> ${devis.num_devis}<br/>
          <strong>DATE CRÉATION :</strong> ${creationDateFormatted}
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            ${["CODE", "DÉSIGNATION", "QTÉ", "PRIX U", "MONTANT"]
              .map(
                (h) =>
                  `<th style="border:1.5px solid #000; padding:10px;">${h}</th>`,
              )
              .join("")}
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
        <div style="display:inline-block; border:2px solid #000; padding:12px 18px; font-weight:bold;">
          NET À PAYER : ${total.toFixed(2)} DH
        </div>
        <div style="margin-top:12px; font-style:italic; font-weight:bold; font-size:1.1rem;">
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
