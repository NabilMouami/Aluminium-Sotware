import React, { useState, useEffect } from "react";
import Table from "@/components/shared/table/Table";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { UpdateUserModal } from "./updateUser";
import api from "@/utils/axiosConfig";

const MySwal = withReactContent(Swal);

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/users");
        // Make sure we have an array, even if empty
        setUsers(response.data?.users || []);
        setError("");
      } catch (error) {
        console.error("Error fetching users:", error);
        if (error.response?.status === 403) {
          setError("Access denied. Admin privileges required.");
        } else if (error.response?.status === 401) {
          setError("Please log in again.");
          localStorage.removeItem("token");
          window.location.href = "/login";
        } else {
          setError("Failed to fetch users.");
        }
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    toggleModal();
  };

  const handleSaveUser = () => {
    // Refresh the users list after update
    fetchUsers();
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/api/users");
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error("Error refreshing users:", error);
      setUsers([]);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Delete <strong>{userName}</strong>?
        </p>
      ),
      text: "Are you sure you want to delete this user?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/auth/${userId}`);
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));

        MySwal.fire({
          title: <p>Deleted!</p>,
          text: `${userName} has been deleted.`,
          icon: "success",
        });
      } catch (error) {
        console.error("Delete error:", error);
        MySwal.fire({
          title: <p>Error</p>,
          text: error.response?.data?.message || "Failed to delete the user.",
          icon: "error",
        });
      }
    }
  };

  const columns = [
    {
      accessorKey: "id",
      header: () => "ID",
      cell: (info) => <span>{info.getValue()}</span>,
    },
    {
      accessorKey: "name", // Changed from firstName to name
      header: () => "Utilisateur Name",
      cell: (info) => {
        const name = info.getValue();
        return <span className="text-truncate-1-line">{name}</span>;
      },
    },
    {
      accessorKey: "email",
      header: () => "Email",
      cell: (info) => <span>{info.getValue()}</span>,
    },
    {
      accessorKey: "role",
      header: () => "Role",
      cell: (info) => (
        <span className="badge bg-primary">{info.getValue()}</span>
      ),
    },
    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => {
        const user = row.original;
        const { id, name, role } = user; // Changed from firstName to name

        // Don't show delete button for admin users (safety measure)
        const canDelete = role !== "admin";

        return (
          <div className="hstack d-flex gap-2 justify-content-center">
            <div
              className="avatar-text avatar-md mr-8"
              style={{ cursor: "pointer", color: "blue" }}
              onClick={() => handleEditUser(user)}
            >
              <FiEdit />
            </div>
            {canDelete && (
              <div className="avatar-text avatar-md mr-8">
                <FiTrash2
                  className="avatar-text avatar-md mr-8"
                  style={{ cursor: "pointer", color: "red" }}
                  onClick={() => handleDeleteUser(id, name)} // Changed from firstName to name
                />
              </div>
            )}
          </div>
        );
      },
      meta: {
        headerClassName: "text-center",
      },
    },
  ];

  if (loading) {
    return (
      <div className="main-content">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "200px" }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="main-content">
        <PageHeader
          title="Users Management"
          subtitle="Manage system users and their permissions"
        />

        {error && (
          <div
            className="alert alert-danger alert-dismissible fade show"
            role="alert"
          >
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError("")}
            ></button>
          </div>
        )}

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <Table
                  data={users}
                  columns={columns}
                  searchable={true}
                  searchPlaceholder="Search users..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <UpdateUserModal
        isOpen={isModalOpen}
        toggle={toggleModal}
        user={selectedUser}
        onSave={handleSaveUser}
      />
    </>
  );
};

export default UsersList;
