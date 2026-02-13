import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { config_url } from "@/utils/config";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import topTost from "@/utils/topTost";

// Icons
import {
  FiUser,
  FiFileText,
  FiShoppingBag,
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
  FiTruck,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiRefreshCw,
} from "react-icons/fi";

function FornisseurDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fornisseur, setFornisseur] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // State for product search by reference
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchData, setProductSearchData] = useState(null);
  const [searchParams, setSearchParams] = useState({
    reference: "",
    exactMatch: false,
    startDate: "",
    endDate: "",
    includeBonAchatDetails: false,
  });
  const [searchHistory, setSearchHistory] = useState([]);

  // State for all products view
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [allProductsData, setAllProductsData] = useState(null);
  const [allProductsLoading, setAllProductsLoading] = useState(false);
  const [allProductsDateRange, setAllProductsDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  // Fetch fornisseur data
  useEffect(() => {
    fetchFornisseurData();
  }, [id]);

  const fetchFornisseurData = async () => {
    try {
      setLoading(true);

      // Fetch fornisseur details
      const fornisseurRes = await axios.get(
        `${config_url}/api/fornisseurs/${id}`,
        {
          withCredentials: true,
        },
      );
      setFornisseur(fornisseurRes.data.fornisseur);

      // Fetch fornisseur BonAchats summary
      try {
        const summaryRes = await axios.get(
          `${config_url}/api/fornisseurs/${id}/bon-achats/stats`,
          { withCredentials: true },
        );
        setSummary(summaryRes.data);
      } catch (error) {
        console.log("No summary endpoint available, using fallback");
      }

      // Fetch recent BonAchats
      const recentRes = await axios.get(
        `${config_url}/api/fornisseurs/${id}/bon-achats/recent`,
        { withCredentials: true },
      );
      setHistory(recentRes.data.recentBonAchats || []);
    } catch (error) {
      console.error("Error fetching fornisseur data:", error);
      topTost(
        error.response?.data?.message || "Error loading fornisseur data",
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

      const params = {
        reference: searchParams.reference.trim(),
      };

      if (searchParams.exactMatch === true) {
        params.exactMatch = "true";
      }
      if (searchParams.startDate) {
        params.startDate = searchParams.startDate;
      }
      if (searchParams.endDate) {
        params.endDate = searchParams.endDate;
      }
      if (searchParams.includeBonAchatDetails === true) {
        params.includeBonAchatDetails = "true";
      }

      const response = await axios.get(
        `${config_url}/api/fornisseurs/${id}/product-history`,
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

      setSearchHistory((prev) => [
        {
          reference: searchParams.reference.trim(),
          exactMatch: searchParams.exactMatch,
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

  // Fetch all products with date range
  const fetchAllProducts = async () => {
    try {
      setAllProductsLoading(true);

      const params = {};

      if (allProductsDateRange.startDate) {
        params.startDate = allProductsDateRange.startDate
          .toISOString()
          .split("T")[0];
      }
      if (allProductsDateRange.endDate) {
        params.endDate = allProductsDateRange.endDate
          .toISOString()
          .split("T")[0];
      }

      console.log("Fetching all products with params:", params);

      const response = await axios.get(
        `${config_url}/api/fornisseurs/${id}/products-by-date-range`,
        {
          params,
          withCredentials: true,
        },
      );

      console.log("All products response:", response.data);
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

  // Clear product search
  const clearProductSearch = () => {
    setProductSearchData(null);
    setShowProductSearch(false);
    setSearchParams({
      reference: "",
      exactMatch: false,
      startDate: "",
      endDate: "",
      includeBonAchatDetails: false,
    });
  };

  // Clear all products filters
  const clearAllProductsFilters = () => {
    setAllProductsDateRange({
      startDate: null,
      endDate: null,
    });
    setAllProductsData(null);
  };

  // Load previous search
  const loadPreviousSearch = (search) => {
    setSearchParams({
      reference: search.reference,
      exactMatch: search.exactMatch,
      startDate: search.startDate || "",
      endDate: search.endDate || "",
      includeBonAchatDetails: search.includeBonAchatDetails || false,
    });
    setTimeout(() => handleProductSearch(), 100);
  };

  // Filter history based on selected filters
  const filteredHistory = history.filter((doc) => {
    if (filterStatus !== "all" && doc.status !== filterStatus) return false;
    return true;
  });

  // Get status badge color for BonAchat
  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-danger text-white",
      commandé: "bg-info text-white",
      partiellement_reçu: "bg-warning text-dark",
      reçu: "bg-success text-white",
      partiellement_payée: "bg-orange text-white",
      payé: "bg-success text-white",
      annulé: "bg-danger text-white",
    };
    return colors[status] || "bg-light text-dark";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Non Payé",
      commandé: "Commandé",
      partiellement_reçu: "Partiellement Reçu",
      reçu: "Reçu",
      partiellement_payée: "Partiellement Payé",
      payé: "Payé",
      annulé: "Annulé",
    };
    return texts[status] || status;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "payé":
      case "reçu":
        return <FiCheckCircle className="me-1" />;
      case "brouillon":
        return <FiClock className="me-1" />;
      case "partiellement_payée":
      case "partiellement_reçu":
        return <FiPercent className="me-1" />;
      case "annulé":
        return <FiXCircle className="me-1" />;
      case "commandé":
        return <FiShoppingBag className="me-1" />;
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

  // Handle BonAchat view
  const handleViewBonAchat = (bonAchatId) => {
    navigate(`/bon-achat/${bonAchatId}`);
  };

  // Safe quantity parsing
  const parseQuantity = (qty) => {
    if (typeof qty === "number") return qty;
    if (typeof qty === "string") return parseFloat(qty) || 0;
    return 0;
  };

  // Format currency
  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "0,00 Dh";
    return `${num.toFixed(2)} Dh`;
  };

  // Calculate summary if not available from API
  const calculateSummary = () => {
    if (!history.length) return null;

    const stats = {
      totalBonAchats: history.length,
      totalAmountTTC: history.reduce(
        (sum, ba) => sum + parseFloat(ba.montant_ttc || 0),
        0,
      ),
      totalAmountHT: history.reduce(
        (sum, ba) => sum + parseFloat(ba.montant_ht || 0),
        0,
      ),
      totalDiscount: history.reduce(
        (sum, ba) => sum + parseFloat(ba.remise || 0),
        0,
      ),
      statusCounts: {},
      paymentMethodCounts: {},
    };

    history.forEach((ba) => {
      stats.statusCounts[ba.status] = (stats.statusCounts[ba.status] || 0) + 1;
      stats.paymentMethodCounts[ba.mode_reglement] =
        (stats.paymentMethodCounts[ba.mode_reglement] || 0) + 1;
    });

    return stats;
  };

  const summaryStats = summary || calculateSummary();

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
                  Chargement des informations fournisseur...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!fornisseur) {
    return (
      <div className="main-content">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <h4>Fournisseur non trouvé</h4>
                <p className="text-muted">
                  Le fournisseur que vous recherchez n'existe pas.
                </p>
                <button
                  className="btn btn-primary mt-3"
                  onClick={() => navigate("/fornisseurs")}
                >
                  Retour à la liste des fournisseurs
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
      {/* Fornisseur Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="card-title mb-1">
                    <FiUser className="me-2" />
                    {fornisseur.nom_complete}
                  </h4>
                  <p className="text-muted mb-0">
                    Référence: {fornisseur.reference || "Non spécifiée"}
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
                </div>
              </div>

              <div className="row mt-3">
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <FiPhone className="me-2 text-muted" />
                    <span>{fornisseur.telephone}</span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <FiMapPin className="me-2 text-muted" />
                    <span>{fornisseur.ville || "Ville non spécifiée"}</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <FiBox className="me-2 text-muted" />
                    <span>{fornisseur.address || "Adresse non spécifiée"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Products View Panel */}
      {showAllProducts && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <FiPackage className="me-2" />
                  Tous les Produits Achetés
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
                  allProductsDateRange.endDate) && (
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
                                          Prix Moy.
                                        </th>
                                        <th className="text-center">
                                          Première
                                        </th>
                                        <th className="text-center">
                                          Dernière
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
                                              {formatCurrency(
                                                stat.averageUnitPrice,
                                              )}
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
                                  Détail des Achats (
                                  {allProductsData.products.length})
                                </h6>
                              </div>
                              <div className="card-body">
                                <div className="table-responsive">
                                  <table className="table table-hover">
                                    <thead>
                                      <tr>
                                        <th>Numéro BA</th>
                                        <th>Date</th>
                                        <th>Produit</th>
                                        <th>Quantité</th>
                                        <th>Prix Unitaire</th>
                                        <th>Total Ligne</th>
                                        <th>Statut</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {allProductsData.products.map(
                                        (item, index) => (
                                          <tr key={index}>
                                            <td>
                                              <strong>
                                                {item.document?.num}
                                              </strong>
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
                                            <td>
                                              <span
                                                className={`badge ${getStatusColor(item.document?.status)}`}
                                              >
                                                {getStatusIcon(
                                                  item.document?.status,
                                                )}
                                                {getStatusText(
                                                  item.document?.status,
                                                )}
                                              </span>
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
                      Sélectionnez une période pour voir tous les produits
                      achetés auprès de ce fournisseur
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Search Panel - keeping your existing code */}
      {showProductSearch && (
        // ... your existing product search panel code ...
        <div className="row mb-4">
          {/* Keep all your existing product search code here */}
        </div>
      )}

      {/* Recent BonAchats - Only show when NOT in product search or all products mode */}
      {!showProductSearch && !showAllProducts && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <FiShoppingBag className="me-2" />
                  Bons d'Achat Récents
                </h5>
                <div className="d-flex gap-2">
                  <select
                    className="form-select form-select-sm w-auto"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="brouillon">Non Payé</option>
                    <option value="commandé">Commandé</option>
                    <option value="partiellement_reçu">
                      Partiellement Reçu
                    </option>
                    <option value="reçu">Reçu</option>
                    <option value="partiellement_payée">
                      Partiellement Payé
                    </option>
                    <option value="payé">Payé</option>
                    <option value="annulé">Annulé</option>
                  </select>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={fetchFornisseurData}
                  >
                    <FiRefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div className="card-body">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-5">
                    <FiShoppingBag size={48} className="text-muted mb-3" />
                    <h5>Aucun bon d'achat trouvé</h5>
                    <p className="text-muted">
                      Aucun bon d'achat ne correspond aux filtres sélectionnés
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Numéro</th>
                          <th>Date</th>
                          <th>Montant HT</th>
                          <th>Montant TTC</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((bonAchat, index) => (
                          <tr key={index}>
                            <td>
                              <strong>{bonAchat.num_bon_achat}</strong>
                            </td>
                            <td>
                              <span className="d-flex align-items-center">
                                <FiCalendar className="me-1 text-muted" />
                                {formatDate(bonAchat.date_creation)}
                              </span>
                            </td>
                            <td>
                              <span className="fw-semibold">
                                {formatCurrency(bonAchat.montant_ht)}
                              </span>
                            </td>
                            <td>
                              <span className="fw-semibold">
                                {formatCurrency(bonAchat.montant_ttc)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${getStatusColor(bonAchat.status)}`}
                              >
                                {getStatusIcon(bonAchat.status)}
                                {getStatusText(bonAchat.status)}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() =>
                                    handleViewBonAchat(bonAchat.id)
                                  }
                                  title="Voir"
                                >
                                  <FiEye size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FornisseurDetails;
