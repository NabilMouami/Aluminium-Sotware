import React, { useState, useEffect } from "react";
import Table from "@/components/shared/table/Table";
import axios from "axios";
import { config_url } from "@/utils/config";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import {
  FiEdit,
  FiTrash2,
  FiUser,
  FiPhone,
  FiMapPin,
  FiHome,
  FiHash,
  FiSave,
  FiX,
  FiUsers,
  FiEye,
} from "react-icons/fi";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import api from "@/utils/axiosConfig";
import { Link } from "react-router-dom";

const MySwal = withReactContent(Swal);

const ClientsList = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editModal, setEditModal] = useState({
    show: false,
    client: null,
    formData: {},
    loading: false,
  });
  const navigate = useNavigate();
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/clients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setClients(response.data?.clients || []);
      setError("");
    } catch (error) {
      console.error("Error fetching clients:", error);
      if (error.response?.status === 403) {
        setError("Access denied. Please check your permissions.");
      } else if (error.response?.status === 401) {
        setError("Please log in again.");
        localStorage.removeItem("token");
        window.location.href = "/login";
      } else {
        setError("Failed to fetch clients.");
      }
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (clientId, clientName) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>{clientName}</strong> ?
        </p>
      ),
      html: `
        <p>Êtes-vous sûr de vouloir supprimer ce client ?</p>
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
        await api.delete(`/api/clients/${clientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setClients((prev) => prev.filter((client) => client.id !== clientId));

        MySwal.fire({
          title: <p>Supprimé!</p>,
          text: `${clientName} a été supprimé avec succès.`,
          icon: "success",
        });
      } catch (error) {
        console.error("Delete error:", error);
        MySwal.fire({
          title: <p>Erreur</p>,
          text:
            error.response?.data?.message ||
            "Échec de la suppression du client.",
          icon: "error",
        });
      }
    }
  };

  const handleEditClick = (client) => {
    setEditModal({
      show: true,
      client,
      formData: {
        nom_complete: client.nom_complete || "",
        reference: client.reference || "",
        telephone: client.telephone || "",
        ville: client.ville || "",
        address: client.address || "",
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
        `/api/clients/${editModal.client.id}`,
        editModal.formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Update local state
      setClients((prev) =>
        prev.map((client) => {
          if (client.id === editModal.client.id) {
            return { ...client, ...editModal.formData };
          }
          return client;
        }),
      );

      MySwal.fire({
        title: "Succès!",
        text: "Client mis à jour avec succès",
        icon: "success",
      });

      setEditModal({
        show: false,
        client: null,
        formData: {},
        loading: false,
      });
    } catch (error) {
      console.error("Update error:", error);
      topTost(
        error.response?.data?.message ||
          "Erreur lors de la mise à jour du client",
        "error",
      );
      setEditModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Filter clients based on search term
  const filteredClients = clients.filter((client) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      client.nom_complete?.toLowerCase().includes(searchLower) ||
      client.telephone?.includes(searchTerm) ||
      client.ville?.toLowerCase().includes(searchLower) ||
      client.address?.toLowerCase().includes(searchLower) ||
      client.reference?.toLowerCase().includes(searchLower)
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
      accessorKey: "reference",
      header: () => (
        <span>
          <FiHash className="me-2" />
          Référence
        </span>
      ),
      cell: (info) => {
        const reference = info.getValue();
        return (
          <div>
            <span className="fw-medium">{reference || "-"}</span>
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
          <a href={`tel:${phone}`} className="text-decoration-none">
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
          <span className="badge bg-secondary bg-opacity-10 text-white fw-bold">
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
        const client = row.original;
        const { id, nom_complete } = client;

        return (
          <div className="hstack d-flex gap-2 justify-content-center">
            <button
              className="btn btn-sm btn-outline-success"
              onClick={() => navigate(`/clients/${id}`)}
              title="Details"
            >
              <FiEye size={20} />
            </button>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleEditClick(client)}
              title="Modifier"
            >
              <FiEdit size={20} />
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleDeleteClient(id, nom_complete)}
              title="Supprimer"
            >
              <FiTrash2 size={20} />
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
            <p>Chargement des clients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="main-content">
        <PageHeader
          title="Gestion des Clients"
          subtitle="Liste complète de tous les clients"
          breadcrumb={[
            { label: "Dashboard", link: "/dashboard" },
            { label: "Clients", active: true },
          ]}
        >
          <Link to="/clients/create" className="btn btn-primary">
            <FiUser className="me-2" />
            Ajouter un Client
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

        {/* Stats Cards */}
        <div className="row mt-4 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <p className="text-uppercase fw-medium text-muted mb-0">
                      Total Clients
                    </p>
                    <h4 className="mb-0">{clients.length}</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <FiUsers className="avatar-title text-primary fs-24" />
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
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h5 className="card-title mb-0">Liste des Clients</h5>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex justify-content-end">
                      <div className="search-box me-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Rechercher client..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <i className="ri-search-line search-icon"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="avatar-lg mx-auto mb-4">
                      <div className="avatar-title bg-light text-primary rounded-circle">
                        <FiUser className="fs-24" />
                      </div>
                    </div>
                    <h5>Aucun client trouvé</h5>
                    <p className="text-muted">
                      {searchTerm
                        ? "Aucun résultat pour votre recherche"
                        : "Commencez par ajouter votre premier client"}
                    </p>
                    {!searchTerm && (
                      <Link to="/clients/create" className="btn btn-primary">
                        <FiUser className="me-2" />
                        Ajouter un Client
                      </Link>
                    )}
                  </div>
                ) : (
                  <Table
                    data={filteredClients}
                    columns={columns}
                    searchable={false}
                    pagination={true}
                    pageSize={10}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Client Modal */}
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
                  Modifier le client: {editModal.client.nom_complete}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() =>
                    setEditModal({
                      show: false,
                      client: null,
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
                      client: null,
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

export default ClientsList;
