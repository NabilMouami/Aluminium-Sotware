import React, { useState, useEffect } from "react";
import Table from "@/components/shared/table/Table";
import axios from "axios";
import { config_url } from "@/utils/config";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import {
  FiEdit,
  FiTrash2,
  FiUser,
  FiPhone,
  FiMapPin,
  FiHome,
  FiHash,
  FiPackage,
  FiSave,
  FiX,
  FiUsers,
  FiDollarSign,
} from "react-icons/fi";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import api from "@/utils/axiosConfig";
import { Link } from "react-router-dom";

const MySwal = withReactContent(Swal);

const FornisseursList = () => {
  const [fornisseurs, setFornisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    withReference: 0,
    withAddress: 0,
  });
  const [editModal, setEditModal] = useState({
    show: false,
    fornisseur: null,
    formData: {},
    loading: false,
  });

  useEffect(() => {
    fetchFornisseurs();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [fornisseurs]);

  const fetchFornisseurs = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/fornisseurs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setFornisseurs(response.data?.fornisseurs || []);
      setError("");
    } catch (error) {
      console.error("Error fetching fornisseurs:", error);
      if (error.response?.status === 403) {
        setError("Access denied. Please check your permissions.");
      } else if (error.response?.status === 401) {
        setError("Please log in again.");
        localStorage.removeItem("token");
        window.location.href = "/login";
      } else {
        setError("Failed to fetch fornisseurs.");
      }
      setFornisseurs([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = fornisseurs.length;
    const withReference = fornisseurs.filter(
      (f) => f.reference && f.reference.trim() !== "",
    ).length;
    const withAddress = fornisseurs.filter(
      (f) => f.address && f.address.trim() !== "",
    ).length;

    setStats({
      total,
      withReference,
      withAddress,
    });
  };

  const handleDeleteFornisseur = async (fornisseurId, fornisseurName) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>{fornisseurName}</strong> ?
        </p>
      ),
      html: `
        <p>Êtes-vous sûr de vouloir supprimer ce fournisseur ?</p>
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
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        await api.delete(`/api/fornisseurs/${fornisseurId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setFornisseurs((prev) =>
          prev.filter((fornisseur) => fornisseur.id !== fornisseurId),
        );

        MySwal.fire({
          title: <p>Supprimé!</p>,
          text: `${fornisseurName} a été supprimé avec succès.`,
          icon: "success",
        });
      } catch (error) {
        console.error("Delete error:", error);
        MySwal.fire({
          title: <p>Erreur</p>,
          text:
            error.response?.data?.message ||
            "Échec de la suppression du fournisseur.",
          icon: "error",
        });
      }
    }
  };

  const handleEditClick = (fornisseur) => {
    setEditModal({
      show: true,
      fornisseur,
      formData: {
        nom_complete: fornisseur.nom_complete || "",
        reference: fornisseur.reference || "",
        telephone: fornisseur.telephone || "",
        ville: fornisseur.ville || "",
        address: fornisseur.address || "",
      },
      loading: false,
    });
  };

  const handleEditSubmit = async () => {
    if (!editModal.formData.nom_complete) {
      topTost("Le nom complet est requis", "error");
      return;
    }

    try {
      setEditModal((prev) => ({ ...prev, loading: true }));

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const response = await api.put(
        `/api/fornisseurs/${editModal.fornisseur.id}`,
        editModal.formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Update local state
      setFornisseurs((prev) =>
        prev.map((f) => {
          if (f.id === editModal.fornisseur.id) {
            return { ...f, ...editModal.formData };
          }
          return f;
        }),
      );

      MySwal.fire({
        title: "Succès!",
        text: "Fournisseur mis à jour avec succès",
        icon: "success",
      });

      setEditModal({
        show: false,
        fornisseur: null,
        formData: {},
        loading: false,
      });
    } catch (error) {
      console.error("Update error:", error);
      topTost(
        error.response?.data?.message ||
          "Erreur lors de la mise à jour du fournisseur",
        "error",
      );
      setEditModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Filter fornisseurs based on search term
  const filteredFornisseurs = fornisseurs.filter((fornisseur) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      fornisseur.nom_complete?.toLowerCase().includes(searchLower) ||
      fornisseur.telephone?.includes(searchTerm) ||
      fornisseur.reference?.toLowerCase().includes(searchLower) ||
      fornisseur.ville?.toLowerCase().includes(searchLower) ||
      fornisseur.address?.toLowerCase().includes(searchLower)
    );
  });

  const columns = [
    {
      accessorKey: "id",
      header: () => (
        <span>
          <FiHash className="me-2" />
          ID
        </span>
      ),
      cell: (info) => <span className="fw-semibold">#{info.getValue()}</span>,
    },
    {
      accessorKey: "reference",
      header: () => (
        <span>
          <FiHash className="me-2" />
          Référence
        </span>
      ),
      cell: (info) => {
        const reference = info.getValue();
        return reference ? (
          <span className="badge bg-primary bg-opacity-10 text-white fw-bold">
            {reference}
          </span>
        ) : (
          <span className="text-muted">-</span>
        );
      },
    },
    {
      accessorKey: "nom_complete",
      header: () => (
        <span>
          <FiUser className="me-2" />
          Nom Complet
        </span>
      ),
      cell: (info) => {
        const name = info.getValue();
        return (
          <div>
            <span className="fw-medium">{name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "telephone",
      header: () => (
        <span>
          <FiPhone className="me-2" />
          Téléphone
        </span>
      ),
      cell: (info) => {
        const phone = info.getValue();
        return phone ? (
          <a
            href={`tel:${phone}`}
            className="text-decoration-none text-primary"
          >
            {phone}
          </a>
        ) : (
          <span className="text-muted">-</span>
        );
      },
    },
    {
      accessorKey: "ville",
      header: () => (
        <span>
          <FiMapPin className="me-2" />
          Ville
        </span>
      ),
      cell: (info) => {
        const ville = info.getValue();
        return ville ? (
          <span className="badge bg-secondary bg-opacity-10 text-white">
            {ville}
          </span>
        ) : (
          <span className="text-muted">-</span>
        );
      },
    },
    {
      accessorKey: "address",
      header: () => (
        <span>
          <FiHome className="me-2" />
          Adresse
        </span>
      ),
      cell: (info) => {
        const address = info.getValue();
        return address ? (
          <div
            className="text-truncate"
            style={{ maxWidth: "200px" }}
            title={address}
          >
            {address}
          </div>
        ) : (
          <span className="text-muted">-</span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: () => "Date de création",
      cell: (info) => {
        const date = new Date(info.getValue());
        return date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      },
    },
    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => {
        const fornisseur = row.original;
        const { id, nom_complete } = fornisseur;

        return (
          <div className="hstack d-flex gap-2 justify-content-center">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleEditClick(fornisseur)}
              title="Modifier"
            >
              <FiEdit />
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleDeleteFornisseur(id, nom_complete)}
              title="Supprimer"
            >
              <FiTrash2 />
            </button>
            <Link
              to={`/produits?fornisseurId=${id}`}
              className="btn btn-sm btn-outline-info"
              title="Voir les produits"
            >
              <FiPackage />
            </Link>
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
            <p>Chargement des fournisseurs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="main-content">
        <PageHeader
          title="Gestion des Fournisseurs"
          subtitle="Liste complète de tous les fournisseurs"
          breadcrumb={[
            { label: "Dashboard", link: "/dashboard" },
            { label: "Fournisseurs", active: true },
          ]}
        >
          <Link to="/fornisseurs/create" className="btn btn-primary">
            <FiUser className="me-2" />
            Ajouter un Fournisseur
          </Link>
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
                        placeholder="Rechercher par nom, téléphone, référence, ville..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <i className="ri-search-line search-icon"></i>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={fetchFornisseurs}
                        title="Rafraîchir"
                      >
                        <i className="ri-refresh-line"></i> Rafraîchir
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
                <h5 className="card-title mb-0">Liste des Fournisseurs</h5>
              </div>
              <div className="card-body">
                {filteredFornisseurs.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="avatar-lg mx-auto mb-4">
                      <div className="avatar-title bg-light text-primary rounded-circle">
                        <FiUser className="fs-24" />
                      </div>
                    </div>
                    <h5>Aucun fournisseur trouvé</h5>
                    <p className="text-muted">
                      {searchTerm
                        ? "Aucun résultat pour votre recherche"
                        : "Commencez par ajouter votre premier fournisseur"}
                    </p>
                    {!searchTerm && (
                      <Link
                        to="/fornisseurs/create"
                        className="btn btn-primary"
                      >
                        <FiUser className="me-2" />
                        Ajouter un Fournisseur
                      </Link>
                    )}
                  </div>
                ) : (
                  <Table
                    data={filteredFornisseurs}
                    columns={columns}
                    searchable={false}
                    pagination={true}
                    pageSize={10}
                  />
                )}
              </div>
              {filteredFornisseurs.length > 0 && (
                <div className="card-footer">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <small className="text-muted">
                        Affichage de 1 à{" "}
                        {Math.min(filteredFornisseurs.length, 10)} sur{" "}
                        {filteredFornisseurs.length} fournisseurs
                      </small>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex justify-content-end gap-4">
                        <small className="text-muted">
                          <FiHash className="me-1" />
                          {stats.withReference} avec référence
                        </small>
                        <small className="text-muted">
                          <FiHome className="me-1" />
                          {stats.withAddress} avec adresse
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

      {/* Edit Fornisseur Modal */}
      {editModal.show && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FiEdit className="me-2" />
                  Modifier le fournisseur: {editModal.fornisseur.nom_complete}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() =>
                    setEditModal({
                      show: false,
                      fornisseur: null,
                      formData: {},
                      loading: false,
                    })
                  }
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">
                      Nom Complet <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editModal.formData.nom_complete}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            nom_complete: e.target.value,
                          },
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Référence/Code</label>
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
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Téléphone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={editModal.formData.telephone}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            telephone: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Ville</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editModal.formData.ville}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            ville: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Adresse</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editModal.formData.address}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            address: e.target.value,
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
                      fornisseur: null,
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

export default FornisseursList;
