import React, { useState } from "react";
import { FiInfo } from "react-icons/fi";
import DatePicker from "react-datepicker";
import useDatePicker from "@/hooks/useDatePicker";
import topTost from "@/utils/topTost";

import axios from "axios";
import { config_url } from "@/utils/config";
import { FaCalendarAlt } from "react-icons/fa";
import { BsPlusCircle } from "react-icons/bs";

const previtems = [
  {
    id: 1,
    product: "",
    qty: 1,
    v1: 1, // Longueur
    v2: 1, // Largeur
    v3: 1, // Hauteur
    price_unit: 1, // Price per unit volume
    total: 1,
  },
];

// Moroccan invoice status options
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyée", label: "Envoyée" },
  { value: "payée", label: "Payée" },
  { value: "partiellement_payée", label: "Partiellement Payée" },
  { value: "en_retard", label: "En Retard" },
  { value: "annulée", label: "Annulée" },
  { value: "en_attente", label: "En Attente" },
];

// Moroccan payment types
const paymentTypeOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
  { value: "multiple", label: "Paiement Multiple" },
  { value: "non_paye", label: "Non Payé" },
];

const BonLivrCreate = () => {
  const { startDate, setStartDate, renderFooter } = useDatePicker();
  const [items, setItems] = useState(previtems);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [invoiceNote, setInvoiceNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState("brouillon");
  const [advancementPrice, setAdvancementPrice] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState("fixed"); // "fixed" or "percentage"
  const [paymentType, setPaymentType] = useState("espece");
  const [createdInvoiceId, setCreatedInvoiceId] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const addItem = () => {
    const newItem = {
      id: items.length + 1,
      product: "",
      qty: 1,
      v1: 1,
      v2: 1,
      v3: 1,
      price_unit: 1,
      total: 1,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleInputChange = (id, field, value) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        const updatedItem = {
          ...item,
          [field]: field === "product" ? value : parseFloat(value) || 0,
        };

        // Calculate total when any of the relevant fields change
        if (["qty", "v1", "v2", "v3", "price_unit"].includes(field)) {
          updatedItem.total =
            updatedItem.qty *
            updatedItem.v1 *
            updatedItem.v2 *
            updatedItem.v3 *
            updatedItem.price_unit;
        }

        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  // Calculate subtotal (before discount)
  const subTotal = items.reduce((accumulator, currentValue) => {
    return accumulator + currentValue.total;
  }, 0);

  // Calculate discount
  const calculateDiscount = () => {
    if (discountType === "percentage") {
      return (subTotal * discountAmount) / 100;
    } else {
      return discountAmount;
    }
  };

  const discount = calculateDiscount();

  // Calculate total after discount
  const totalAfterDiscount = subTotal - discount;

  // Final total (after discount)
  const total = Math.max(0, totalAfterDiscount).toFixed(2);

  // Update remaining amount when total or advancement changes
  React.useEffect(() => {
    const remaining = totalAfterDiscount - advancementPrice;
    setRemainingAmount(remaining > 0 ? remaining : 0);
  }, [totalAfterDiscount, advancementPrice]);

  const handleAdvancementChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setAdvancementPrice(value);
  };

  const handleDiscountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setDiscountAmount(value);
  };

  const handleDiscountTypeChange = (e) => {
    setDiscountType(e.target.value);
    // Reset discount amount when changing type
    setDiscountAmount(0);
  };

  // Get maximum discount value based on type
  const getMaxDiscount = () => {
    if (discountType === "percentage") {
      return 100;
    } else {
      return subTotal;
    }
  };

  // Format phone number for WhatsApp (Morocco format)
  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;

    // Remove all non-numeric characters
    let cleanPhone = phone.replace(/\D/g, "");

    // Handle different Moroccan phone formats
    if (cleanPhone.startsWith("0")) {
      // Convert 0XXXXXXXX to +212XXXXXXXX
      cleanPhone = "212" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("212")) {
      // Already in international format
      cleanPhone = cleanPhone;
    } else if (cleanPhone.length === 9) {
      // Assume it's a Moroccan number without country code
      cleanPhone = "212" + cleanPhone;
    } else if (cleanPhone.startsWith("+212")) {
      // Remove the + if present
      cleanPhone = cleanPhone.substring(1);
    }

    return cleanPhone;
  };

  // Generate WhatsApp message
  const generateWhatsAppMessage = (invoiceNumber, customerName, invoiceId) => {
    const pdfUrl = `${config_url}/api/bonlivraisons/${invoiceId}/pdf`;

    const message = `Bonjour ${customerName || "Client"},

Votre Bon Livraison ${invoiceNumber} est prête !

Montant total: ${total} Dh
Statut: ${
      statusOptions.find((opt) => opt.value === invoiceStatus)?.label ||
      invoiceStatus
    }

Vous pouvez télécharger votre Bon Livraison PDF ici:
${pdfUrl}

Merci pour votre confiance !

Fer-Aluminium-Inox
Construction Métallique`;

    return encodeURIComponent(message);
  };

  // Send invoice to WhatsApp
  const sendToWhatsApp = async () => {
    if (!createdInvoiceId) {
      topTost("Aucune Bon Livraison créée à envoyer", "error");
      return;
    }

    if (!customerPhone.trim()) {
      topTost(
        "Le numéro de téléphone est requis pour envoyer via WhatsApp",
        "error"
      );
      return;
    }

    setIsGeneratingPDF(true);

    try {
      // Format phone number
      const formattedPhone = formatPhoneForWhatsApp(customerPhone);

      if (!formattedPhone) {
        topTost("Format de numéro de téléphone invalide", "error");
        return;
      }

      // Generate WhatsApp message with the actual invoice number
      const invoiceNumber = `FACT-${createdInvoiceId}`;
      const message = generateWhatsAppMessage(
        invoiceNumber,
        customerName,
        createdInvoiceId
      );

      // Create WhatsApp Web URL
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;

      // Open WhatsApp Web in new tab
      window.open(whatsappUrl, "_blank");

      topTost("WhatsApp ouvert avec votre Bon Livraison!", "success");
    } catch (error) {
      console.error("Error sending to WhatsApp:", error);
      topTost("Erreur lors de l'envoi vers WhatsApp", "error");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const resetForm = () => {
    setItems(previtems);
    setCustomerName("");
    setCustomerPhone("");
    setInvoiceNote("");
    setInvoiceStatus("brouillon");
    setAdvancementPrice(0);
    setRemainingAmount(0);
    setDiscountAmount(0);
    setDiscountType("fixed");
    setPaymentType("espece");
    setCreatedInvoiceId(null);
  };

  const handleSubmit = async () => {
    // ✅ Validate customer name
    if (!customerName.trim()) {
      topTost("Le nom du client est requis", "error");
      return;
    }

    // ✅ Validate customer phone if status requires it
    if (
      (invoiceStatus === "envoyée" ||
        invoiceStatus === "partiellement_payée") &&
      !customerPhone.trim()
    ) {
      topTost(
        "Le numéro de téléphone est requis pour envoyer la Bon Livraison",
        "error"
      );
      return;
    }

    // ✅ Validate advancement doesn't exceed total
    if (advancementPrice > totalAfterDiscount) {
      topTost("L'acompte ne peut pas dépasser le montant total", "error");
      return;
    }

    // ✅ Validate discount doesn't exceed subtotal
    if (discount > subTotal) {
      topTost("La remise ne peut pas dépasser le sous-total", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate amounts consistently
      const calculatedSubTotal = subTotal;
      const calculatedDiscount = discount;
      const calculatedTotal = calculatedSubTotal - calculatedDiscount;
      const calculatedRemaining = Math.max(
        0,
        calculatedTotal - advancementPrice
      );

      // Prepare invoice data - match backend expectations
      const invoiceData = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        issueDate: startDate,
        notes: invoiceNote,
        status: invoiceStatus,
        advancement: parseFloat(advancementPrice),
        remainingAmount: parseFloat(calculatedRemaining),
        discountAmount: parseFloat(calculatedDiscount),
        discountType: discountType,
        discountValue: parseFloat(discountAmount), // Add this line
        paymentType: paymentType,
        items: items.map((item) => ({
          articleName: item.product,
          quantity: parseFloat(item.qty),
          v1: parseFloat(item.v1),
          v2: parseFloat(item.v2),
          v3: parseFloat(item.v3),
          unitPrice: parseFloat(item.price_unit),
          totalPrice: parseFloat(item.total), // Add this line
        })),
        subTotal: parseFloat(calculatedSubTotal),
        total: parseFloat(calculatedTotal),
      };

      console.log("Sending invoice data:", invoiceData);
      console.log("Calculations:", {
        subTotal: calculatedSubTotal,
        discount: calculatedDiscount,
        total: calculatedTotal,
        advancement: advancementPrice,
        remaining: calculatedRemaining,
      });

      // Send to backend
      const response = await axios.post(
        `${config_url}/api/bonlivraisons`,
        invoiceData
      );

      // Show success message
      topTost("Bon Livraison créée avec succès!", "success");

      // Store the created invoice ID for WhatsApp sharing
      if (response.data.invoice && response.data.invoice.id) {
        setCreatedInvoiceId(response.data.invoice.id);
      } else {
        console.error("No invoice ID in response:", response.data);
        topTost("Bon Livraison créée mais ID non reçu", "warning");
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.error ||
        "Erreur lors de la création de la Bon Livraison. Veuillez réessayer.";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="col-xl-12">
        <div className="card invoice-container">
          <div className="card-header">
            <h5>Creer Bon Livraison- Fer-Aluminium-Inox</h5>
          </div>
          <div className="card-body p-0">
            <div className="px-4 pt-4">
              <div className="d-md-flex align-items-center justify-content-between">
                <div className="d-md-flex align-items-center justify-content-end gap-4">
                  <div className="form-group mb-3 mb-md-0">
                    <label className="form-label fw-medium">
                      <FaCalendarAlt className="me-2" />
                      Date Facturation:
                    </label>
                    <div className="input-group date">
                      <span className="input-group-text bg-light">
                        <FaCalendarAlt className="text-muted" />
                      </span>
                      <DatePicker
                        placeholderText="Issue date..."
                        selected={startDate}
                        showPopperArrow={false}
                        onChange={(date) => setStartDate(date)}
                        className="form-control"
                        popperPlacement="bottom-start"
                        calendarContainer={({ children }) => (
                          <div className="bg-white react-datepicker shadow-sm">
                            {children}
                            {renderFooter("start")}
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="row mt-4">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="customerName" className="form-label">
                      Nom Client: *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="customerName"
                      placeholder="Entrez Le Nom De Client"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="customerPhone" className="form-label">
                      Téléphone Client: *
                      {["envoyée", "partiellement_payée"].includes(
                        invoiceStatus
                      ) && <span className="text-danger"> (Requis)</span>}
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      id="customerPhone"
                      placeholder="06 XX XX XX XX ou +212 6 XX XX XX XX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required={["envoyée", "partiellement_payée"].includes(
                        invoiceStatus
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Status, Payment Type, and Advancement */}
              <div className="row mt-3">
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="invoiceStatus" className="form-label">
                      Statut de la Bon Livraison:
                    </label>
                    <select
                      className="form-control"
                      id="invoiceStatus"
                      value={invoiceStatus}
                      onChange={(e) => setInvoiceStatus(e.target.value)}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="paymentType" className="form-label">
                      Type de Paiement:
                    </label>
                    <select
                      className="form-control"
                      id="paymentType"
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                    >
                      {paymentTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="advancementPrice" className="form-label">
                      Avancement (Dh):
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="advancementPrice"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={totalAfterDiscount}
                      value={advancementPrice}
                      onChange={handleAdvancementChange}
                    />
                    <small className="text-muted">
                      Maximum: {totalAfterDiscount.toFixed(2)} Dh
                    </small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="discountType" className="form-label">
                      Type de Remise:
                    </label>
                    <select
                      className="form-control"
                      id="discountType"
                      value={discountType}
                      onChange={handleDiscountTypeChange}
                    >
                      <option value="fixed">Montant Fixe (Dh)</option>
                      <option value="percentage">Pourcentage (%)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Discount Input Section */}
              <div className="row mt-3">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="discountAmount" className="form-label">
                      {discountType === "percentage"
                        ? "Remise (%)"
                        : "Remise (Dh)"}
                      :
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="discountAmount"
                      placeholder={discountType === "percentage" ? "0" : "0.00"}
                      step={discountType === "percentage" ? "1" : "0.01"}
                      min="0"
                      max={getMaxDiscount()}
                      value={discountAmount}
                      onChange={handleDiscountChange}
                    />
                    <small className="text-muted">
                      {discountType === "percentage"
                        ? `Maximum: 100% (${subTotal.toFixed(2)} Dh)`
                        : `Maximum: ${subTotal.toFixed(2)} Dh`}
                    </small>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Valeur de la Remise:</label>
                    <div className="p-2 bg-light rounded">
                      <p className="mb-0 fw-bold text-danger">
                        -{discount.toFixed(2)}{" "}
                        {discountType === "percentage" ? "%" : "Dh"}
                        {discountType === "percentage" && (
                          <span className="text-muted ms-2">
                            ({((discountAmount / 100) * subTotal).toFixed(2)}{" "}
                            Dh)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-dashed" />
            <div className="px-4 clearfix proposal-table">
              <div className="mb-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="fw-bold">
                    Ajouter des éléments de construction en métal :
                  </h6>
                  <span className="fs-12 text-muted">
                    Ajouter des éléments avec des dimensions à la Bon Livraison{" "}
                  </span>
                </div>
                <div
                  className="avatar-text avatar-sm"
                  data-bs-toggle="tooltip"
                  data-bs-trigger="hover"
                  title="Total = Qty × Longueur × Largeur × Hauteur × Unit Price"
                >
                  <FiInfo />
                </div>
              </div>
              <div className="table-responsive">
                <table
                  className="table table-bordered overflow-hidden"
                  id="tab_logic"
                >
                  <thead>
                    <tr className="single-item">
                      <th className="text-center wd-100">#</th>
                      <th className="text-center wd-300">Nom d'Article</th>
                      <th className="text-center wd-100">Qty</th>
                      <th className="text-center wd-100">Longueur (V1)</th>
                      <th className="text-center wd-100">Largeur (V2)</th>
                      <th className="text-center wd-100">Hauteur (V3)</th>
                      <th className="text-center wd-100">Price/Unit Vol.</th>
                      <th className="text-center wd-150">Total Price</th>
                      <th className="text-center wd-100">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      return (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>
                            <input
                              type="text"
                              name="product"
                              placeholder="Article Name"
                              className="form-control"
                              value={item.product}
                              onChange={(e) =>
                                handleInputChange(
                                  item.id,
                                  "product",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              name="qty"
                              placeholder="Qty"
                              className="form-control qty"
                              step="1"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                handleInputChange(
                                  item.id,
                                  "qty",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              name="v1"
                              placeholder="Longueur"
                              className="form-control"
                              step="0.01"
                              min="0.01"
                              value={item.v1}
                              onChange={(e) =>
                                handleInputChange(item.id, "v1", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              name="v2"
                              placeholder="Largeur"
                              className="form-control"
                              step="0.01"
                              min="0.01"
                              value={item.v2}
                              onChange={(e) =>
                                handleInputChange(item.id, "v2", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              name="v3"
                              placeholder="Hauteur"
                              className="form-control"
                              step="0.01"
                              min="0.01"
                              value={item.v3}
                              onChange={(e) =>
                                handleInputChange(item.id, "v3", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              name="price_unit"
                              placeholder="Price/Unit"
                              className="form-control price"
                              step="0.01"
                              min="0.01"
                              value={item.price_unit}
                              onChange={(e) =>
                                handleInputChange(
                                  item.id,
                                  "price_unit",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              name="total"
                              placeholder="1.00"
                              className="form-control total"
                              readOnly
                              value={item.total.toFixed(2)}
                            />
                          </td>
                          <td className="text-center">
                            {items.length > 1 && (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => removeItem(item.id)}
                              >
                                Supprimer
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <button
                  className="btn btn-sm btn-primary d-flex justify-content-end gap-2"
                  onClick={addItem}
                >
                  Ajouter Nouveau Article
                  <BsPlusCircle size={15} />
                </button>
              </div>
            </div>

            {/* Summary Section */}
            <div className="px-4 py-3 bg-light mt-4">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Client:</label>
                    <p className="fw-bold">{customerName || "Non spécifié"}</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone:</label>
                    <p className="fw-bold">{customerPhone || "Non spécifié"}</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Statut:</label>
                    <p className="fw-bold">
                      {statusOptions.find((opt) => opt.value === invoiceStatus)
                        ?.label || "Brouillon"}
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type de Paiement:</label>
                    <p className="fw-bold">
                      {paymentTypeOptions.find(
                        (opt) => opt.value === paymentType
                      )?.label || "Non spécifié"}
                    </p>
                  </div>
                </div>
                <div className="col-md-6 text-end">
                  <div className="row justify-content-end">
                    <div className="col-auto">
                      <p className="mb-1">Sous-total:</p>
                      <p className="mb-1 text-danger">Remise:</p>
                      <p className="mb-1 fw-bold">Total après remise:</p>
                      <p className="mb-1">Avancement:</p>
                      <p className="mb-1 fw-bold border-top pt-1">
                        Reste à payer:
                      </p>
                    </div>
                    <div className="col-auto text-end">
                      <p className="mb-1">{subTotal.toFixed(2)} Dh</p>
                      <p className="mb-1 text-danger">
                        -{discount.toFixed(2)} Dh
                      </p>
                      <p className="mb-1 fw-bold">
                        {totalAfterDiscount.toFixed(2)} Dh
                      </p>
                      <p className="mb-1">{advancementPrice.toFixed(2)} Dh</p>
                      <p className="mb-1 fw-bold border-top pt-1">
                        {remainingAmount.toFixed(2)} Dh
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-dashed" />
            <div className="px-4 pb-4">
              <div className="form-group">
                <label htmlFor="InvoiceNote" className="form-label">
                  Description De Bon Livraison:
                </label>
                <textarea
                  rows={6}
                  className="form-control"
                  id="InvoiceNote"
                  placeholder="It was a pleasure working with you and your team. We hope you will keep us in mind for future metal construction projects. Thank You!"
                  value={invoiceNote}
                  onChange={(e) => setInvoiceNote(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-end gap-3 mt-4">
                {createdInvoiceId && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={sendToWhatsApp}
                      disabled={isGeneratingPDF || !customerPhone.trim()}
                    >
                      {isGeneratingPDF
                        ? "Ouverture WhatsApp..."
                        : "📱 Envoyer via WhatsApp"}
                    </button>
                    <button className="btn btn-secondary" onClick={resetForm}>
                      Nouvelle Bon Livraison
                    </button>
                  </>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Création de la Bon Livraison..."
                    : "Créer Bon Livraison"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BonLivrCreate;
