import React, { useState, useEffect } from "react";
import {
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Container,
  Alert,
  Spinner,
} from "reactstrap";
import { useParams } from "react-router-dom";
import { config_url } from "@/utils/config";
import axios from "axios";
function UpdateUser() {
  const { id } = useParams(); // URL param: /users/:id

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch user by ID
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${config_url}/api/users/${id}`, {
          withCredentials: true,
        });

        const data = response.data;

        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setEmail(data.email || "");
        setRole(data.role || "");
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setErrorMsg("Failed to load user.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);
  const handleSubmit = async (e) => {
    e.preventDefault();

    const updatedFields = {
      firstName,
      lastName,
      email,
      role,
    };

    if (password.trim()) {
      updatedFields.password = password;
    }

    try {
      const response = await axios.patch(
        `${config_url}/api/users/${id}`,
        updatedFields, // Axios takes this as the request body
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setSuccessMsg("Profile updated successfully.");
      setErrorMsg("");
      setPassword("");
    } catch (err) {
      console.error("Update failed", err);
      setErrorMsg("An error occurred while updating the profile.");
      setSuccessMsg("");
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner color="primary" />
      </Container>
    );
  }

  return (
    <>
      <Container className="mt-5" style={{ maxWidth: "600px" }}>
        <h2 className="mb-4">Update Profile</h2>

        {successMsg && <Alert color="success">{successMsg}</Alert>}
        {errorMsg && <Alert color="danger">{errorMsg}</Alert>}

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label for="firstName">First Name</Label>
            <Input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label for="lastName">Last Name</Label>
            <Input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label for="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label for="password">New Password (optional)</Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep existing password"
            />
          </FormGroup>

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
              <option value="super-admin">Super-Admin</option>
            </Input>
          </FormGroup>

          <Button color="primary" type="submit">
            Update Profile
          </Button>
        </Form>
      </Container>
    </>
  );
}

export default UpdateUser;
