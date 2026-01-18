export const menuList = [
  // {
  //   id: 0,
  //   name: "dashboards",
  //   path: "#",
  //   icon: "feather-airplay",
  //   dropdownMenu: [
  //     {
  //       id: 1,
  //       name: "CRM",
  //       path: "/",
  //       subdropdownMenu: false,
  //     },
  //     {
  //       id: 2,
  //       name: "Analytics",
  //       path: "/dashboards/analytics",
  //       subdropdownMenu: false,
  //     },
  //   ],
  // },
  // {
  //   id: 1,
  //   name: "reports",
  //   path: "#",
  //   icon: "feather-cast",
  //   dropdownMenu: [
  //     {
  //       id: 1,
  //       name: "Sales Report",
  //       path: "/reports/sales",
  //       subdropdownMenu: false,
  //     },
  //     {
  //       id: 2,
  //       name: "Leads Report",
  //       path: "/reports/leads",
  //       subdropdownMenu: false,
  //     },
  //     {
  //       id: 3,
  //       name: "Project Report",
  //       path: "/reports/project",
  //       subdropdownMenu: false,
  //     },
  //     {
  //       id: 4,
  //       name: "Timesheets Report",
  //       path: "/reports/timesheets",
  //       subdropdownMenu: false,
  //     },
  //   ],
  // },

  {
    id: 2,
    name: "Facture",
    path: "#",
    icon: "feather-file-text",
    dropdownMenu: [
      {
        id: 1,
        name: "List Factures",
        path: "/invoices/list",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Facture Creer",
        path: "/facture/create",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 3,
    name: "Devis",
    path: "#",
    icon: "feather-clipboard",
    dropdownMenu: [
      {
        id: 1,
        name: "List Devis",
        path: "/devis/list",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Devis Creer",
        path: "/devis/create",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 4,
    name: "Bon Livraison",
    path: "#",
    icon: "feather-file-text",
    dropdownMenu: [
      {
        id: 1,
        name: "List Bon Livraisons",
        path: "/bon-livraisons/list",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Creer Bon Livr",
        path: "/bon-livraison/create",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 5,
    name: "authentication",
    path: "#",
    icon: "feather-power",

    dropdownMenu: [
      {
        id: 1,
        name: "Users",
        path: "/users",
        subdropdownMenu: false,
      },
      {
        id: 7,
        name: "Create User",
        path: "/users/create",
        subdropdownMenu: false,
      },
    ],
  },

  {
    id: 6,
    name: "clients",
    path: "#",
    icon: "feather-users",
    dropdownMenu: [
      {
        id: 1,
        name: "List Clients",
        path: "/clients",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Creer Client",
        path: "/clients/create",
        subdropdownMenu: false,
      },
    ],
  },

  {
    id: 7,
    name: "fornisseurs",
    path: "#",
    icon: "feather-briefcase",

    dropdownMenu: [
      {
        id: 1,
        name: "List Fornisseurs",
        path: "/fornisseurs",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Creer Fornisseur",
        path: "/fornisseurs/create",
        subdropdownMenu: false,
      },
    ],
  },

  {
    id: 8,
    name: "produits",
    path: "#",
    icon: "feather-archive",

    dropdownMenu: [
      {
        id: 1,
        name: "List Produits",
        path: "/produits",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Creer Produit",
        path: "/produits/create",
        subdropdownMenu: false,
      },
    ],
  },
];
