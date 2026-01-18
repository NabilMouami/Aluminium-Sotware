import React, { useState } from "react";
import { FiSave } from "react-icons/fi";
import topTost from "@/utils/topTost";
import axios from "axios";
import { config_url } from "@/utils/config";
import { FormGroup, Label, Input } from "reactstrap";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const MySwal = withReactContent(Swal);

function UsersCreate() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("name", firstName);
      formData.append("role", role);

      const response = await axios.post(
        `${config_url}/api/auth/register`,
        formData,
        {
          withCredentials: true,

          headers: { "Content-Type": "application/json" },
        }
      );

      MySwal.fire({
        title: "Success!",
        text: "User created successfully",
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        setFirstName("");
        setEmail("");
        setPassword("");
      });
    } catch (error) {
      console.error("Error creating user:", error);
      topTost(error.response?.data?.message || "Error creating user", "error");
    }
  };

  return (
    <>
      <div className="main-content">
        <div className="row">
          <form className="col-xl-9" onSubmit={handleSubmit}>
            <div className="card stretch stretch-full">
              <div className="card-body">
                <div className="mb-4">
                  <label className="form-label">
                    Nom Utilisateur <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nom User Dashboard"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label">
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email:"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label">
                    Password User <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <FormGroup>
                  <Label for="role">Role</Label>
                  <Input
                    type="select"
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="">Select Role</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </Input>
                </FormGroup>
                <button type="submit" className="w-25 btn btn-primary m-4">
                  <FiSave size={16} className="me-2" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default UsersCreate;
