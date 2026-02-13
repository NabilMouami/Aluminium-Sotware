import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { config_url } from "@/utils/config";
import ClientPaymentStatusModal from "./ClientPaymentStatusModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import topTost from "@/utils/topTost";

// Icons
import {
  FiUser,
  FiFileText,
  FiTruck,
  FiDollarSign,
  FiCalendar,
  FiSearch,
  FiPhone,
  FiMapPin,
  FiEye,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiPercent,
  FiCreditCard,
  FiPackage,
  FiFilter,
  FiX,
  FiBox,
  FiTrendingUp,
  FiCalendar as FiCalendarIcon,
} from "react-icons/fi";

function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Date range filters for history
  const [historyDateRange, setHistoryDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  // New state for product search
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchData, setProductSearchData] = useState(null);
  const [searchParams, setSearchParams] = useState({
    reference: "",
    exactMatch: false,
    documentType: "all",
    startDate: null,
    endDate: null,
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(true);
  const [allProductsData, setAllProductsData] = useState(null);
  const [allProductsLoading, setAllProductsLoading] = useState(false);
  const [allProductsDateRange, setAllProductsDateRange] = useState({
    startDate: null,
    endDate: null,
    documentType: "all",
  });

  // Helper function to format date for API
  const formatDateForAPI = (date) => {
    if (!date) return null;
    // Create a new date to avoid mutating the original
    const d = new Date(date);
    // Get year, month, day in local timezone
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Fetch client data
  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    try {
      setLoading(true);

      // Fetch client details
      const clientRes = await axios.get(`${config_url}/api/clients/${id}`, {
        withCredentials: true,
      });
      setClient(clientRes.data.client);

      // Fetch client summary
      const summaryRes = await axios.get(
        `${config_url}/api/clients/${id}/summary`,
        { withCredentials: true },
      );
      setSummary(summaryRes.data);

      // Fetch client history
      const historyRes = await axios.get(
        `${config_url}/api/clients/${id}/history`,
        { withCredentials: true },
      );
      setHistory(historyRes.data.documents.all || []);
    } catch (error) {
      console.error("Error fetching client data:", error);
      topTost(
        error.response?.data?.message || "Error loading client data",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearch = async () => {
    if (!searchParams.reference.trim()) {
      topTost("Veuillez saisir une référence produit", "warning");
      return;
    }

    try {
      setProductSearchLoading(true);

      // Build params
      const params = {
        reference: searchParams.reference.trim(),
      };

      // Only add documentType if it's NOT "all"
      if (searchParams.documentType !== "all") {
        params.documentType = searchParams.documentType;
      }

      // Add exactMatch if true
      if (searchParams.exactMatch === true) {
        params.exactMatch = "true";
      }

      // Add date filters if selected - FIXED DATE FORMATTING
      if (searchParams.startDate) {
        params.startDate = formatDateForAPI(searchParams.startDate);
      }
      if (searchParams.endDate) {
        params.endDate = formatDateForAPI(searchParams.endDate);
      }

      console.log("Search params being sent:", params);

      const response = await axios.get(
        `${config_url}/api/clients/${id}/products-by-reference`,
        {
          params: params,
          withCredentials: true,
        },
      );

      if (
        response.data &&
        response.data.history &&
        response.data.history.length > 0
      ) {
        setProductSearchData(response.data);
        topTost(
          `Trouvé ${response.data.history.length} entrée(s) pour la référence ${searchParams.reference}`,
          "success",
        );
      } else {
        setProductSearchData(response.data);
        topTost("Aucun produit trouvé pour cette référence", "info");
      }

      // Add to search history
      setSearchHistory((prev) => [
        {
          reference: searchParams.reference.trim(),
          exactMatch: searchParams.exactMatch,
          documentType: searchParams.documentType,
          startDate: searchParams.startDate,
          endDate: searchParams.endDate,
          timestamp: new Date().toISOString(),
          resultCount: response.data.summary?.totalEntries || 0,
        },
        ...prev.slice(0, 4),
      ]);

      setShowProductSearch(true);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Erreur lors de la recherche";
      topTost(errorMessage, "error");
      setProductSearchData(null);
    } finally {
      setProductSearchLoading(false);
    }
  };

  // Clear product search
  const clearProductSearch = () => {
    setProductSearchData(null);
    setShowProductSearch(false);
    setSearchParams({
      reference: "",
      exactMatch: false,
      documentType: "all",
      startDate: null,
      endDate: null,
    });
  };

  // Clear date filters for product search
  const clearProductDateFilters = () => {
    setSearchParams({
      ...searchParams,
      startDate: null,
      endDate: null,
    });
  };

  // Clear date filters for history
  const clearHistoryDateFilters = () => {
    setHistoryDateRange({
      startDate: null,
      endDate: null,
    });
  };

  // Filter history based on selected filters AND date range
  const filteredHistory = history.filter((doc) => {
    // Type filter
    if (filterType !== "all" && doc.document_type !== filterType) return false;

    // Status filter
    if (filterStatus !== "all" && doc.status !== filterStatus) return false;

    // Date range filter
    if (historyDateRange.startDate || historyDateRange.endDate) {
      const docDate = new Date(doc.date_creation);

      if (historyDateRange.startDate) {
        const startDate = new Date(historyDateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (docDate < startDate) return false;
      }

      if (historyDateRange.endDate) {
        const endDate = new Date(historyDateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (docDate > endDate) return false;
      }
    }

    return true;
  });

  // Get status badge color
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

  // Get document type icon
  const getDocumentIcon = (type) => {
    switch (type) {
      case "devis":
        return <FiFileText className="me-2" />;
      case "bon-livraison":
        return <FiTruck className="me-2" />;
      case "facture":
        return <FiDollarSign className="me-2" />;
      default:
        return <FiFileText className="me-2" />;
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format date without time
  const formatDateShort = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Handle document view
  const handleViewDocument = (doc) => {
    let route = "";
    switch (doc.document_type) {
      case "devis":
        route = `/devis/${doc.id}`;
        break;
      case "bon-livraison":
        route = `/bon-livraisons/${doc.id}`;
        break;
      case "facture":
        route = `/factures/${doc.id}`;
        break;
    }
    if (route) navigate(route);
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

  const fetchAllProducts = async () => {
    try {
      setAllProductsLoading(true);

      const params = {
        documentType:
          allProductsDateRange.documentType !== "all"
            ? allProductsDateRange.documentType
            : undefined,
      };

      // FIXED DATE FORMATTING - use the helper function
      if (allProductsDateRange.startDate) {
        params.startDate = formatDateForAPI(allProductsDateRange.startDate);
      }
      if (allProductsDateRange.endDate) {
        params.endDate = formatDateForAPI(allProductsDateRange.endDate);
      }

      console.log("Fetching all products with params:", params);

      const response = await axios.get(
        `${config_url}/api/clients/${id}/products-by-date-range`,
        {
          params,
          withCredentials: true,
        },
      );

      console.log("All products response:", response.data);

      // Debug: Check if dates in response match the filter
      if (response.data.products && response.data.products.length > 0) {
        const dates = response.data.products.map((p) => ({
          date: p.date_creation,
          formatted: new Date(p.date_creation).toLocaleDateString("fr-FR"),
        }));
        console.log("Sample of returned dates:", dates.slice(0, 5));
      }

      setAllProductsData(response.data);

      if (response.data.summary.totalEntries > 0) {
        topTost(
          `Trouvé ${response.data.summary.totalEntries} produit(s)`,
          "success",
        );
      } else {
        topTost("Aucun produit trouvé pour cette période", "info");
      }
    } catch (error) {
      console.error("Error fetching all products:", error);
      topTost(
        error.response?.data?.message ||
          "Erreur lors du chargement des produits",
        "error",
      );
      setAllProductsData(null);
    } finally {
      setAllProductsLoading(false);
    }
  };

  // Add this function to clear all products filters
  const clearAllProductsFilters = () => {
    setAllProductsDateRange({
      startDate: null,
      endDate: null,
      documentType: "all",
    });
    setAllProductsData(null);
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
                <p className="mt-3">Chargement des informations client...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="main-content">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <h4>Client non trouvé</h4>
                <p className="text-muted">
                  Le client que vous recherchez n'existe pas.
                </p>
                <button
                  className="btn btn-primary mt-3"
                  onClick={() => navigate("/clients")}
                >
                  Retour à la liste des clients
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Client Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="card-title mb-1">
                    <FiUser className="me-2" />
                    {client.nom_complete}
                  </h4>
                  <p className="text-muted mb-0">
                    Référence: {client.reference || "Non spécifiée"}
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-info"
                    onClick={() => {
                      setShowAllProducts(!showAllProducts);
                      setShowProductSearch(false);
                    }}
                  >
                    <FiPackage className="me-2" />
                    Tous les Produits
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setShowProductSearch(!showProductSearch);
                      setShowAllProducts(false);
                    }}
                  >
                    <FiSearch className="me-2" />
                    Recherche par Référence
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => setShowPaymentStatusModal(true)}
                  >
                    <FiCreditCard className="me-2" />
                    Statut de Paiement
                  </button>
                </div>
              </div>

              <div className="row mt-3">
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <FiPhone className="me-2 text-muted" />
                    <span>{client.telephone}</span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <FiMapPin className="me-2 text-muted" />
                    <span>{client.ville}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Search Panel */}
      {showProductSearch && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <FiSearch className="me-2" />
                  Recherche par Référence Produit
                </h5>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={clearProductSearch}
                >
                  <FiX size={16} />
                </button>
              </div>
              <div className="card-body">
                {/* Search Form */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="input-group">
                      <span className="input-group-text">
                        <FiBox />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Entrez la référence du produit (ex: ESQ40)"
                        value={searchParams.reference}
                        onChange={(e) =>
                          setSearchParams({
                            ...searchParams,
                            reference: e.target.value,
                          })
                        }
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleProductSearch();
                        }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handleProductSearch}
                        disabled={productSearchLoading}
                      >
                        {productSearchLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Recherche...
                          </>
                        ) : (
                          <>
                            <FiSearch className="me-2" />
                            Rechercher
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Document Type Filter */}
                  <div className="col-md-2">
                    <select
                      className="form-select"
                      value={searchParams.documentType}
                      onChange={(e) =>
                        setSearchParams({
                          ...searchParams,
                          documentType: e.target.value,
                        })
                      }
                    >
                      <option value="all">Tous les documents</option>
                      <option value="devis">Devis seulement</option>
                      <option value="bon-livraison">BL seulement</option>
                      <option value="facture">Factures seulement</option>
                    </select>
                  </div>

                  {/* Date Range Filters */}
                  <div className="col-md-4">
                    <div className="d-flex gap-2">
                      <div className="flex-grow-1">
                        <DatePicker
                          selected={searchParams.startDate}
                          onChange={(date) =>
                            setSearchParams({
                              ...searchParams,
                              startDate: date,
                            })
                          }
                          selectsStart
                          startDate={searchParams.startDate}
                          endDate={searchParams.endDate}
                          placeholderText="Date début"
                          className="form-control"
                          dateFormat="dd/MM/yyyy"
                          isClearable
                        />
                      </div>
                      <div className="flex-grow-1">
                        <DatePicker
                          selected={searchParams.endDate}
                          onChange={(date) =>
                            setSearchParams({ ...searchParams, endDate: date })
                          }
                          selectsEnd
                          startDate={searchParams.startDate}
                          endDate={searchParams.endDate}
                          minDate={searchParams.startDate}
                          placeholderText="Date fin"
                          className="form-control"
                          dateFormat="dd/MM/yyyy"
                          isClearable
                        />
                      </div>
                      {(searchParams.startDate || searchParams.endDate) && (
                        <button
                          className="btn btn-outline-secondary"
                          onClick={clearProductDateFilters}
                          title="Effacer les dates"
                        >
                          <FiX />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Filters Display */}
                {(searchParams.startDate ||
                  searchParams.endDate ||
                  searchParams.documentType !== "all") && (
                  <div className="mb-3">
                    <small className="text-muted me-2">Filtres actifs:</small>
                    {searchParams.startDate && (
                      <span className="badge bg-primary me-2">
                        Du: {formatDateShort(searchParams.startDate)}
                      </span>
                    )}
                    {searchParams.endDate && (
                      <span className="badge bg-primary me-2">
                        Au: {formatDateShort(searchParams.endDate)}
                      </span>
                    )}
                    {searchParams.documentType !== "all" && (
                      <span className="badge bg-info me-2">
                        Type: {searchParams.documentType}
                      </span>
                    )}
                  </div>
                )}

                {/* Search Results */}
                {productSearchData ? (
                  <>
                    {/* Statistics Cards */}
                    <div className="row mb-4">
                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-primary">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Total Entrées
                                </h6>
                                <h3 className="mb-0">
                                  {productSearchData.summary?.totalEntries || 0}
                                </h3>
                              </div>
                              <div className="bg-primary bg-opacity-10 p-3 rounded">
                                <FiPackage size={24} className="text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-info">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Produits Uniques
                                </h6>
                                <h3 className="mb-0">
                                  {productSearchData.summary
                                    ?.totalUniqueProducts || 0}
                                </h3>
                              </div>
                              <div className="bg-info bg-opacity-10 p-3 rounded">
                                <FiBox size={24} className="text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-warning">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Quantité Totale
                                </h6>
                                <h3 className="mb-0">
                                  {productSearchData.summary?.totalQuantity ||
                                    0}
                                </h3>
                              </div>
                              <div className="bg-warning bg-opacity-10 p-3 rounded">
                                <FiTrendingUp
                                  size={24}
                                  className="text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-success">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Montant Total
                                </h6>
                                <h3 className="mb-0">
                                  {formatCurrency(
                                    productSearchData.summary?.totalAmount || 0,
                                  )}
                                </h3>
                              </div>
                              <div className="bg-success bg-opacity-10 p-3 rounded">
                                <FiDollarSign
                                  size={24}
                                  className="text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Statistics - keeping your existing code */}
                    {productSearchData.productStatistics &&
                      productSearchData.productStatistics.length > 0 && (
                        <div className="row mb-4">
                          <div className="col-12">
                            <div className="card">
                              <div className="card-header">
                                <h6 className="card-title mb-0">
                                  <FiPackage className="me-2" />
                                  Statistiques par Produit
                                </h6>
                              </div>
                              <div className="card-body">
                                {productSearchData.productStatistics.map(
                                  (stat, index) => (
                                    <div
                                      key={index}
                                      className="mb-4 p-3 border rounded"
                                    >
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                          <h5 className="mb-1">
                                            {stat.product?.designation}
                                          </h5>
                                          <p className="text-muted mb-0">
                                            Référence:{" "}
                                            <strong>
                                              {stat.product?.reference}
                                            </strong>{" "}
                                            | Prix:{" "}
                                            <strong>
                                              {formatCurrency(
                                                stat.product?.prix_vente,
                                              )}
                                            </strong>
                                          </p>
                                        </div>
                                        <div className="text-end">
                                          <span className="badge bg-primary">
                                            {stat.appearances || 0}{" "}
                                            apparition(s)
                                          </span>
                                        </div>
                                      </div>

                                      <div className="row">
                                        <div className="col-md-4">
                                          <div className="mb-3">
                                            <h6>Quantité Totale</h6>
                                            <h4 className="text-primary">
                                              {stat.totalQuantity || 0}
                                            </h4>
                                          </div>
                                        </div>
                                        <div className="col-md-4">
                                          <div className="mb-3">
                                            <h6>Montant Total</h6>
                                            <h4 className="text-success">
                                              {formatCurrency(stat.totalAmount)}
                                            </h4>
                                          </div>
                                        </div>
                                        <div className="col-md-4">
                                          <div className="mb-3">
                                            <h6>Période</h6>
                                            <p className="mb-1">
                                              <small>
                                                Première:{" "}
                                                {formatDateShort(
                                                  stat.firstSeen,
                                                )}
                                              </small>
                                            </p>
                                            <p className="mb-0">
                                              <small>
                                                Dernière:{" "}
                                                {formatDateShort(stat.lastSeen)}
                                              </small>
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Document Type Breakdown */}
                                      <div className="mt-3">
                                        <h6>
                                          Répartition par Type de Document:
                                        </h6>
                                        <div className="d-flex gap-3">
                                          <div className="text-center">
                                            <div className="bg-primary bg-opacity-10 p-2 rounded">
                                              <FiFileText
                                                className="text-white"
                                                size={20}
                                              />
                                            </div>
                                            <small className="d-block mt-1">
                                              Devis
                                            </small>
                                            <strong>
                                              {stat.byDocumentType?.devis
                                                ?.count || 0}
                                            </strong>
                                          </div>
                                          <div className="text-center">
                                            <div className="bg-info bg-opacity-10 p-2 rounded">
                                              <FiTruck
                                                className="text-white"
                                                size={20}
                                              />
                                            </div>
                                            <small className="d-block mt-1">
                                              BL
                                            </small>
                                            <strong>
                                              {stat.byDocumentType?.[
                                                "bon-livraison"
                                              ]?.count || 0}
                                            </strong>
                                          </div>
                                          <div className="text-center">
                                            <div className="bg-success bg-opacity-10 p-2 rounded">
                                              <FiDollarSign
                                                className="text-white"
                                                size={20}
                                              />
                                            </div>
                                            <small className="d-block mt-1">
                                              Factures
                                            </small>
                                            <strong>
                                              {stat.byDocumentType?.facture
                                                ?.count || 0}
                                            </strong>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* History Table */}
                    {productSearchData.history &&
                    productSearchData.history.length > 0 ? (
                      <div className="row">
                        <div className="col-12">
                          <div className="card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                              <h6 className="card-title mb-0">
                                <FiCalendar className="me-2" />
                                Historique des Transactions (
                                {productSearchData.history.length} entrée(s))
                              </h6>
                              {(searchParams.startDate ||
                                searchParams.endDate) && (
                                <span className="badge bg-info">
                                  Période:{" "}
                                  {searchParams.startDate
                                    ? formatDateShort(searchParams.startDate)
                                    : "Début"}{" "}
                                  -{" "}
                                  {searchParams.endDate
                                    ? formatDateShort(searchParams.endDate)
                                    : "Aujourd'hui"}
                                </span>
                              )}
                            </div>
                            <div className="card-body">
                              <div className="table-responsive">
                                <table className="table table-hover">
                                  <thead>
                                    <tr>
                                      <th>Type</th>
                                      <th>Numéro</th>
                                      <th>Date</th>
                                      <th>Produit</th>
                                      <th>Quantité</th>
                                      <th>Prix Unitaire</th>
                                      <th>Total Ligne</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {productSearchData.history.map(
                                      (item, index) => (
                                        <tr key={index}>
                                          <td>
                                            <span className="d-flex align-items-center">
                                              {getDocumentIcon(
                                                item.document_type,
                                              )}
                                              <span className="text-capitalize">
                                                {item.document_type?.replace(
                                                  "-",
                                                  " ",
                                                )}
                                              </span>
                                            </span>
                                          </td>
                                          <td>
                                            <strong>
                                              {item.document?.num}
                                            </strong>
                                            <div className="small text-muted">
                                              {item.document?.status}
                                            </div>
                                          </td>
                                          <td>
                                            <span className="d-flex align-items-center">
                                              <FiCalendar className="me-1 text-muted" />
                                              {formatDate(item.date_creation)}
                                            </span>
                                          </td>
                                          <td>
                                            <div>
                                              <strong>
                                                {item.produit?.designation}
                                              </strong>
                                              <div className="small text-muted">
                                                Ref: {item.produit?.reference}
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <span className="badge bg-primary">
                                              {parseQuantity(item.quantite)}
                                            </span>
                                          </td>
                                          <td>
                                            <strong>
                                              {formatCurrency(
                                                item.prix_unitaire,
                                              )}
                                            </strong>
                                          </td>
                                          <td>
                                            <strong className="text-success">
                                              {formatCurrency(item.total_ligne)}
                                            </strong>
                                          </td>
                                        </tr>
                                      ),
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="row">
                        <div className="col-12">
                          <div className="card">
                            <div className="card-body text-center py-5">
                              <FiPackage
                                size={48}
                                className="text-muted mb-3"
                              />
                              <h5>Aucun historique trouvé</h5>
                              <p className="text-muted">
                                Aucune transaction trouvée pour la référence "
                                {searchParams.reference}" avec les critères
                                sélectionnés.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-5">
                    <FiSearch size={48} className="text-muted mb-3" />
                    <h5>Recherche par Référence Produit</h5>
                    <p className="text-muted mb-4">
                      Entrez une référence produit et sélectionnez une période
                      pour voir l'historique des transactions
                    </p>
                    <div className="text-muted small">
                      <p className="mb-1">
                        <FiFilter className="me-1" />
                        Utilisez les filtres de date pour une recherche précise
                      </p>
                      <p className="mb-1">
                        <FiCalendarIcon className="me-1" />
                        Sélectionnez une période (date début et date fin)
                      </p>
                      <p className="mb-0">
                        <FiBox className="me-1" />
                        Les résultats incluent tous les documents (Devis, BL,
                        Factures)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAllProducts && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <FiPackage className="me-2" />
                  Tous les Produits du Client
                </h5>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setShowAllProducts(false);
                    clearAllProductsFilters();
                  }}
                >
                  <FiX size={16} />
                </button>
              </div>
              <div className="card-body">
                {/* Filter Section */}
                <div className="row mb-4">
                  <div className="col-md-3">
                    <label className="form-label small">Type de Document</label>
                    <select
                      className="form-select"
                      value={allProductsDateRange.documentType}
                      onChange={(e) =>
                        setAllProductsDateRange({
                          ...allProductsDateRange,
                          documentType: e.target.value,
                        })
                      }
                    >
                      <option value="all">Tous les documents</option>
                      <option value="devis">Devis seulement</option>
                      <option value="bon-livraison">BL seulement</option>
                      <option value="facture">Factures seulement</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small">Période</label>
                    <div className="d-flex gap-2">
                      <div className="flex-grow-1">
                        <DatePicker
                          selected={allProductsDateRange.startDate}
                          onChange={(date) =>
                            setAllProductsDateRange({
                              ...allProductsDateRange,
                              startDate: date,
                            })
                          }
                          selectsStart
                          startDate={allProductsDateRange.startDate}
                          endDate={allProductsDateRange.endDate}
                          placeholderText="Date début"
                          className="form-control"
                          dateFormat="dd/MM/yyyy"
                          isClearable
                        />
                      </div>
                      <div className="flex-grow-1">
                        <DatePicker
                          selected={allProductsDateRange.endDate}
                          onChange={(date) =>
                            setAllProductsDateRange({
                              ...allProductsDateRange,
                              endDate: date,
                            })
                          }
                          selectsEnd
                          startDate={allProductsDateRange.startDate}
                          endDate={allProductsDateRange.endDate}
                          minDate={allProductsDateRange.startDate}
                          placeholderText="Date fin"
                          className="form-control"
                          dateFormat="dd/MM/yyyy"
                          isClearable
                        />
                      </div>
                      {(allProductsDateRange.startDate ||
                        allProductsDateRange.endDate) && (
                        <button
                          className="btn btn-outline-secondary"
                          onClick={clearAllProductsFilters}
                          title="Effacer les filtres"
                        >
                          <FiX />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label small">&nbsp;</label>
                    <button
                      className="btn btn-primary w-100"
                      onClick={fetchAllProducts}
                      disabled={allProductsLoading}
                    >
                      {allProductsLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Chargement...
                        </>
                      ) : (
                        <>
                          <FiSearch className="me-2" />
                          Afficher les Produits
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Active Filters Display */}
                {(allProductsDateRange.startDate ||
                  allProductsDateRange.endDate ||
                  allProductsDateRange.documentType !== "all") && (
                  <div className="mb-3">
                    <small className="text-muted me-2">Filtres actifs:</small>
                    {allProductsDateRange.startDate && (
                      <span className="badge bg-primary me-2">
                        Du: {formatDateShort(allProductsDateRange.startDate)}
                      </span>
                    )}
                    {allProductsDateRange.endDate && (
                      <span className="badge bg-primary me-2">
                        Au: {formatDateShort(allProductsDateRange.endDate)}
                      </span>
                    )}
                    {allProductsDateRange.documentType !== "all" && (
                      <span className="badge bg-info me-2">
                        Type: {allProductsDateRange.documentType}
                      </span>
                    )}
                  </div>
                )}

                {/* Results Section */}
                {allProductsData ? (
                  <>
                    {/* Statistics Cards */}
                    <div className="row mb-4">
                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-primary">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Total Entrées
                                </h6>
                                <h3 className="mb-0">
                                  {allProductsData.summary.totalEntries}
                                </h3>
                              </div>
                              <div className="bg-primary bg-opacity-10 p-3 rounded">
                                <FiPackage size={24} className="text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-info">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Produits Uniques
                                </h6>
                                <h3 className="mb-0">
                                  {allProductsData.summary.totalUniqueProducts}
                                </h3>
                              </div>
                              <div className="bg-info bg-opacity-10 p-3 rounded">
                                <FiBox size={24} className="text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-warning">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Quantité Totale
                                </h6>
                                <h3 className="mb-0">
                                  {allProductsData.summary.totalQuantity}
                                </h3>
                              </div>
                              <div className="bg-warning bg-opacity-10 p-3 rounded">
                                <FiTrendingUp
                                  size={24}
                                  className="text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-success">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Montant Total
                                </h6>
                                <h3 className="mb-0">
                                  {formatCurrency(
                                    allProductsData.summary.totalAmount,
                                  )}
                                </h3>
                              </div>
                              <div className="bg-success bg-opacity-10 p-3 rounded">
                                <FiDollarSign
                                  size={24}
                                  className="text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Statistics Table */}
                    {allProductsData.productStatistics &&
                      allProductsData.productStatistics.length > 0 && (
                        <div className="row mb-4">
                          <div className="col-12">
                            <div className="card">
                              <div className="card-header">
                                <h6 className="card-title mb-0">
                                  <FiPackage className="me-2" />
                                  Statistiques par Produit (
                                  {
                                    allProductsData.productStatistics.length
                                  }{" "}
                                  produit(s))
                                </h6>
                              </div>
                              <div className="card-body">
                                <div className="table-responsive">
                                  <table className="table table-hover">
                                    <thead>
                                      <tr>
                                        <th>Produit</th>
                                        <th>Référence</th>
                                        <th className="text-center">
                                          Apparitions
                                        </th>
                                        <th className="text-end">
                                          Quantité Totale
                                        </th>
                                        <th className="text-end">
                                          Montant Total
                                        </th>
                                        <th className="text-center">
                                          Première
                                        </th>
                                        <th className="text-center">
                                          Dernière
                                        </th>
                                        <th className="text-center">
                                          Répartition
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {allProductsData.productStatistics.map(
                                        (stat, index) => (
                                          <tr key={index}>
                                            <td>
                                              <strong>
                                                {stat.product.designation}
                                              </strong>
                                            </td>
                                            <td>
                                              <span className="badge bg-secondary">
                                                {stat.product.reference}
                                              </span>
                                            </td>
                                            <td className="text-center">
                                              <span className="badge bg-primary">
                                                {stat.appearances}
                                              </span>
                                            </td>

                                            <td className="text-end">
                                              <strong>
                                                {stat.totalQuantity}
                                              </strong>
                                            </td>
                                            <td className="text-end">
                                              <strong className="text-success">
                                                {formatCurrency(
                                                  stat.totalAmount,
                                                )}
                                              </strong>
                                            </td>
                                            <td className="text-center">
                                              <small>
                                                {formatDateShort(
                                                  stat.firstSeen,
                                                )}
                                              </small>
                                            </td>
                                            <td className="text-center">
                                              <small>
                                                {formatDateShort(stat.lastSeen)}
                                              </small>
                                            </td>
                                            <td className="text-center">
                                              <div className="d-flex gap-1 justify-content-center">
                                                {stat.byDocumentType.devis
                                                  .count > 0 && (
                                                  <span
                                                    className="badge bg-primary"
                                                    title={`Devis: ${stat.byDocumentType.devis.count}`}
                                                  >
                                                    D:
                                                    {
                                                      stat.byDocumentType.devis
                                                        .count
                                                    }
                                                  </span>
                                                )}
                                                {stat.byDocumentType[
                                                  "bon-livraison"
                                                ].count > 0 && (
                                                  <span
                                                    className="badge bg-info"
                                                    title={`BL: ${stat.byDocumentType["bon-livraison"].count}`}
                                                  >
                                                    BL:
                                                    {
                                                      stat.byDocumentType[
                                                        "bon-livraison"
                                                      ].count
                                                    }
                                                  </span>
                                                )}
                                                {stat.byDocumentType.facture
                                                  .count > 0 && (
                                                  <span
                                                    className="badge bg-success"
                                                    title={`Factures: ${stat.byDocumentType.facture.count}`}
                                                  >
                                                    F:
                                                    {
                                                      stat.byDocumentType
                                                        .facture.count
                                                    }
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Detailed Products List */}
                    {allProductsData.products &&
                      allProductsData.products.length > 0 && (
                        <div className="row">
                          <div className="col-12">
                            <div className="card">
                              <div className="card-header">
                                <h6 className="card-title mb-0">
                                  <FiCalendar className="me-2" />
                                  Détail des Transactions (
                                  {allProductsData.products.length})
                                </h6>
                              </div>
                              <div className="card-body">
                                <div className="table-responsive">
                                  <table className="table table-hover">
                                    <thead>
                                      <tr>
                                        <th>Type</th>
                                        <th>Numéro</th>
                                        <th>Date</th>
                                        <th>Produit</th>
                                        <th>Quantité</th>
                                        <th>Prix Unitaire</th>
                                        <th>Total Ligne</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {allProductsData.products.map(
                                        (item, index) => (
                                          <tr key={index}>
                                            <td>
                                              <span className="d-flex align-items-center">
                                                {getDocumentIcon(
                                                  item.document_type,
                                                )}
                                                <span className="text-capitalize">
                                                  {item.document_type?.replace(
                                                    "-",
                                                    " ",
                                                  )}
                                                </span>
                                              </span>
                                            </td>
                                            <td>
                                              <strong>
                                                {item.document?.num}
                                              </strong>
                                              <div className="small text-muted">
                                                {item.document?.status}
                                              </div>
                                            </td>
                                            <td>
                                              <span className="d-flex align-items-center">
                                                <FiCalendar className="me-1 text-muted" />
                                                {formatDate(item.date_creation)}
                                              </span>
                                            </td>
                                            <td>
                                              <div>
                                                <strong>
                                                  {item.produit?.designation}
                                                </strong>
                                                <div className="small text-muted">
                                                  Ref: {item.produit?.reference}
                                                </div>
                                              </div>
                                            </td>
                                            <td>
                                              <span className="badge bg-primary">
                                                {parseQuantity(item.quantite)}
                                              </span>
                                            </td>
                                            <td>
                                              <strong>
                                                {formatCurrency(
                                                  item.prix_unitaire,
                                                )}
                                              </strong>
                                            </td>
                                            <td>
                                              <strong className="text-success">
                                                {formatCurrency(
                                                  item.total_ligne,
                                                )}
                                              </strong>
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                  </>
                ) : (
                  /* Initial State */
                  <div className="text-center py-5">
                    <FiPackage size={48} className="text-muted mb-3" />
                    <h5>Afficher Tous les Produits</h5>
                    <p className="text-muted mb-4">
                      Sélectionnez une période et un type de document pour voir
                      tous les produits achetés par ce client
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentStatusModal && (
        <ClientPaymentStatusModal
          clientId={id}
          clientName={client.nom_complete}
          onClose={() => setShowPaymentStatusModal(false)}
        />
      )}
    </div>
  );
}

export default ClientDetails;
