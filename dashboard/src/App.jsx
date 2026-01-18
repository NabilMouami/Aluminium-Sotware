import React, { useEffect } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { detailsUser } from "./slices/userInfo";
import { config_url } from "@/utils/config";
import { RouterProvider } from "react-router-dom";
import { router } from "./route/router";
import "react-quill/dist/quill.snow.css";
import "react-circular-progressbar/dist/styles.css";
import "react-perfect-scrollbar/dist/css/styles.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-datetime/css/react-datetime.css";
import NavigationProvider from "./contentApi/navigationProvider";
import SideBarToggleProvider from "./contentApi/sideBarToggleProvider";
import ThemeCustomizer from "./components/shared/ThemeCustomizer";
import axiosInstance from "./utils/axiosConfig"; // Import the axios instance

const App = () => {
  return (
    <>
      <NavigationProvider>
        <SideBarToggleProvider>
          <RouterProvider router={router} />
        </SideBarToggleProvider>
      </NavigationProvider>
      <ThemeCustomizer />
    </>
  );
};

export default App;
