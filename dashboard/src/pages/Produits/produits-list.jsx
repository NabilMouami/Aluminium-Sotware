import React, { useState, useEffect } from "react";
import Table from "@/components/shared/table/Table";
import axios from "axios";
import { config_url } from "@/utils/config";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import {
  FiEdit,
  FiTrash2,
  FiPackage,
  FiHash,
  FiTag,
  FiDollarSign,
  FiUser,
  FiBarChart2,
  FiPlus,
  FiMinus,
  FiShoppingCart,
  FiSave,
  FiX,
} from "react-icons/fi";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import api from "@/utils/axiosConfig";

const MySwal = withReactContent(Swal);

const ProduitsList = () => {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    totalValue: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [selectedFornisseur, setSelectedFornisseur] = useState("all");
  const [fornisseurs, setFornisseurs] = useState([]);
  const [stockOperation, setStockOperation] = useState({
    show: false,
    produit: null,
    operation: "add",
    quantity: "",
  });
  const [editModal, setEditModal] = useState({
    show: false,
    produit: null,
    formData: {},
    loading: false,
  });

  useEffect(() => {
    fetchProduits();
    fetchFornisseurs();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [produits]);

  const fetchProduits = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/produits`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProduits(response.data?.produits || []);
      setError("");
    } catch (error) {
      console.error("Error fetching produits:", error);
      if (error.response?.status === 403) {
        setError("Access denied. Please check your permissions.");
      } else if (error.response?.status === 401) {
        setError("Please log in again.");
        localStorage.removeItem("token");
        window.location.href = "/login";
      } else {
        setError("Failed to fetch produits.");
      }
      setProduits([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFornisseurs = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/fornisseurs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setFornisseurs(response.data?.fornisseurs || []);
    } catch (error) {
      console.error("Error fetching fornisseurs:", error);
    }
  };

  const calculateStats = () => {
    const total = produits.length;
    const totalValue = produits.reduce(
      (sum, p) => sum + p.qty * p.prix_achat,
      0
    );
    const lowStock = produits.filter((p) => p.qty > 0 && p.qty < 10).length;
    const outOfStock = produits.filter((p) => p.qty === 0).length;

    setStats({
      total,
      totalValue: totalValue.toFixed(2),
      lowStock,
      outOfStock,
    });
  };

  const handleDeleteProduit = async (produitId, produitName) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>{produitName}</strong> ?
        </p>
      ),
      html: `
        <p>Êtes-vous sûr de vouloir supprimer ce produit ?</p>
        <p class="text-danger"><small>Cette action est irréversible.</small></p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer!",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/produits/${produitId}`);
        setProduits((prev) => prev.filter((p) => p.id !== produitId));

        MySwal.fire({
          title: <p>Supprimé!</p>,
          text: `${produitName} a été supprimé avec succès.`,
          icon: "success",
        });
      } catch (error) {
        console.error("Delete error:", error);
        MySwal.fire({
          title: <p>Erreur</p>,
          text:
            error.response?.data?.message ||
            "Échec de la suppression du produit.",
          icon: "error",
        });
      }
    }
  };

  const handleEditClick = (produit) => {
    setEditModal({
      show: true,
      produit,
      formData: {
        reference: produit.reference,
        designation: produit.designation,
        prix_achat: produit.prix_achat,
        prix_vente: produit.prix_vente,
        qty: produit.qty,
        fornisseurId: produit.fornisseurId || "",
        description: produit.description || "",
      },
      loading: false,
    });
  };

  const handleEditSubmit = async () => {
    if (!editModal.formData.reference || !editModal.formData.designation) {
      topTost("Veuillez remplir tous les champs obligatoires", "error");
      return;
    }

    if (
      parseFloat(editModal.formData.prix_vente) <=
      parseFloat(editModal.formData.prix_achat)
    ) {
      topTost("Le prix de vente doit être supérieur au prix d'achat", "error");
      return;
    }

    try {
      setEditModal((prev) => ({ ...prev, loading: true }));

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const response = await api.put(
        `/api/produits/${editModal.produit.id}`,
        editModal.formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setProduits((prev) =>
        prev.map((p) => {
          if (p.id === editModal.produit.id) {
            return { ...p, ...editModal.formData };
          }
          return p;
        })
      );

      MySwal.fire({
        title: "Succès!",
        text: "Produit mis à jour avec succès",
        icon: "success",
      });

      setEditModal({
        show: false,
        produit: null,
        formData: {},
        loading: false,
      });
    } catch (error) {
      console.error("Update error:", error);
      topTost(
        error.response?.data?.message ||
          "Erreur lors de la mise à jour du produit",
        "error"
      );
      setEditModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleStockOperation = (produit, operation) => {
    setStockOperation({
      show: true,
      produit,
      operation,
      quantity: "",
    });
  };

  const confirmStockUpdate = async () => {
    if (!stockOperation.quantity || parseInt(stockOperation.quantity) <= 0) {
      topTost("Veuillez entrer une quantité valide", "error");
      return;
    }

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      await api.patch(
        `/api/produits/${stockOperation.produit.id}/stock`,
        {
          qty: stockOperation.quantity,
          operation: stockOperation.operation,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setProduits((prev) =>
        prev.map((p) => {
          if (p.id === stockOperation.produit.id) {
            let newQty;
            switch (stockOperation.operation) {
              case "add":
                newQty = p.qty + parseInt(stockOperation.quantity);
                break;
              case "subtract":
                newQty = p.qty - parseInt(stockOperation.quantity);
                break;
              case "set":
                newQty = parseInt(stockOperation.quantity);
                break;
              default:
                newQty = p.qty;
            }
            return { ...p, qty: newQty };
          }
          return p;
        })
      );

      MySwal.fire({
        title: "Succès!",
        text: "Stock mis à jour avec succès",
        icon: "success",
      });

      setStockOperation({
        show: false,
        produit: null,
        operation: "add",
        quantity: "",
      });
    } catch (error) {
      console.error("Stock update error:", error);
      topTost(
        error.response?.data?.message ||
          "Erreur lors de la mise à jour du stock",
        "error"
      );
    }
  };

  // Filter produits
  const filteredProduits = produits.filter((produit) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        produit.reference?.toLowerCase().includes(searchLower) ||
        produit.designation?.toLowerCase().includes(searchLower) ||
        produit.fornisseur?.nom_complete?.toLowerCase().includes(searchLower) ||
        produit.fornisseur?.reference?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }

    // Fornisseur filter
    if (
      selectedFornisseur !== "all" &&
      produit.fornisseurId != selectedFornisseur
    ) {
      return false;
    }

    return true;
  });

  const columns = [
    {
      accessorKey: "reference",
      header: () => (
        <span>
          <FiHash className="me-2" />
          Référence
        </span>
      ),
      cell: (info) => <span className="fw-semibold">{info.getValue()}</span>,
    },
    {
      accessorKey: "designation",
      header: () => (
        <span>
          <FiPackage className="me-2" />
          Désignation
        </span>
      ),
      cell: (info) => {
        const designation = info.getValue();
        return (
          <div
            className="text-truncate"
            style={{ maxWidth: "250px" }}
            title={designation}
          >
            {designation}
          </div>
        );
      },
    },
    {
      accessorKey: "qty",
      header: () => (
        <span>
          <FiTag className="me-2" />
          Stock
        </span>
      ),
      cell: (info) => {
        const qty = info.getValue();
        let badgeClass = "success";
        if (qty === 0) badgeClass = "danger";
        else if (qty < 10) badgeClass = "warning";

        return (
          <div className="d-flex align-items-center gap-2">
            <span className={`badge bg-${badgeClass} bg-opacity-10 text-white`}>
              {qty} unités
            </span>
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-outline-success btn-sm"
                onClick={() => handleStockOperation(info.row.original, "add")}
                title="Ajouter au stock"
              >
                <FiPlus size={12} />
              </button>
              <button
                className="btn btn-outline-warning btn-sm"
                onClick={() =>
                  handleStockOperation(info.row.original, "subtract")
                }
                title="Retirer du stock"
                disabled={qty === 0}
              >
                <FiMinus size={12} />
              </button>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "prix_achat",
      header: () => (
        <span>
          <FiDollarSign className="me-2" />
          Prix Achat
        </span>
      ),
      cell: (info) => (
        <span className="fw-medium">
          {parseFloat(info.getValue()).toFixed(2)} DH
        </span>
      ),
    },
    {
      accessorKey: "prix_vente",
      header: () => (
        <span>
          <FiDollarSign className="me-2" />
          Prix Vente
        </span>
      ),
      cell: (info) => (
        <span className="fw-bold text-success">
          {parseFloat(info.getValue()).toFixed(2)} DH
        </span>
      ),
    },
    {
      accessorKey: "marge",
      header: () => (
        <span>
          <FiBarChart2 className="me-2" />
          Marge
        </span>
      ),
      cell: (info) => {
        const produit = info.row.original;
        const marge = produit.prix_vente - produit.prix_achat;
        const pourcentage = ((marge / produit.prix_achat) * 100).toFixed(1);
        return (
          <div>
            <div className="fw-medium">{marge.toFixed(2)} DH</div>
            <small className="text-muted">{pourcentage}%</small>
          </div>
        );
      },
    },
    {
      accessorKey: "fornisseur.nom_complete",
      header: () => (
        <span>
          <FiUser className="me-2" />
          Fournisseur
        </span>
      ),
      cell: (info) => {
        const fornisseur = info.row.original.fornisseur;
        return fornisseur ? (
          <div>
            <div className="fw-medium">{fornisseur.nom_complete}</div>
            {fornisseur.telephone && (
              <small className="text-muted">{fornisseur.telephone}</small>
            )}
          </div>
        ) : (
          <span className="text-muted">-</span>
        );
      },
    },
    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => {
        const produit = row.original;
        const { id, reference, designation } = produit;

        return (
          <div className="hstack d-flex gap-2 justify-content-center">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleEditClick(produit)}
              title="Modifier"
            >
              <FiEdit />
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() =>
                handleDeleteProduit(id, `${reference} - ${designation}`)
              }
              title="Supprimer"
            >
              <FiTrash2 />
            </button>
          </div>
        );
      },
      meta: {
        headerClassName: "text-center",
      },
    },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="main-content">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "300px" }}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Chargement des produits...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="main-content">
        <PageHeader
          title="Gestion des Produits"
          subtitle="Liste complète de tous les produits"
          breadcrumb={[
            { label: "Dashboard", link: "/dashboard" },
            { label: "Produits", active: true },
          ]}
        >
          <button
            onClick={() => {
              // For adding new product, you might want to keep navigation or create another modal
              // For now, I'll keep it as is, but you can modify to open a create modal
              window.location.href = "/produits/create";
            }}
            className="btn btn-primary"
          >
            <FiPackage className="me-2" />
            Ajouter un Produit
          </button>
        </PageHeader>

        {error && (
          <div
            className="alert alert-danger alert-dismissible fade show"
            role="alert"
          >
            <strong>Erreur!</strong> {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError("")}
            ></button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="row mt-4 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <p className="text-uppercase fw-medium text-muted mb-0">
                      Total Produits
                    </p>
                    <h4 className="mb-0">{stats.total}</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <FiPackage className="avatar-title text-primary fs-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <p className="text-uppercase fw-medium text-muted mb-0">
                      Valeur Stock
                    </p>
                    <h4 className="mb-0">{stats.totalValue} DH</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <FiDollarSign className="avatar-title text-success fs-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <p className="text-uppercase fw-medium text-muted mb-0">
                      Stock Bas
                    </p>
                    <h4 className="mb-0">{stats.lowStock}</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <FiShoppingCart className="avatar-title text-warning fs-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <p className="text-uppercase fw-medium text-muted mb-0">
                      Rupture
                    </p>
                    <h4 className="mb-0">{stats.outOfStock}</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <FiTag className="avatar-title text-danger fs-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="search-box">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Rechercher par référence, désignation ou fournisseur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <i className="ri-search-line search-icon"></i>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex gap-2">
                      <select
                        className="form-select"
                        value={selectedFornisseur}
                        onChange={(e) => setSelectedFornisseur(e.target.value)}
                      >
                        <option value="all">Tous les fournisseurs</option>
                        {fornisseurs.map((fornisseur) => (
                          <option key={fornisseur.id} value={fornisseur.id}>
                            {fornisseur.nom_complete}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-outline-secondary"
                        onClick={fetchProduits}
                        title="Rafraîchir"
                      >
                        <i className="ri-refresh-line"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Liste des Produits</h5>
              </div>
              <div className="card-body">
                {filteredProduits.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="avatar-lg mx-auto mb-4">
                      <div className="avatar-title bg-light text-primary rounded-circle">
                        <FiPackage className="fs-24" />
                      </div>
                    </div>
                    <h5>Aucun produit trouvé</h5>
                    <p className="text-muted">
                      {searchTerm || selectedFornisseur !== "all"
                        ? "Aucun résultat pour votre recherche"
                        : "Commencez par ajouter votre premier produit"}
                    </p>
                    {!searchTerm && selectedFornisseur === "all" && (
                      <button
                        onClick={() => {
                          window.location.href = "/produits/create";
                        }}
                        className="btn btn-primary"
                      >
                        <FiPackage className="me-2" />
                        Ajouter un Produit
                      </button>
                    )}
                  </div>
                ) : (
                  <Table
                    data={filteredProduits}
                    columns={columns}
                    searchable={false}
                    pagination={true}
                    pageSize={10}
                  />
                )}
              </div>
              {filteredProduits.length > 0 && (
                <div className="card-footer">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <small className="text-muted">
                        Affichage de 1 à {Math.min(filteredProduits.length, 10)}{" "}
                        sur {filteredProduits.length} produits
                      </small>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex justify-content-end gap-4">
                        <small className="text-muted">
                          <FiShoppingCart className="me-1" />
                          {stats.lowStock} stock bas
                        </small>
                        <small className="text-muted">
                          <FiTag className="me-1" />
                          {stats.outOfStock} rupture
                        </small>
                        <small className="text-muted">
                          <FiDollarSign className="me-1" />
                          {stats.totalValue} DH valeur stock
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editModal.show && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FiEdit className="me-2" />
                  Modifier le produit: {editModal.produit.reference}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() =>
                    setEditModal({
                      show: false,
                      produit: null,
                      formData: {},
                      loading: false,
                    })
                  }
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Référence <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editModal.formData.reference}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            reference: e.target.value,
                          },
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Fournisseur</label>
                    <select
                      className="form-select"
                      value={editModal.formData.fornisseurId}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            fornisseurId: e.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {fornisseurs.map((fornisseur) => (
                        <option key={fornisseur.id} value={fornisseur.id}>
                          {fornisseur.nom_complete}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      Désignation <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editModal.formData.designation}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            designation: e.target.value,
                          },
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">
                      Prix d'achat (DH) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={editModal.formData.prix_achat}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            formData: {
                              ...prev.formData,
                              prix_achat: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        required
                      />
                      <span className="input-group-text">DH</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">
                      Prix de vente (DH) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={editModal.formData.prix_vente}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            formData: {
                              ...prev.formData,
                              prix_vente: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        required
                      />
                      <span className="input-group-text">DH</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Stock actuel</label>
                    <div className="input-group">
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editModal.formData.qty}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            formData: {
                              ...prev.formData,
                              qty: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                      <span className="input-group-text">unités</span>
                    </div>
                    <small className="text-muted">
                      Marge:{" "}
                      {(
                        ((editModal.formData.prix_vente -
                          editModal.formData.prix_achat) /
                          editModal.formData.prix_achat) *
                          100 || 0
                      ).toFixed(1)}
                      %
                    </small>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={editModal.formData.description}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            description: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setEditModal({
                      show: false,
                      produit: null,
                      formData: {},
                      loading: false,
                    })
                  }
                  disabled={editModal.loading}
                >
                  <FiX className="me-2" />
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEditSubmit}
                  disabled={editModal.loading}
                >
                  {editModal.loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <FiSave className="me-2" />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Operation Modal */}
      {stockOperation.show && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {stockOperation.operation === "add"
                    ? "Ajouter au stock"
                    : stockOperation.operation === "subtract"
                    ? "Retirer du stock"
                    : "Définir le stock"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() =>
                    setStockOperation({
                      show: false,
                      produit: null,
                      operation: "add",
                      quantity: "",
                    })
                  }
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Produit: <strong>{stockOperation.produit.reference}</strong>
                  <br />
                  Stock actuel:{" "}
                  <strong>{stockOperation.produit.qty} unités</strong>
                </p>
                <div className="mb-3">
                  <label className="form-label">
                    Quantité{" "}
                    {stockOperation.operation === "add"
                      ? "à ajouter"
                      : stockOperation.operation === "subtract"
                      ? "à retirer"
                      : "du nouveau stock"}
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={stockOperation.quantity}
                    onChange={(e) =>
                      setStockOperation((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setStockOperation({
                      show: false,
                      produit: null,
                      operation: "add",
                      quantity: "",
                    })
                  }
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmStockUpdate}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper function for toast notifications
const topTost = (message, type = "success") => {
  const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  toast.fire({
    icon: type,
    title: message,
  });
};

export default ProduitsList;
