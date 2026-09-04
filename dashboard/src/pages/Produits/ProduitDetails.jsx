import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { config_url } from "@/utils/config";

import topTost from "@/utils/topTost";

// Icons
import {
  FiPackage,
  FiFileText,
  FiTruck,
  FiDollarSign,
  FiCalendar,
  FiSearch,
  FiHash,
  FiMapPin,
  FiEye,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiPercent,
  FiCreditCard,
  FiFilter,
  FiX,
  FiBox,
  FiTrendingUp,
  FiUsers,
  FiPhone,
  FiArrowLeft,
  FiUser,
  FiTag,
} from "react-icons/fi";

function ProduitDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [produit, setProduit] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [dateFilters, setDateFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [filterLoading, setFilterLoading] = useState(false);

  // Fetch product data
  useEffect(() => {
    fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    try {
      setLoading(true);

      // Fetch product history (includes product info + all documents)
      const historyRes = await axios.get(
        `${config_url}/api/produits/${id}/history`,
        { withCredentials: true },
      );

      setProduit(historyRes.data.produit);
      setHistoryData(historyRes.data);
    } catch (error) {
      console.error("Error fetching product data:", error);
      topTost(
        error.response?.data?.message ||
          "Erreur lors du chargement des données",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch history with filters
  const fetchFilteredHistory = useCallback(async () => {
    try {
      setFilterLoading(true);

      const params = {};
      if (filterType !== "all") {
        params.documentType = filterType;
      }
      if (dateFilters.startDate) {
        params.startDate = dateFilters.startDate;
      }
      if (dateFilters.endDate) {
        params.endDate = dateFilters.endDate;
      }

      const historyRes = await axios.get(
        `${config_url}/api/produits/${id}/history`,
        { params, withCredentials: true },
      );

      setProduit(historyRes.data.produit);
      setHistoryData(historyRes.data);

      const totalDocs =
        (historyRes.data.documents?.byType?.devis?.length || 0) +
        (historyRes.data.documents?.byType?.bonLivraisons?.length || 0) +
        (historyRes.data.documents?.byType?.factures?.length || 0);
      topTost(`${totalDocs} document(s) trouvé(s)`, "success");
    } catch (error) {
      console.error("Error fetching filtered history:", error);
      topTost("Erreur lors du filtrage", "error");
    } finally {
      setFilterLoading(false);
    }
  }, [id, filterType, dateFilters]);

  // Reset filters
  const resetFilters = () => {
    setFilterType("all");
    setDateFilters({ startDate: "", endDate: "" });
    fetchProductData();
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-danger text-white",
      envoyé: "bg-primary text-white",
      payé: "bg-success text-white",
      payée: "bg-success text-white",
      partiellement_payée: "bg-warning text-dark",
      en_retard: "bg-danger text-white",
      annulée: "bg-dark text-white",
      en_attente: "bg-info text-white",
    };
    return colors[status] || "bg-secondary text-white";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      accepté: "Accepté",
      refusé: "Refusé",
      payé: "Payé",
      payée: "Payée",
      partiellement_payée: "Partiellement Payé",
      annulée: "Annulé",
      envoyée: "Envoyée",
    };
    return texts[status] || status;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "payée":
      case "payé":
      case "accepté":
        return <FiCheckCircle className="me-1" />;
      case "brouillon":
        return <FiClock className="me-1" />;
      case "partiellement_payée":
        return <FiPercent className="me-1" />;
      case "annulée":
      case "refusé":
        return <FiXCircle className="me-1" />;
      default:
        return <FiClock className="me-1" />;
    }
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

  // Format currency
  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "0,00 MAD";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Safe quantity parsing
  const parseQuantity = (qty) => {
    if (typeof qty === "number") return qty;
    if (typeof qty === "string") return parseFloat(qty) || 0;
    return 0;
  };

  // Navigate to document
  const handleViewDocument = (type, docId) => {
    let route = "";
    switch (type) {
      case "devis":
        route = `/devis/${docId}`;
        break;
      case "bon-livraison":
        route = `/bon-livraisons/${docId}`;
        break;
      case "facture":
        route = `/factures/${docId}`;
        break;
    }
    if (route) navigate(route);
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Chargement...</span>
                </div>
                <p className="mt-3">
                  Chargement des informations du produit...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!produit) {
    return (
      <div className="main-content">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <h4>Produit non trouvé</h4>
                <p className="text-muted">
                  Le produit que vous recherchez n'existe pas.
                </p>
                <button
                  className="btn btn-primary mt-3"
                  onClick={() => navigate("/produits")}
                >
                  Retour à la liste des produits
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = produit?.statistics;
  const documents = historyData?.documents?.byType;
  const clients = historyData?.clients || [];

  return (
    <div className="main-content">
      {/* Product Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="card-title mb-1">
                    <FiPackage className="me-2" />
                    {produit.designation}
                  </h4>
                  <p className="text-muted mb-0">
                    Référence: <strong>{produit.reference}</strong>
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate("/produits")}
                  >
                    <FiArrowLeft className="me-2" />
                    Retour
                  </button>
                </div>
              </div>

              <div className="row mt-3">
                <div className="col-md-3">
                  <div className="d-flex align-items-center mb-2">
                    <FiDollarSign className="me-2 text-muted" />
                    <span>
                      Prix Achat:{" "}
                      <strong>
                        {parseFloat(produit.prix_achat || 0).toFixed(2)} DH
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center mb-2">
                    <FiDollarSign className="me-2 text-success" />
                    <span>
                      Prix Vente:{" "}
                      <strong className="text-success">
                        {parseFloat(produit.prix_vente || 0).toFixed(2)} DH
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center mb-2">
                    <FiBox className="me-2 text-muted" />
                    <span>
                      Stock: <strong>{produit.qty ?? 0}</strong>
                    </span>
                  </div>
                </div>
                <div className="col-md-3">
                  {produit.fornisseur && (
                    <div className="d-flex align-items-center mb-2">
                      <FiUsers className="me-2 text-muted" />
                      <span>
                        Fournisseur:{" "}
                        <strong
                          className="text-primary"
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            navigate(`/fornisseurs/${produit.fornisseur.id}`)
                          }
                        >
                          {produit.fornisseur.nom_complete}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row mb-4 fs-3">
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Documents Total</h6>
                    <h3 className="mb-0">{stats.totalDocuments || 0}</h3>
                    <small className="text-muted">
                      {stats.totalDevisItems || 0} Devis ·{" "}
                      {stats.totalBLItems || 0} BL ·{" "}
                      {stats.totalFactureItems || 0} Fact.
                    </small>
                  </div>
                  <div className="bg-primary bg-opacity-10 p-3 rounded">
                    <FiFileText size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Quantité Totale</h6>
                    <h3 className="mb-0">{stats.totalQuantity?.total || 0}</h3>
                    <small className="text-muted">
                      Devis: {stats.totalQuantity?.devis || 0} · BL:{" "}
                      {stats.totalQuantity?.bonLivraisons || 0} · Fact:{" "}
                      {stats.totalQuantity?.factures || 0}
                    </small>
                  </div>
                  <div className="bg-info bg-opacity-10 p-3 rounded">
                    <FiTrendingUp size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Montant Total</h6>
                    <h3 className="mb-0">
                      {formatCurrency(stats.totalRevenue?.total || 0)}
                    </h3>
                    <small className="text-muted">
                      Revenue across all docs
                    </small>
                  </div>
                  <div className="bg-success bg-opacity-10 p-3 rounded">
                    <FiDollarSign size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Clients Uniques</h6>
                    <h3 className="mb-0">{stats.uniqueClientsCount || 0}</h3>
                    <small className="text-muted">
                      Clients ayant acheté ce produit
                    </small>
                  </div>
                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                    <FiUsers size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Breakdown Cards */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-4 mb-3">
            <div className="card border-start border-primary border-4 h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <FiFileText className="me-2 text-primary" size={20} />
                  <h6 className="mb-0">Devis</h6>
                </div>
                <h4 className="text-primary mb-1">
                  {formatCurrency(stats.totalRevenue?.devis || 0)}
                </h4>
                <small className="text-muted">
                  {stats.totalDevisItems || 0} ligne(s) ·{" "}
                  {stats.totalQuantity?.devis || 0} unité(s)
                </small>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-3">
            <div className="card border-start border-info border-4 h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <FiTruck className="me-2 text-info" size={20} />
                  <h6 className="mb-0">Bons de Livraison</h6>
                </div>
                <h4 className="text-info mb-1">
                  {formatCurrency(stats.totalRevenue?.bonLivraisons || 0)}
                </h4>
                <small className="text-muted">
                  {stats.totalBLItems || 0} ligne(s) ·{" "}
                  {stats.totalQuantity?.bonLivraisons || 0} unité(s)
                </small>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-3">
            <div className="card border-start border-success border-4 h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <FiDollarSign className="me-2 text-success" size={20} />
                  <h6 className="mb-0">Factures</h6>
                </div>
                <h4 className="text-success mb-1">
                  {formatCurrency(stats.totalRevenue?.factures || 0)}
                </h4>
                <small className="text-muted">
                  {stats.totalFactureItems || 0} ligne(s) ·{" "}
                  {stats.totalQuantity?.factures || 0} unité(s)
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clients List */}
      {clients.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <FiUsers className="me-2" />
                  Clients ({clients.length})
                </h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Téléphone</th>
                        <th>Ville</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client, index) => (
                        <tr key={client.id || index}>
                          <td>
                            <div className="d-flex align-items-center">
                              <FiUser className="me-2 text-muted" />
                              <strong>{client.nom_complete}</strong>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FiPhone className="me-1 text-muted" />
                              {client.telephone || "-"}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FiMapPin className="me-1 text-muted" />
                              {client.ville || "-"}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => navigate(`/clients/${client.id}`)}
                              title="Voir le client"
                            >
                              <FiEye size={14} className="me-1" />
                              Détails
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document History */}
      <div className="row">
        <div className="col-12 fs-5">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="card-title mb-0">
                Historique des Documents (سجل الوثائق)
              </h5>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                {/* Document Type Filter */}
                <select
                  className="form-select form-select-sm w-auto"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">Tous les types</option>
                  <option value="devis">Devis</option>
                  <option value="bon-livraison">Bon de Livraison</option>
                  <option value="facture">Facture</option>
                </select>

                {/* Date Filters */}
                <div className="d-flex align-items-center gap-2">
                  <label className="small mb-0">Du:</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{ width: "140px" }}
                    value={dateFilters.startDate}
                    onChange={(e) =>
                      setDateFilters({
                        ...dateFilters,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <label className="small mb-0">Au:</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{ width: "140px" }}
                    value={dateFilters.endDate}
                    onChange={(e) =>
                      setDateFilters({
                        ...dateFilters,
                        endDate: e.target.value,
                      })
                    }
                  />
                </div>

                <button
                  className="btn btn-sm btn-primary"
                  onClick={fetchFilteredHistory}
                  disabled={filterLoading}
                >
                  {filterLoading ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    <>
                      <FiSearch size={14} className="me-1" />
                      Appliquer
                    </>
                  )}
                </button>

                {(filterType !== "all" ||
                  dateFilters.startDate ||
                  dateFilters.endDate) && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={resetFilters}
                  >
                    <FiX size={14} /> Reset
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              {/* Devis Table */}
              {(filterType === "all" || filterType === "devis") &&
                documents?.devis &&
                documents.devis.length > 0 && (
                  <div className="mb-4">
                    <h6 className="d-flex align-items-center mb-3">
                      <FiFileText className="me-2 text-primary" />
                      Devis ({documents.devis.length})
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-hover table-sm">
                        <thead>
                          <tr>
                            <th>N° Devis</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th className="text-center">Quantité</th>
                            <th className="text-end">Prix Unitaire</th>
                            <th className="text-end">Total Ligne</th>
                            <th>Statut</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.devis.map((item, index) => (
                            <tr key={`devis-${index}`}>
                              <td>
                                <strong>{item.devis?.num_devis}</strong>
                              </td>
                              <td>
                                <span className="d-flex align-items-center">
                                  <FiCalendar className="me-1 text-muted" />
                                  {formatDate(item.devis?.date_creation)}
                                </span>
                              </td>
                              <td>
                                {item.devis?.client ? (
                                  <span
                                    className="text-primary"
                                    style={{ cursor: "pointer" }}
                                    onClick={() =>
                                      navigate(
                                        `/clients/${item.devis.client.id}`,
                                      )
                                    }
                                  >
                                    {item.devis.client.nom_complete}
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="text-center">
                                <span className="badge bg-primary">
                                  {parseQuantity(item.quantite)}
                                </span>
                              </td>
                              <td className="text-end">
                                {formatCurrency(item.prix_unitaire)}
                              </td>
                              <td className="text-end">
                                <strong className="text-success">
                                  {formatCurrency(item.total_ligne)}
                                </strong>
                              </td>
                              <td>
                                <span
                                  className={`badge ${getStatusColor(item.devis?.status)}`}
                                >
                                  {getStatusIcon(item.devis?.status)}
                                  {getStatusText(item.devis?.status)}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() =>
                                    handleViewDocument("devis", item.devis?.id)
                                  }
                                  title="Voir le devis"
                                >
                                  <FiEye size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Bon Livraison Table */}
              {(filterType === "all" || filterType === "bon-livraison") &&
                documents?.bonLivraisons &&
                documents.bonLivraisons.length > 0 && (
                  <div className="mb-4">
                    <h6 className="d-flex align-items-center mb-3">
                      <FiTruck className="me-2 text-info" />
                      Bons de Livraison ({documents.bonLivraisons.length})
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-hover table-sm">
                        <thead>
                          <tr>
                            <th>N° BL</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th className="text-center">Quantité</th>
                            <th className="text-end">Prix Unitaire</th>
                            <th className="text-end">Total Ligne</th>
                            <th>Statut</th>
                            <th>Facture</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.bonLivraisons.map((item, index) => (
                            <tr key={`bl-${index}`}>
                              <td>
                                <strong>
                                  {item.bonLivraison?.num_bon_livraison}
                                </strong>
                              </td>
                              <td>
                                <span className="d-flex align-items-center">
                                  <FiCalendar className="me-1 text-muted" />
                                  {formatDate(item.bonLivraison?.date_creation)}
                                </span>
                              </td>
                              <td>
                                {item.bonLivraison?.client ? (
                                  <span
                                    className="text-primary"
                                    style={{ cursor: "pointer" }}
                                    onClick={() =>
                                      navigate(
                                        `/clients/${item.bonLivraison.client.id}`,
                                      )
                                    }
                                  >
                                    {item.bonLivraison.client.nom_complete}
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="text-center">
                                <span className="badge bg-primary">
                                  {parseQuantity(item.quantite)}
                                </span>
                              </td>
                              <td className="text-end">
                                {formatCurrency(item.prix_unitaire)}
                              </td>
                              <td className="text-end">
                                <strong className="text-success">
                                  {formatCurrency(item.total_ligne)}
                                </strong>
                              </td>
                              <td>
                                <span
                                  className={`badge ${getStatusColor(item.bonLivraison?.status)}`}
                                >
                                  {getStatusIcon(item.bonLivraison?.status)}
                                  {getStatusText(item.bonLivraison?.status)}
                                </span>
                              </td>
                              <td>
                                {item.bonLivraison?.facture ? (
                                  <span
                                    className="badge bg-success text-white"
                                    style={{ cursor: "pointer" }}
                                    onClick={() =>
                                      handleViewDocument(
                                        "facture",
                                        item.bonLivraison.facture.id,
                                      )
                                    }
                                  >
                                    {item.bonLivraison.facture.num_facture}
                                  </span>
                                ) : (
                                  <span className="text-muted small">-</span>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() =>
                                    handleViewDocument(
                                      "bon-livraison",
                                      item.bonLivraison?.id,
                                    )
                                  }
                                  title="Voir le BL"
                                >
                                  <FiEye size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Factures Table */}
              {(filterType === "all" || filterType === "facture") &&
                documents?.factures &&
                documents.factures.length > 0 && (
                  <div className="mb-4">
                    <h6 className="d-flex align-items-center mb-3">
                      <FiDollarSign className="me-2 text-success" />
                      Factures ({documents.factures.length})
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-hover table-sm">
                        <thead>
                          <tr>
                            <th>N° Facture</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th className="text-center">Quantité</th>
                            <th className="text-end">Prix Unitaire</th>
                            <th className="text-end">Total Ligne</th>
                            <th>Statut</th>
                            <th>BL Associé</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.factures.map((item, index) => (
                            <tr key={`facture-${index}`}>
                              <td>
                                <strong>{item.facture?.num_facture}</strong>
                              </td>
                              <td>
                                <span className="d-flex align-items-center">
                                  <FiCalendar className="me-1 text-muted" />
                                  {formatDate(
                                    item.facture?.date_facturation ||
                                      item.facture?.date_creation,
                                  )}
                                </span>
                              </td>
                              <td>
                                {item.facture?.client ? (
                                  <span
                                    className="text-primary"
                                    style={{ cursor: "pointer" }}
                                    onClick={() =>
                                      navigate(
                                        `/clients/${item.facture.client.id}`,
                                      )
                                    }
                                  >
                                    {item.facture.client.nom_complete}
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="text-center">
                                <span className="badge bg-primary">
                                  {parseQuantity(item.quantite)}
                                </span>
                              </td>
                              <td className="text-end">
                                {formatCurrency(item.prix_unitaire)}
                              </td>
                              <td className="text-end">
                                <strong className="text-success">
                                  {formatCurrency(item.total_ligne)}
                                </strong>
                              </td>
                              <td>
                                <span
                                  className={`badge ${getStatusColor(item.facture?.status)}`}
                                >
                                  {getStatusIcon(item.facture?.status)}
                                  {getStatusText(item.facture?.status)}
                                </span>
                              </td>
                              <td>
                                {item.facture?.bon_livraison ? (
                                  <span
                                    className="badge bg-info text-white"
                                    style={{ cursor: "pointer" }}
                                    onClick={() =>
                                      handleViewDocument(
                                        "bon-livraison",
                                        item.facture.bon_livraison.id,
                                      )
                                    }
                                  >
                                    {
                                      item.facture.bon_livraison
                                        .num_bon_livraison
                                    }
                                  </span>
                                ) : (
                                  <span className="text-muted small">-</span>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() =>
                                    handleViewDocument(
                                      "facture",
                                      item.facture?.id,
                                    )
                                  }
                                  title="Voir la facture"
                                >
                                  <FiEye size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Empty State */}
              {(!documents?.devis || documents.devis.length === 0) &&
                (!documents?.bonLivraisons ||
                  documents.bonLivraisons.length === 0) &&
                (!documents?.factures || documents.factures.length === 0) && (
                  <div className="text-center py-5">
                    <FiSearch size={48} className="text-muted mb-3" />
                    <h5>Aucun document trouvé</h5>
                    <p className="text-muted">
                      Ce produit n'apparaît dans aucun document avec les filtres
                      sélectionnés.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProduitDetails;
