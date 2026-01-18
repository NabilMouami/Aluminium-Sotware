import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { config_url } from "@/utils/config";
import { useDispatch } from "react-redux";
import { detailsUser } from "../../slices/userInfo";

const LoginForm = () => {
  const [email, setEmail] = useState("hassan@admin.com");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // In your login component, after successful login:
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post(`${config_url}/api/auth/login`, {
        email,
        password,
      });

      const { user, token } = response.data;

      // ✅ Store token in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user)); // Optional: store user data

      // ✅ Store user in Redux
      dispatch(detailsUser(user));

      // ✅ Navigate to protected route
      navigate("/bon-livraison/create");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
      console.error(err.response?.data || err.message);
    }
  };

  return (
    <>
      <h2 className="fs-20 fw-bolder mb-4">Urban Services Auth</h2>
      <h4 className="fs-13 fw-bold mb-2">Authenticated to your account</h4>

      <form onSubmit={handleSubmit} className="w-100 mt-4 pt-2">
        {error && (
          <div className="alert alert-danger text-sm mb-3">{error}</div>
        )}
        <div className="mb-4">
          <input
            type="email"
            className="form-control"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="password"
            className="form-control"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="custom-control custom-checkbox">
            <input
              type="checkbox"
              className="custom-control-input"
              id="rememberMe"
            />
            <label
              className="custom-control-label c-pointer"
              htmlFor="rememberMe"
            >
              Remember Me
            </label>
          </div>
        </div>
        <div className="mt-3">
          <button type="submit" className="btn btn-lg btn-primary w-100">
            Login
          </button>
        </div>
      </form>
    </>
  );
};

export default LoginForm;
