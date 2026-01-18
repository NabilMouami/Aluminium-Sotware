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
} from "react-icons/fi";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import api from "@/utils/axiosConfig";
import { Link } from "react-router-dom";

const MySwal = withReactContent(Swal);

const FornisseursList = () => {
  const [fornisseurs, setFornisseurs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFornisseur, setSelectedFornisseur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    withReference: 0,
    withAddress: 0,
    totalProducts: 0,
  });

  useEffect(() => {
    fetchFornisseurs();
    fetchStats();
  }, []);

  const fetchFornisseurs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config_url}/api/fornisseurs`);
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

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${config_url}/api/fornisseurs/stats`);
      if (response.data?.statistics) {
        setStats({
          total: response.data.statistics.totalFornisseurs || 0,
          withReference: response.data.statistics.withReference || 0,
          withAddress: 0, // You might need to calculate this
          totalProducts: 0, // You might need a separate endpoint
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const handleEditFornisseur = (fornisseur) => {
    setSelectedFornisseur(fornisseur);
    toggleModal();
  };

  const handleSaveFornisseur = () => {
    fetchFornisseurs();
    fetchStats();
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
        await api.delete(`/api/fornisseurs/${fornisseurId}`);
        setFornisseurs((prev) =>
          prev.filter((fornisseur) => fornisseur.id !== fornisseurId)
        );

        MySwal.fire({
          title: <p>Supprimé!</p>,
          text: `${fornisseurName} a été supprimé avec succès.`,
          icon: "success",
        });

        // Refresh stats
        fetchStats();
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
      header: () => "ID",
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
      cell: (info) => (
        <a
          href={`tel:${info.getValue()}`}
          className="text-decoration-none text-primary"
        >
          {info.getValue()}
        </a>
      ),
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
              onClick={() => handleEditFornisseur(fornisseur)}
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

        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <p className="text-uppercase fw-medium text-muted mb-0">
                      Total Fournisseurs
                    </p>
                    <h4 className="mb-0">{stats.total}</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="avatar-sm rounded-circle bg-primary bg-opacity-10">
                      <FiUser className="avatar-title text-primary fs-24" />
                    </div>
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
                      Avec Référence
                    </p>
                    <h4 className="mb-0">{stats.withReference}</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="avatar-sm rounded-circle bg-success bg-opacity-10">
                      <FiHash className="avatar-title text-success fs-24" />
                    </div>
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
                      Avec Adresse
                    </p>
                    <h4 className="mb-0">
                      {
                        fornisseurs.filter(
                          (f) => f.address && f.address.trim() !== ""
                        ).length
                      }
                    </h4>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="avatar-sm rounded-circle bg-info bg-opacity-10">
                      <FiHome className="avatar-title text-info fs-24" />
                    </div>
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
                      Produits Associés
                    </p>
                    <h4 className="mb-0">{stats.totalProducts}</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="avatar-sm rounded-circle bg-warning bg-opacity-10">
                      <FiPackage className="avatar-title text-warning fs-24" />
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
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h5 className="card-title mb-0">Liste des Fournisseurs</h5>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex justify-content-end gap-2">
                      <div className="search-box me-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Rechercher fournisseur..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <i className="ri-search-line search-icon"></i>
                      </div>
                      <button
                        className="btn btn-outline-secondary"
                        onClick={fetchFornisseurs}
                        title="Rafraîchir"
                      >
                        <i className="ri-refresh-line"></i>
                      </button>
                    </div>
                  </div>
                </div>
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
                      <div className="d-flex justify-content-end">
                        <small className="text-muted">
                          <FiHash className="me-1" />
                          {stats.withReference} avec référence |{" "}
                          <FiHome className="me-1 ms-2" />
                          {
                            fornisseurs.filter(
                              (f) => f.address && f.address.trim() !== ""
                            ).length
                          }{" "}
                          avec adresse
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

      {/* Update Fornisseur Modal - You need to create this component */}
      {/* <UpdateFornisseurModal
        isOpen={isModalOpen}
        toggle={toggleModal}
        fornisseur={selectedFornisseur}
        onSave={handleSaveFornisseur}
      /> */}
    </>
  );
};

export default FornisseursList;
