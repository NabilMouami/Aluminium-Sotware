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
  FiPlus,
  FiTrash2,
  FiEye,
} from "react-icons/fi";
import DatePicker from "react-datepicker";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import "react-datepicker/dist/react-datepicker.css";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

// Updated status options to match your backend
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "payé", label: "Payé" },
  { value: "partiellement payé", label: "Partiellement Payé" },
  { value: "annulé", label: "Annulé" },
];

// Payment methods for advancements
const paymentMethodOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
];

const BonLivrDetailsModal = ({
  isOpen,
  toggle,
  bon,
  onUpdate,
  footerContent,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    status: "brouillon",
    notes: "",
    advancements: [],
  });

  // Initialize form data when bon changes
  useEffect(() => {
    if (bon) {
      console.log("Initializing form with bon:", bon);
      setFormData({
        status: bon.status || "brouillon",
        notes: bon.notes || "",
        advancements: bon.advancements
          ? bon.advancements.map((adv) => ({
              id: adv.id,
              amount: parseFloat(adv.amount) || 0,
              paymentDate: adv.paymentDate
                ? new Date(adv.paymentDate)
                : new Date(),
              paymentMethod: adv.paymentMethod || "espece",
              reference: adv.reference || "",
              notes: adv.notes || "",
            }))
          : [],
      });
    }
  }, [bon]);

  if (!bon) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "warning";
      case "payé":
        return "success";
      case "envoyé":
        return "info";
      case "en_retard":
        return "danger";
      case "partiellement payé":
        return "primary";
      default:
        return "secondary";
    }
  };

  // Calculate total advancements
  const totalAdvancements = formData.advancements.reduce(
    (sum, adv) => sum + parseFloat(adv.amount || 0),
    0,
  );

  const total = parseFloat(bon.total) || parseFloat(bon.montant_ttc) || 0;
  const remainingAmount = Math.max(0, total - totalAdvancements);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Advancement handlers
  const addAdvancement = () => {
    const newAdvancement = {
      id: Date.now(), // Temporary ID for new advancements
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: "espece",
      reference: "",
      notes: "",
    };
    setFormData((prev) => ({
      ...prev,
      advancements: [...prev.advancements, newAdvancement],
    }));
  };

  const removeAdvancement = async (index) => {
    const result = await MySwal.fire({
      title: "Supprimer cet acompte?",
      text: "Êtes-vous sûr de vouloir supprimer cet acompte?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer!",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      const updatedAdvancements = formData.advancements.filter(
        (_, i) => i !== index,
      );
      setFormData((prev) => ({
        ...prev,
        advancements: updatedAdvancements,
      }));
    }
  };

  const handleAdvancementChange = (index, field, value) => {
    const updatedAdvancements = [...formData.advancements];
    updatedAdvancements[index] = {
      ...updatedAdvancements[index],
      [field]:
        field === "paymentDate"
          ? value
          : field === "paymentMethod" ||
              field === "reference" ||
              field === "notes"
            ? value
            : parseFloat(value) || 0,
    };
    setFormData((prev) => ({
      ...prev,
      advancements: updatedAdvancements,
    }));
  };

  const handleSubmit = async () => {
    // Validate advancements don't exceed total
    if (totalAdvancements > total) {
      topTost(
        "Le total des acomptes ne peut pas dépasser le montant total",
        "error",
      );
      return;
    }

    // Validate individual advancements
    for (const adv of formData.advancements) {
      if (!adv.amount || adv.amount <= 0) {
        topTost("Tous les acomptes doivent avoir un montant positif", "error");
        return;
      }
      if (!adv.paymentDate) {
        topTost("Tous les acomptes doivent avoir une date", "error");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare the data for backend
      const updateData = {
        status: formData.status,
        notes: formData.notes,
        advancements: formData.advancements.map((adv) => ({
          id: adv.id,
          amount: adv.amount,
          paymentDate: adv.paymentDate.toISOString().split("T")[0],
          paymentMethod: adv.paymentMethod,
          reference: adv.reference,
          notes: adv.notes,
        })),
      };

      console.log("Sending update data to backend:", updateData);

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.put(
        `${config_url}/api/bon-livraisons/${bon.id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Update response from backend:", response.data);

      topTost("Bon de livraison mis à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.bon || response.data);
      }

      toggle();
    } catch (error) {
      console.error("Error updating bon:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la mise à jour du bon de livraison";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!bon) return;

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR");
    };

    // Get date from bon
    const issueDate = bon.date_creation
      ? new Date(bon.date_creation)
      : new Date();

    // Calculate product totals
    let subTotal = 0;
    if (bon.produits && bon.produits.length > 0) {
      subTotal = bon.produits.reduce((sum, prod) => {
        const lineTotal =
          parseFloat(prod.BonLivraisonProduit?.total_ligne) || 0;
        return sum + lineTotal;
      }, 0);
    }

    const remise = parseFloat(bon.remise) || 0;
    const montantHT = parseFloat(bon.montant_ht) || 0;
    const montantTTC = parseFloat(bon.montant_ttc) || 0;

    const printWindow = window.open("", "_blank");
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Bon Livraison ${bon.deliveryNumber || bon.num_bon_livraison}</title>
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
    .advancements {
      margin-top: 25px;
    }
    .advancements h3 {
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
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">Bon Livraison</h2>
    <p style="margin: 5px 0;">Hassan - Aluminium-Inox</p>
    <p style="margin: 0;">Tél: +212 661-431237</p>
  </div>

  <div class="invoice-info">
    <div class="info-block">
      <p><strong>Nom Client:</strong> ${
        bon.customerName || bon.client?.nom_complete || "Client inconnu"
      }</p>
    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>N° Bon Livraison:</strong> ${
        bon.deliveryNumber || bon.num_bon_livraison
      }</p>
      <p><strong>Date:</strong> ${formatDate(issueDate)}</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Code</th>
                <th>Designation</th>

        <th>Qté</th>
        <th>Prix U.</th>
        <th>Montant</th>
      </tr>
    </thead>
    <tbody>
      ${(bon.produits || [])
        .map(
          (prod) => `
        <tr>
          <td>${prod.reference || "N/A"}</td>
                    <td>${prod.designation || "Produit"}</td>

          <td>${prod.BonLivraisonProduit?.quantite || 0}</td>
          <td>${parseFloat(
            prod.BonLivraisonProduit?.prix_unitaire || 0,
          ).toFixed(2)} Dh</td>

          <td>${parseFloat(prod.BonLivraisonProduit?.total_ligne || 0).toFixed(
            2,
          )} Dh</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Net A Payer:</strong> ${subTotal.toFixed(2)} Dh</p>
    ${
      remise > 0
        ? `<p><strong>Remise globale:</strong> -${remise.toFixed(2)} Dh</p>`
        : ""
    }
    ${
      totalAdvancements > 0
        ? `
      <p><strong>Total acomptes:</strong> -${totalAdvancements.toFixed(
        2,
      )} Dh</p>
      <p><strong>Reste à payer:</strong> ${remainingAmount.toFixed(2)} Dh</p>
    `
        : ""
    }
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

      const issueDate = bon.date_creation
        ? new Date(bon.date_creation)
        : new Date();

      // Calculate totals
      let subTotal = 0;
      if (bon.produits && bon.produits.length > 0) {
        subTotal = bon.produits.reduce((sum, prod) => {
          const lineTotal =
            parseFloat(prod.BonLivraisonProduit?.total_ligne) || 0;
          return sum + lineTotal;
        }, 0);
      }

      const remise = parseFloat(bon.remise) || 0;
      const montantHT = parseFloat(bon.montant_ht) || 0;
      const montantTTC = parseFloat(bon.montant_ttc) || 0;

      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">Bon Livraison</h1>
        <h3 style="margin:5px 0;">Hassan - Aluminium-Inox</h3>
        <p style="font-size:10px;">Tél: +212 661-431237</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div>
          <h4 style="margin-bottom:5px;">Client</h4>
          <p><strong>Nom:</strong> ${
            bon.customerName || bon.client?.nom_complete || "Client inconnu"
          }</p>
        </div>
        <div>
          <h4 style="margin-bottom:5px;">Informations du Bon</h4>
          <p><strong>N°:</strong> ${
            bon.deliveryNumber || bon.num_bon_livraison
          }</p>
          <p><strong>Date création:</strong> ${formatDate(issueDate)}</p>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
        <thead>
          <tr style="background-color:#2c5aa0; color:#fff;">
            <th style="padding:6px; border:1px solid #2c5aa0;">Code</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Produit</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Qté</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Prix U.</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${(bon.produits || [])
            .map(
              (prod, i) => `
            <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
           
              <td style="border:1px solid #ddd; padding:5px;">${
                prod.reference || "N/A"
              }</td>
                 <td style="border:1px solid #ddd; padding:5px;">${
                   prod.designation || "Produit"
                 }</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:center;">${
                prod.BonLivraisonProduit?.quantite || 0
              }</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(
                prod.BonLivraisonProduit?.prix_unitaire || 0,
              ).toFixed(2)} Dh</td>
              <td style="border:1px solid #ddd; padding:5px; text-align:right;">${parseFloat(
                prod.BonLivraisonProduit?.total_ligne || 0,
              ).toFixed(2)} Dh</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        ${
          remise > 0
            ? `<p><strong>Remise globale:</strong> -${remise.toFixed(2)} Dh</p>`
            : ""
        }
        <p><strong>Total a Payer:</strong> ${montantHT.toFixed(2)} Dh</p>
        ${
          totalAdvancements > 0
            ? `
          <p><strong>Total acomptes:</strong> -${totalAdvancements.toFixed(
            2,
          )} Dh</p>
          <p style="font-size:13px; font-weight:bold; color:#2c5aa0;">
            Reste à payer: ${remainingAmount.toFixed(2)} Dh
          </p>
        `
            : ""
        }
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

      pdf.save(
        `Bon Livraison-${bon.deliveryNumber || bon.num_bon_livraison}.pdf`,
      );
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        Bon Livraison #{bon.deliveryNumber || bon.num_bon_livraison}
        <Badge color={getStatusBadge(formData.status)} className="ms-2">
          {statusOptions.find((opt) => opt.value === formData.status)?.label ||
            formData.status}
        </Badge>
      </ModalHeader>

      <ModalBody>
        <div className="row">
          {/* Client Information (Read-only) */}
          <div className="col-md-6">
            <div className="mb-3">
              <h6>Client</h6>
              <div className="p-3 bg-light rounded">
                <p>
                  <strong>Nom:</strong>{" "}
                  {bon.customerName ||
                    bon.client?.nom_complete ||
                    "Client inconnu"}
                </p>
                <p>
                  <strong>Téléphone:</strong>{" "}
                  {bon.customerPhone || bon.client?.telephone || "Non spécifié"}
                </p>
                <p>
                  <strong>Adresse:</strong>{" "}
                  {bon.client?.address || "Non spécifiée"}
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <h6>Informations du Bon</h6>
              <div className="p-3 bg-light rounded">
                <p>
                  <strong>Date création:</strong>{" "}
                  {new Date(
                    bon.date_creation || bon.createdAt,
                  ).toLocaleDateString("fr-FR")}
                </p>
                <p>
                  <strong>Date livraison:</strong>{" "}
                  {bon.date_livraison
                    ? new Date(bon.date_livraison).toLocaleDateString("fr-FR")
                    : "Non spécifiée"}
                </p>
                <p>
                  <strong>Mode règlement:</strong>{" "}
                  {bon.mode_reglement || "Non spécifié"}
                </p>
              </div>
            </div>
          </div>

          {/* Status and Notes (Editable) */}
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Statut *</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-md-8">
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

          {/* Advancements Section */}
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Acomptes</h6>
              <Button color="primary" size="sm" onClick={addAdvancement}>
                <FiPlus className="me-1" />
                Ajouter Acompte
              </Button>
            </div>

            {formData.advancements.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant (Dh)</th>
                      <th>Méthode</th>
                      <th>Référence</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.advancements.map((advancement, index) => (
                      <tr key={advancement.id || index}>
                        <td>
                          <DatePicker
                            selected={advancement.paymentDate}
                            onChange={(date) =>
                              handleAdvancementChange(
                                index,
                                "paymentDate",
                                date,
                              )
                            }
                            className="form-control form-control-sm"
                            dateFormat="dd/MM/yyyy"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={advancement.amount}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "amount",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                        <td>
                          <select
                            className="form-control form-control-sm"
                            value={advancement.paymentMethod}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "paymentMethod",
                                e.target.value,
                              )
                            }
                          >
                            {paymentMethodOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={advancement.reference}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "reference",
                                e.target.value,
                              )
                            }
                            placeholder="N° chèque, référence..."
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={advancement.notes}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "notes",
                                e.target.value,
                              )
                            }
                            placeholder="Notes..."
                          />
                        </td>
                        <td>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => removeAdvancement(index)}
                          >
                            <FiTrash2 />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                Aucun acompte enregistré. Cliquez sur "Ajouter Acompte" pour en
                ajouter.
              </div>
            )}
          </div>

          {/* Products Section (Read-only) */}
          <div className="col-12 mt-4">
            <h6>Produits</h6>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Prix Unitaire</th>
                    <th>Remise Ligne</th>
                    <th>Total Ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {(bon.produits || []).map((prod, index) => (
                    <tr key={prod.id || index}>
                      <td>{prod.reference || "N/A"}</td>
                      <td>{prod.designation || "Produit"}</td>

                      <td>{prod.BonLivraisonProduit?.quantite || 0}</td>
                      <td>
                        {parseFloat(
                          prod.BonLivraisonProduit?.prix_unitaire || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(
                          prod.BonLivraisonProduit?.remise_ligne || 0,
                        ).toFixed(2)}{" "}
                        Dh
                      </td>
                      <td>
                        {parseFloat(
                          prod.BonLivraisonProduit?.total_ligne || 0,
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
                  <h6>Résumé du Bon de Livraison</h6>
                  <p>
                    <strong>N° Bon:</strong>{" "}
                    {bon.deliveryNumber || bon.num_bon_livraison}
                  </p>
                  <p>
                    <strong>Client:</strong>{" "}
                    {bon.customerName ||
                      bon.client?.nom_complete ||
                      "Client inconnu"}
                  </p>
                  <p>
                    <strong>Statut:</strong>{" "}
                    {
                      statusOptions.find((opt) => opt.value === formData.status)
                        ?.label
                    }
                  </p>
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
                  <div className="d-flex justify-content-between">
                    <span>Montant HT:</span>
                    <span>{parseFloat(bon.montant_ht || 0).toFixed(2)} Dh</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Total TTC:</span>
                    <span>
                      {parseFloat(bon.montant_ttc || bon.total || 0).toFixed(2)}{" "}
                      Dh
                    </span>
                  </div>
                  {totalAdvancements > 0 && (
                    <>
                      <div className="d-flex justify-content-between text-success">
                        <span>Total acomptes:</span>
                        <span>{totalAdvancements.toFixed(2)} Dh</span>
                      </div>
                      <div className="d-flex justify-content-between fw-bold border-top pt-1">
                        <span>Reste à payer:</span>
                        <span>{remainingAmount.toFixed(2)} Dh</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        {footerContent && <div className="w-100 mb-3">{footerContent}</div>}

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
              Télécharger PDF
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

export default BonLivrDetailsModal;
