import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
export const ProtectedRoute = ({ children }) => {
  const user = useSelector((state) => state.user.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // ❗ NON-ADMIN RULE
  if (user.role !== "admin" && location.pathname !== "/bon-livraison/create") {
    return <Navigate to="/bon-livraison/create" replace />;
  }

  return children;
};
