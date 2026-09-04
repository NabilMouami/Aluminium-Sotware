import React, { useState, useEffect } from "react";
import axios from "axios";
import { config_url } from "@/utils/config";
import { useNavigate } from "react-router-dom";
import topTost from "@/utils/topTost";

// Icons
import {
  FiCheckCircle,
  FiClock,
  FiPercent,
  FiDollarSign,
  FiFileText,
  FiTruck,
  FiCalendar,
  FiCreditCard,
  FiAlertCircle,
  FiEye,
  FiPrinter,
} from "react-icons/fi";

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Non Payé" },
  { value: "payé", label: "Payé" },
  { value: "partiellement_payée", label: "Partiellement Payé" },
  { value: "annulée", label: "Annulé" },
];

function ClientPaymentStatusModal({ clientId, clientName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  // Fetch payment status
  useEffect(() => {
    if (clientId) {
      fetchPaymentStatus();
    }
  }, [clientId]);

  const fetchPaymentStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${config_url}/api/clients/${clientId}/payment-status`,
        { withCredentials: true },
      );

      setPaymentData(response.data);
    } catch (err) {
      console.error("Error fetching payment status:", err);
      setError(
        err.response?.data?.message || "Erreur lors du chargement du statut",
      );
      topTost("Erreur lors du chargement du statut de paiement", "error");
    } finally {
      setLoading(false);
    }
  };

  const parseAmount = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const formatAmount = (value) =>
    `${parseAmount(value).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} DH`;

  const getPaidPercentage = (paid, total) => {
    const paidNum = parseAmount(paid);
    const totalNum = parseAmount(total);
    if (totalNum <= 0) return 0;
    return Math.round((paidNum / totalNum) * 100);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-danger text-white",
      envoyé: "bg-primary text-white",
      payé: "bg-success text-white",
      partiellement_payée: "bg-warning text-dark",
      en_retard: "bg-danger text-white",
      annulée: "bg-dark text-white",
      en_attente: "bg-info text-white",
    };
    return colors[status] || "bg-secondary text-white";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Non Payé",
      payé: "Payé",
      partiellement_payée: "Partiellement Payé",
      annulée: "Annulé",
    };
    return texts[status] || status;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "payé":
      case "payée":
        return <FiCheckCircle className="me-1" />;
      case "partiellement_payée":
        return <FiPercent className="me-1" />;
      case "brouillon":
        return <FiClock className="me-1" />;
      default:
        return <FiAlertCircle className="me-1" />;
    }
  };

  // Get document icon
  const getDocumentIcon = (type) => {
    switch (type) {
      case "bon-livraison":
        return <FiTruck className="me-2" />;
      case "facture":
        return <FiFileText className="me-2" />;
      default:
        return <FiFileText className="me-2" />;
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchPaymentStatus();
  };

  const getDocumentTypeLabel = (type) =>
    type === "bon-livraison" ? "Bon Livraison" : "Facture";

  const handlePrint = () => {
    if (!paymentData) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const { summary, documents } = paymentData;
    const totals = summary.totals;
    const printDate = new Date().toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const rowsHtml =
      documents.length === 0
        ? `<tr><td colspan="7" style="text-align:center;padding:16px;">Aucun document en attente de paiement</td></tr>`
        : documents
            .map((doc) => {
              const paidPct = getPaidPercentage(doc.totalPaid, doc.montantTTC);
              const extraInfo =
                doc.is_facture === false && doc.type === "bon-livraison"
                  ? `<div style="font-size:11px;color:#666;">Non facturé</div>`
                  : "";
              return `
                <tr>
                  <td>${getDocumentTypeLabel(doc.type)}</td>
                  <td><strong>${doc.numero || "-"}</strong>${extraInfo}</td>
                  <td>${formatDate(doc.date)}</td>
                  <td>${getStatusText(doc.paymentStatus)}</td>
                  <td style="text-align:right;">${formatAmount(doc.montantTTC)}</td>
                  <td style="text-align:right;color:#198754;">${formatAmount(doc.totalPaid)}<br><small>${paidPct}%</small></td>
                  <td style="text-align:right;color:#dc3545;font-weight:bold;">${formatAmount(doc.totalRemaining)}</td>
                </tr>`;
            })
            .join("");

    const content = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Statut de Paiement - ${clientName || "Client"}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 0; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { color: #555; margin-bottom: 20px; font-size: 11px; }
    .summary { display: flex; gap: 12px; margin-bottom: 20px; }
    .summary-card { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 12px; }
    .summary-card h3 { margin: 0 0 6px; font-size: 11px; color: #666; font-weight: normal; }
    .summary-card p { margin: 0; font-size: 16px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; font-size: 11px; }
    tfoot td { background: #f9f9f9; font-weight: bold; }
    .footer { margin-top: 24px; font-size: 10px; color: #777; text-align: center; }
  </style>
</head>
<body onload="window.print(); setTimeout(() => window.close(), 100);">
  <h1>Statut de Paiement - Client</h1>
  <div class="meta">
    <div><strong>Client:</strong> ${clientName || "-"}</div>
    <div><strong>Date d'impression:</strong> ${printDate}</div>
    <div><strong>Documents en attente:</strong> ${documents.length}</div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <h3>Montant Total</h3>
      <p>${formatAmount(totals.totalAmount)}</p>
    </div>
    <div class="summary-card">
      <h3>Déjà Payé</h3>
      <p style="color:#198754;">${formatAmount(totals.totalPaid)}</p>
      <small>${getPaidPercentage(totals.totalPaid, totals.totalAmount)}% du total</small>
    </div>
    <div class="summary-card">
      <h3>Reste à Payer</h3>
      <p style="color:#dc3545;">${formatAmount(totals.totalRemaining)}</p>
      <small>${summary.counts.brouillon} non payé(s), ${summary.counts.partiellement_payée} partiellement payé(s)</small>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Type</th>
        <th>Numéro</th>
        <th>Date</th>
        <th>Statut</th>
        <th style="text-align:right;">Montant TTC</th>
        <th style="text-align:right;">Déjà Payé</th>
        <th style="text-align:right;">Reste à Payer</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:right;">Totaux:</td>
        <td style="text-align:right;">${formatAmount(totals.totalAmount)}</td>
        <td style="text-align:right;color:#198754;">${formatAmount(totals.totalPaid)}</td>
        <td style="text-align:right;color:#dc3545;">${formatAmount(totals.totalRemaining)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">SARL Comptoir Aluminium Nador — Rapport généré automatiquement</div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  // Handle view document
  const handleViewDocument = (doc) => {
    if (doc.type === "bon-livraison") {
      navigate(`/bon-livraisons/${doc.documentId}`);
    } else if (doc.type === "facture") {
      navigate(`/factures/${doc.documentId}`);
    }
  };

  if (loading) {
    return (
      <div
        className="modal fade show d-block"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Statut de Paiement</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
              <p className="mt-3">Chargement du statut de paiement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="modal fade show d-block"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Statut de Paiement</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body text-center py-5">
              <FiAlertCircle size={48} className="text-danger mb-3" />
              <h5>Erreur</h5>
              <p className="text-muted">{error}</p>
              <button className="btn btn-primary mt-3" onClick={handleRefresh}>
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header bg-light">
            <div>
              <h5 className="modal-title mb-1">Statut de Paiement - Client</h5>
              <p className="text-muted mb-0 small">
                {clientName} | Dernière mise à jour:{" "}
                {paymentData?.timestamp
                  ? formatDate(paymentData.timestamp)
                  : "-"}
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={handlePrint}
                title="Imprimer le statut de paiement"
              >
                <FiPrinter className="me-1" />
                Imprimer
              </button>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>
          </div>

          {/* Body */}
          <div className="modal-body">
            {paymentData && (
              <>
                {/* Statistics Cards */}
                <div className="row mb-4">
                  <div className="col-md-4 mb-3">
                    <div className="card border-primary">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="text-muted mb-1">Montant Total</h6>
                            <h3 className="mb-0">
                              {formatAmount(
                                paymentData.summary.totals.totalAmount,
                              )}
                            </h3>
                          </div>
                          <div className="bg-primary bg-opacity-10 p-3 rounded">
                            <FiDollarSign size={24} className="text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4 mb-3">
                    <div className="card border-success">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="text-muted mb-1">Déjà Payé</h6>
                            <h3 className="mb-0">
                              {formatAmount(
                                paymentData.summary.totals.totalPaid,
                              )}
                            </h3>
                            <small className="text-muted">
                              {getPaidPercentage(
                                paymentData.summary.totals.totalPaid,
                                paymentData.summary.totals.totalAmount,
                              )}
                              % du total
                            </small>
                          </div>
                          <div className="bg-success bg-opacity-10 p-3 rounded">
                            <FiCheckCircle size={24} className="text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4 mb-3">
                    <div className="card border-danger">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="text-muted mb-1">Reste à Payer</h6>
                            <h3 className="mb-0">
                              {formatAmount(
                                paymentData.summary.totals.totalRemaining,
                              )}
                            </h3>
                            <small className="text-muted">
                              {paymentData.summary.counts.brouillon} Non
                              Payé(s),{" "}
                              {paymentData.summary.counts.partiellement_payée}{" "}
                              partiellement payé(s)
                            </small>
                          </div>
                          <div className="bg-danger bg-opacity-10 p-3 rounded">
                            <FiCreditCard size={24} className="text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents Table */}
                <div className="row">
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header">
                        <h6 className="card-title mb-0">
                          <FiFileText className="me-2" />
                          Documents en Attente de Paiement (
                          {paymentData.documents.length})
                        </h6>
                      </div>
                      <div className="card-body">
                        {paymentData.documents.length === 0 ? (
                          <div className="text-center py-4">
                            <FiCheckCircle
                              size={48}
                              className="text-success mb-3"
                            />
                            <h5>Aucun document en attente</h5>
                            <p className="text-muted">
                              Tous les documents sont payés
                            </p>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-hover">
                              <thead>
                                <tr>
                                  <th>Type</th>
                                  <th>Numéro</th>
                                  <th>Date</th>
                                  <th>Statut</th>
                                  <th>Montant TTC</th>
                                  <th>Déjà Payé</th>
                                  <th>Reste à Payer</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paymentData.documents.map((doc, index) => (
                                  <tr key={index}>
                                    <td>
                                      <span className="d-flex align-items-center">
                                        {getDocumentIcon(doc.type)}
                                        <span className="text-capitalize">
                                          {doc.type === "bon-livraison"
                                            ? "Bon Livraison"
                                            : "Facture"}
                                        </span>
                                      </span>
                                    </td>
                                    <td>
                                      <strong>{doc.numero}</strong>
                                      {doc.is_facture === false &&
                                        doc.type === "bon-livraison" && (
                                          <div className="small text-muted">
                                            Non facturé
                                          </div>
                                        )}
                                    </td>
                                    <td>
                                      <span className="d-flex align-items-center">
                                        <FiCalendar className="me-1 text-muted" />
                                        {formatDate(doc.date)}
                                      </span>
                                    </td>
                                    <td>
                                      <span
                                        className={`badge ${getStatusColor(doc.paymentStatus)}`}
                                      >
                                        {getStatusIcon(doc.paymentStatus)}
                                        {getStatusText(doc.paymentStatus)}
                                      </span>
                                    </td>
                                    <td>
                                      <strong>
                                        {formatAmount(doc.montantTTC)}
                                      </strong>
                                    </td>
                                    <td>
                                      <span className="text-success">
                                        {formatAmount(doc.totalPaid)}
                                      </span>
                                      {parseAmount(doc.montantTTC) > 0 && (
                                        <div className="small text-muted">
                                          {getPaidPercentage(
                                            doc.totalPaid,
                                            doc.montantTTC,
                                          )}
                                          %
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <span className="text-danger fw-bold">
                                        {formatAmount(doc.totalRemaining)}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="d-flex gap-2">
                                        <button
                                          className="btn btn-sm btn-outline-primary"
                                          onClick={() =>
                                            handleViewDocument(doc)
                                          }
                                          title="Voir le document"
                                        >
                                          <FiEye size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="table-active">
                                  <td colSpan="4" className="text-end">
                                    <strong>Totaux:</strong>
                                  </td>
                                  <td>
                                    <strong>
                                      {formatAmount(
                                        paymentData.summary.totals.totalAmount,
                                      )}
                                    </strong>
                                  </td>
                                  <td>
                                    <strong className="text-success">
                                      {formatAmount(
                                        paymentData.summary.totals.totalPaid,
                                      )}
                                    </strong>
                                  </td>
                                  <td>
                                    <strong className="text-danger">
                                      {formatAmount(
                                        paymentData.summary.totals
                                          .totalRemaining,
                                      )}
                                    </strong>
                                  </td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-danger" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientPaymentStatusModal;
