import React, { useState, useEffect } from "react";
import api from "@/utils/axiosConfig";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Alert,
  Spinner,
} from "reactstrap";

export const UpdateUserModal = ({ isOpen, toggle, user, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset form when user changes or modal opens/closes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "",
        password: "", // Always empty for security
      });
    }
    setSuccessMsg("");
    setErrorMsg("");
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Validate required fields
    if (!formData.name || !formData.email || !formData.role) {
      setErrorMsg("Name, email, and role are required.");
      setSubmitting(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMsg("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }

    try {
      // Prepare update data - only include password if provided
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };

      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      const response = await api.patch(`/api/auth/${user.id}`, updateData);

      setSuccessMsg("User updated successfully!");

      // Clear password field after successful update
      setFormData((prev) => ({
        ...prev,
        password: "",
      }));

      // Call the onSave callback to refresh the parent component
      if (onSave) {
        onSave(response.data.user); // Pass the updated user data
      }

      // Close modal after successful update
      setTimeout(() => {
        toggle();
      }, 1500);
    } catch (err) {
      console.error("Update failed", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "An error occurred while updating the user.";
      setErrorMsg(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        Update User {user?.name ? `- ${user.name}` : ""}
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody>
          {successMsg && <Alert color="success">{successMsg}</Alert>}
          {errorMsg && <Alert color="danger">{errorMsg}</Alert>}

          <FormGroup>
            <Label for="name">Full Name</Label>
            <Input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={submitting}
              placeholder="Enter full name"
            />
          </FormGroup>

          <FormGroup>
            <Label for="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={submitting}
              placeholder="Enter email address"
            />
          </FormGroup>

          <FormGroup>
            <Label for="password">New Password (optional)</Label>
            <Input
              type="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Leave blank to keep existing password"
              disabled={submitting}
              minLength={6}
            />
            <small className="form-text text-muted">
              Minimum 6 characters. Leave empty to keep current password.
            </small>
          </FormGroup>

          <FormGroup>
            <Label for="role">Role</Label>
            <Input
              type="select"
              id="role"
              value={formData.role}
              onChange={handleChange}
              required
              disabled={submitting}
            >
              <option value="">Select Role</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Input>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" type="submit" disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : "Save Changes"}
          </Button>
          <Button color="secondary" onClick={toggle} disabled={submitting}>
            Cancel
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};
