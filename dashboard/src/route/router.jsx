import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layout/root";
import Home from "../pages/home";
import Analytics from "../pages/analytics";
import ReportsSales from "../pages/reports-sales";
import ReportsLeads from "../pages/reports-leads";
import ReportsProject from "../pages/reports-project";
import ReportsTimesheets from "../pages/reports-timesheets";

import UsersList from "../pages/Users/users-list";
import UsersCreate from "../pages/Users/users-create";
import UpdateUser from "../pages/Users/update-user";
//Clients
import ClientsList from "../pages/Clients/clients-list";

import ClientsCreate from "../pages/Clients/clients-create";

import FornisseursList from "../pages/Fornisseur/fornisseurs-list";
import FornisseurCreate from "../pages/Fornisseur/fornisseur-create";
import ProduitsCreate from "../pages/Produits/produits-create";
import ProduitsList from "../pages/Produits/produits-list";

import PaymentCreate from "../pages/payment-create";

import LayoutAuth from "../layout/layoutAuth";
import LoginCreative from "../pages/login-creative";

import RequireAuth from "@/components/authentication/RequireAuth";

import { Navigate } from "react-router-dom";
import InvoicesList from "../pages/Invoices/invoices-list";
import DevisCreate from "../pages/Devis/devis-create";

import DevisList from "../pages/Devis/devis-list";
import BonLivraisonsList from "../pages/BonLivraison/bonlivraisons-list";
import BonLivrCreate from "@/components/payment/BonLivrCreate";
import BonLivraisonCreate from "../pages/BonLivraison/bl-create";
import FactureCreate from "../pages/Invoices/facture-create";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LayoutAuth />,
    children: [
      {
        index: true, // default child route for "/"
        element: <LoginCreative />,
      },
    ],
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: "dashboard",
        element: <Home />,
      },
      {
        path: "dashboards/analytics",
        element: <Analytics />,
      },
      {
        path: "reports/sales",
        element: <ReportsSales />,
      },
      {
        path: "reports/leads",
        element: <ReportsLeads />,
      },
      {
        path: "reports/project",
        element: <ReportsProject />,
      },
      {
        path: "reports/timesheets",
        element: <ReportsTimesheets />,
      },

      {
        path: "users",
        element: <UsersList />,
      },
      {
        path: "users/create",
        element: <UsersCreate />,
      },
      {
        path: "users/update/:id",
        element: <UpdateUser />,
      },
      {
        path: "clients",
        element: <ClientsList />,
      },
      {
        path: "clients/create",
        element: <ClientsCreate />,
      },
      {
        path: "fornisseurs",
        element: <FornisseursList />,
      },
      {
        path: "fornisseurs/create",
        element: <FornisseurCreate />,
      },
      {
        path: "produits/create",
        element: <ProduitsCreate />,
      },

      {
        path: "produits",
        element: <ProduitsList />,
      },

      {
        path: "facture/create",
        element: <FactureCreate />,
      },
      {
        path: "devis/create",
        element: <DevisCreate />,
      },
      {
        path: "devis/list",
        element: <DevisList />,
      },
      {
        path: "invoices/list",
        element: <InvoicesList />,
      },
      {
        path: "bon-livraisons/list",
        element: <BonLivraisonsList />,
      },
      {
        path: "bon-livraison/create",
        element: <BonLivraisonCreate />,
      },
    ],
  },
  // Fallback: if route not found, redirect to login
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
