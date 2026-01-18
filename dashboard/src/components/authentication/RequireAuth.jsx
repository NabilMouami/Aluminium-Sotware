import { useSelector } from "react-redux";
import { selectUser } from "../../slices/userInfo";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const RequireAuth = ({ children }) => {
  const user = useSelector(selectUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/");
  }, [user]);

  return user ? children : null;
};

export default RequireAuth;
