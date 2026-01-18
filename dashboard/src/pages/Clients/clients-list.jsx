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
} from "react-icons/fi";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import api from "@/utils/axiosConfig";
import { Link } from "react-router-dom";

const MySwal = withReactContent(Swal);

const ClientsList = () => {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config_url}/api/clients`);
      // Make sure we have an array, even if empty
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

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const handleEditClient = (client) => {
    setSelectedClient(client);
    toggleModal();
  };

  const handleSaveClient = () => {
    // Refresh the clients list after update
    fetchClients();
  };

  const handleDeleteClient = async (clientId, clientName) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Delete <strong>{clientName}</strong>?
        </p>
      ),
      text: "Are you sure you want to delete this client? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/clients/${clientId}`);
        setClients((prevClients) =>
          prevClients.filter((client) => client.id !== clientId)
        );

        MySwal.fire({
          title: <p>Deleted!</p>,
          text: `${clientName} has been deleted successfully.`,
          icon: "success",
        });
      } catch (error) {
        console.error("Delete error:", error);
        MySwal.fire({
          title: <p>Error</p>,
          text: error.response?.data?.message || "Failed to delete the client.",
          icon: "error",
        });
      }
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
      client.address?.toLowerCase().includes(searchLower)
    );
  });

  const columns = [
    {
      accessorKey: "id",
      header: () => "ID",
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
      accessorKey: "telephone",
      header: () => (
        <span>
          <FiPhone className="me-2" />
          Téléphone
        </span>
      ),
      cell: (info) => (
        <a href={`tel:${info.getValue()}`} className="text-decoration-none">
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
      cell: (info) => (
        <span className="badge bg-secondary bg-opacity-10 text-white fw-bold">
          {info.getValue() || "Non spécifiée"}
        </span>
      ),
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
        return (
          <div
            className="text-truncate"
            style={{ maxWidth: "200px" }}
            title={address}
          >
            {address || "Non spécifiée"}
          </div>
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
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleEditClient(client)}
              title="Modifier"
            >
              <FiEdit />
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleDeleteClient(id, nom_complete)}
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
        <div className="row mb-4">
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
                      Avec Adresse
                    </p>
                    <h4 className="mb-0">
                      {
                        clients.filter(
                          (c) => c.address && c.address.trim() !== ""
                        ).length
                      }
                    </h4>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="avatar-sm rounded-circle bg-success bg-opacity-10">
                      <FiHome className="avatar-title text-success fs-24" />
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
                    searchable={false} // We have our own search
                    pagination={true}
                    pageSize={10}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Client Modal - You need to create this component */}
      {/* <UpdateClientModal
        isOpen={isModalOpen}
        toggle={toggleModal}
        client={selectedClient}
        onSave={handleSaveClient}
      /> */}
    </>
  );
};

export default ClientsList;
