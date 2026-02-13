// pages/Reports/ReportsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import ReactApexChart from "react-apexcharts";
import { reportsService } from "../../services/reportsService";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS - Simple formatting (display as-is from API)
// ─────────────────────────────────────────────────────────────────────────────
const fmtPrice = (n) => {
  const num = parseFloat(n);
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
};

const fmtPriceMAD = (n) => `${fmtPrice(n)} DH`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("fr-MA") : "—");
const formatDateForDisplay = (dateString) => {
  if (!dateString) return "";
  // Convert yyyy-mm-dd to dd/mm/yyyy for display
  const [year, month, day] = dateString.split("-");
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  return dateString;
};

const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  // Convert dd/mm/yyyy to yyyy-mm-dd for input value
  const [day, month, year] = dateString.split("/");
  if (day && month && year) {
    return `${year}-${month}-${day}`;
  }
  return dateString;
};

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // Return ISO format for internal use
};

const yearStart = () => {
  return `${new Date().getFullYear()}-01-01`; // Return ISO format for internal use
};

// Custom DateInput component
const DateInput = ({ value, onChange, label }) => {
  // Store both display format and input format
  const [displayValue, setDisplayValue] = useState(formatDateForDisplay(value));

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(formatDateForDisplay(value));
  }, [value]);

  const handleDateChange = (e) => {
    const inputValue = e.target.value; // This will be yyyy-mm-dd
    onChange(e); // Pass the event up
    setDisplayValue(formatDateForDisplay(inputValue));
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <input
        type="date"
        className="rp-date-input"
        value={formatDateForInput(value)} // Convert to yyyy-mm-dd for input
        onChange={handleDateChange}
        style={{
          width: "100%",
          // Hide the actual date text but keep the picker functional
          color: "transparent",
          position: "relative",
          zIndex: 1,
        }}
      />
      <input
        type="text"
        className="rp-date-input"
        value={displayValue}
        readOnly
        placeholder="dd/mm/yyyy"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          backgroundColor: "white",
          pointerEvents: "none", // Allows clicks to pass through to the date input
          border: "1px solid #ccc",
        }}
      />
    </div>
  );
};

const CHART = {
  fontFamily: "Syne, sans-serif",
  fontSize: "26px",
  toolbar: { show: false },
  animations: { enabled: true, speed: 400 },
};

const TABS = [
  { id: "dashboard", label: "Tableau de Bord", icon: "📊" },
  { id: "factures", label: "Factures", icon: "🧾" },
  { id: "bls", label: "Bons de Livraison", icon: "🚚" },
  { id: "revenue", label: "Chiffre d'Affaires", icon: "📈" },
  { id: "payments", label: "État Paiements", icon: "💳" },
  { id: "products", label: "Produits", icon: "📦" },
  { id: "comparison", label: "Comparaison", icon: "⚖️" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
const Skeleton = ({ h = 120 }) => (
  <div className="rp-skeleton" style={{ height: h }} />
);

const KpiCard = ({ label, value, sub, accent = "blue", icon, trend }) => (
  <div className={`rp-kpi rp-kpi--${accent}`}>
    {icon && <div className="rp-kpi__icon">{icon}</div>}
    <div className="rp-kpi__body">
      <span className="rp-kpi__label">{label}</span>
      <span className="rp-kpi__value">{value}</span>
      {sub && <span className="rp-kpi__sub">{sub}</span>}
      {trend !== undefined && (
        <span
          className={`rp-kpi__trend ${parseFloat(trend) >= 0 ? "up" : "down"}`}
        >
          {parseFloat(trend) >= 0 ? "▲" : "▼"} {Math.abs(parseFloat(trend))}%
        </span>
      )}
    </div>
  </div>
);

const Section = ({ title, children, action }) => (
  <div className="rp-section">
    <div className="rp-section__head">
      <h3 className="rp-section__title">{title}</h3>
      {action && <div className="rp-section__action">{action}</div>}
    </div>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const map = {
    payée: "success",
    payé: "success",
    partiellement_payée: "warning",
    envoyée: "info",
    brouillon: "secondary",
    annulée: "danger",
  };
  return (
    <span className={`rp-badge rp-badge--${map[status] || "secondary"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
};

const Empty = ({ msg = "Aucune donnée pour cette période" }) => (
  <div className="rp-empty">
    <span>🗂️</span>
    <p>{msg}</p>
  </div>
);

const Segmented = ({ options, value, onChange }) => (
  <div className="rp-segmented">
    {options.map((o) => (
      <button
        key={o.value}
        className={value === o.value ? "active" : ""}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const ProgressCell = ({ value }) => {
  const pct = Math.min(100, parseFloat(value) || 0);
  const color = pct > 75 ? "#16a34a" : pct > 40 ? "#ca8a04" : "#dc2626";
  return (
    <div className="rp-progress-wrap">
      <div className="rp-progress-track">
        <div
          className="rp-progress-bar"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span>{value}%</span>
    </div>
  );
};

const RecoveryBar = ({ rate, paidLabel, remainLabel, color = "#4361ee" }) => (
  <div className="rp-recovery-bar-wrap">
    <div className="rp-recovery-bar">
      <div
        className="rp-recovery-bar__fill"
        style={{
          width: `${Math.min(100, parseFloat(rate) || 0)}%`,
          background: color,
        }}
      />
      <span className="rp-recovery-bar__label">{rate}%</span>
    </div>
    <div className="rp-recovery-legend">
      <span className="rp-recovery-legend__item rp-recovery-legend__item--paid">
        {paidLabel}
      </span>
      <span className="rp-recovery-legend__item rp-recovery-legend__item--remain">
        {remainLabel}
      </span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TAB: DASHBOARD — Factures & BLs side-by-side overview
// ─────────────────────────────────────────────────────────────────────────────
const DashboardTab = ({ data, loading }) => {
  if (loading)
    return (
      <div className="rp-grid-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} h={110} />
        ))}
      </div>
    );
  if (!data) return <Empty />;

  const {
    factures,
    bon_livraisons,
    advancements,
    top_clients_factures, // ✅ NEW
    top_clients_bls, // ✅ NEW
    top_clients, // Fallback for backward compatibility
  } = data;

  const facMap = Object.fromEntries(
    (factures.by_status || []).map((s) => [s.status, s]),
  );
  const blMap = Object.fromEntries(
    (bon_livraisons.by_status || []).map((s) => [s.status, s]),
  );

  const donutOpts = {
    chart: { ...CHART, type: "donut" },
    colors: ["#4361ee", "#06b6d4"],
    labels: ["Factures TTC", "Bons Livraison TTC"],
    legend: { position: "bottom", fontFamily: "Syne, sans-serif" },
    plotOptions: { pie: { donut: { size: "68%" } } },
    tooltip: { y: { formatter: (v) => fmtPriceMAD(v) } },
    dataLabels: { formatter: (v) => `${v.toFixed(1)}%` },
  };
  const donutSeries = [
    parseFloat(factures.totals.montant_ttc) || 0,
    parseFloat(bon_livraisons.totals.montant_ttc) || 0,
  ];

  const statusRows = [
    { label: "Payé(e)", facKey: "payée", blKey: "payé", acc: "green" },
    {
      label: "Partiellement",
      facKey: "partiellement_payée",
      blKey: "partiellement_payée",
      acc: "yellow",
    },
    {
      label: "Brouillon",
      facKey: "brouillon",
      blKey: "brouillon",
      acc: "gray",
    },
    { label: "Envoyé", facKey: null, blKey: "envoyée", acc: "blue" },
    { label: "Annulé(e)", facKey: "annulée", blKey: "annulée", acc: "red" },
  ];

  // Use new fields, fallback to old field for backward compatibility
  const topClientsFac = top_clients_factures || top_clients || [];
  const topClientsBL = top_clients_bls || [];

  return (
    <>
      {/* Side-by-side KPI columns */}
      <div className="rp-dual-summary">
        <div className="rp-dual-col rp-dual-col--fac">
          <div className="rp-dual-col__header">
            <span>🧾</span>
            <span>Factures</span>
          </div>
          <div className="rp-grid-2-tight">
            <KpiCard
              icon="📋"
              accent="blue"
              label="Total"
              value={factures.totals.count}
              sub={fmtPriceMAD(factures.totals.montant_ttc)}
            />
            <KpiCard
              icon="✅"
              accent="green"
              label="Encaissé"
              value={fmtPriceMAD(factures.totals.montant_paye)}
              sub={`Taux: ${factures.totals.taux_recouvrement}%`}
            />
            <KpiCard
              icon="⏳"
              accent="yellow"
              label="À Encaisser"
              value={fmtPriceMAD(factures.totals.montant_restant)}
            />
            <KpiCard
              icon="💰"
              accent="purple"
              label="Avances Reçues"
              value={fmtPriceMAD(advancements.total_collected)}
              sub="tous règlements"
            />
          </div>
        </div>
        <div className="rp-dual-divider" />
        <div className="rp-dual-col rp-dual-col--bl">
          <div className="rp-dual-col__header">
            <span>🚚</span>
            <span>Bons de Livraison</span>
          </div>
          <div className="rp-grid-2-tight">
            <KpiCard
              icon="📦"
              accent="teal"
              label="Total BLs"
              value={bon_livraisons.totals.count}
              sub={fmtPriceMAD(bon_livraisons.totals.montant_ttc)}
            />
            <KpiCard
              icon="📋"
              accent="blue"
              label="Montant HT"
              value={fmtPriceMAD(bon_livraisons.totals.montant_ht)}
            />
            <KpiCard
              icon="✅"
              accent="green"
              label="BLs Payés"
              value={blMap["payé"]?.count || 0}
              sub={fmtPriceMAD(blMap["payé"]?.total_ttc || 0)}
            />
            <KpiCard
              icon="📤"
              accent="teal"
              label="BLs Envoyés"
              value={blMap["envoyée"]?.count || 0}
              sub={fmtPriceMAD(blMap["envoyée"]?.total_ttc || 0)}
            />
          </div>
        </div>
      </div>

      {/* Status comparison table + donut */}
      <div className="rp-grid-2">
        <Section title="Statuts Comparés — Factures vs BLs">
          <div className="rp-table-wrap">
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle text-nowrap">
                <thead className="table-light">
                  <tr>
                    <th>Statut</th>
                    <th className="text-center">Fact. (nb)</th>
                    <th className="text-end">Fact. TTC</th>
                    <th className="text-center">BLs (nb)</th>
                    <th className="text-end">BLs TTC</th>
                  </tr>
                </thead>

                <tbody>
                  {statusRows.map(({ label, facKey, blKey }) => {
                    const f = facKey
                      ? facMap[facKey] || { count: 0, total_ttc: 0 }
                      : { count: "—", total_ttc: 0 };

                    const b = blKey
                      ? blMap[blKey] || { count: 0, total_ttc: 0 }
                      : { count: "—", total_ttc: 0 };

                    return (
                      <tr key={label}>
                        <td>
                          <Badge status={blKey || facKey} />
                        </td>

                        <td className="text-center fw-semibold">{f.count}</td>

                        <td className="text-end">
                          {f.count !== "—" ? fmtPriceMAD(f.total_ttc) : "—"}
                        </td>

                        <td className="text-center fw-semibold">{b.count}</td>

                        <td className="text-end">
                          {b.count !== "—" ? fmtPriceMAD(b.total_ttc) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section title="Part du CA — Factures vs BLs">
          {donutSeries.some((v) => v > 0) ? (
            <ReactApexChart
              options={donutOpts}
              series={donutSeries}
              type="donut"
              height={260}
            />
          ) : (
            <Empty />
          )}
        </Section>
      </div>

      {/* Top 5 clients - Now showing BOTH Factures and BLs */}
      <div className="rp-grid-2">
        {/* Top 5 Clients by Factures */}
        <Section title="Top 5 Clients par CA Facturé">
          {!topClientsFac?.length ? (
            <Empty msg="Aucune facture dans cette période" />
          ) : (
            <div className="rp-table-wrap">
              <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle text-nowrap">
                  <thead className="table-light">
                    <tr>
                      <th className="text-center">#</th>
                      <th>Client</th>
                      <th className="text-center">Nb. Factures</th>
                      <th className="text-end">CA TTC</th>
                    </tr>
                  </thead>

                  <tbody>
                    {topClientsFac.map((c, i) => (
                      <tr key={c.client_id}>
                        <td className="text-center">
                          <span className="badge bg-primary rounded-pill">
                            {i + 1}
                          </span>
                        </td>

                        <td className="fw-semibold">
                          {c.client?.nom_complete || "—"}
                        </td>

                        <td className="text-center">{c.nb_factures || 0}</td>

                        <td className="text-end fw-bold">
                          {fmtPriceMAD(c.total_ttc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>

        {/* Top 5 Clients by BonLivraisons - NEW! */}
        <Section title="Top 5 Clients par CA BLs">
          {!topClientsBL?.length ? (
            <Empty msg="Aucun BL dans cette période" />
          ) : (
            <div className="rp-table-wrap">
              <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle text-nowrap">
                  <thead className="table-light">
                    <tr>
                      <th className="text-center">#</th>
                      <th>Client</th>
                      <th className="text-center">Nb. BLs</th>
                      <th className="text-end">CA TTC</th>
                    </tr>
                  </thead>

                  <tbody>
                    {topClientsBL.map((c, i) => (
                      <tr key={c.client_id}>
                        <td className="text-center">
                          <span className="badge bg-info rounded-pill">
                            {i + 1}
                          </span>
                        </td>

                        <td className="fw-semibold">
                          {c.client?.nom_complete || "—"}
                        </td>

                        <td className="text-center">{c.nb_bls || 0}</td>

                        <td className="text-end fw-bold">
                          {fmtPriceMAD(c.total_ttc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>
      </div>
    </>
  );
};
// ─────────────────────────────────────────────────────────────────────────────
// TAB: FACTURES — Deep-dive on invoices
// ─────────────────────────────────────────────────────────────────────────────
const FacturesTab = ({ data, loading }) => {
  if (loading)
    return (
      <div className="rp-grid-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} h={110} />
        ))}
      </div>
    );
  if (!data) return <Empty />;

  const { factures, advancements } = data;
  const statusMap = Object.fromEntries(
    (factures.by_status || []).map((s) => [s.status, s]),
  );
  const statuses = ["payée", "partiellement_payée", "brouillon", "annulée"];
  const colors = ["#16a34a", "#ca8a04", "#94a3b8", "#dc2626"];
  const accents = ["green", "yellow", "gray", "red"];

  const pieOpts = {
    chart: { ...CHART, type: "donut" },
    colors,
    labels: statuses.map((k) => k.replace(/_/g, " ")),
    legend: { position: "bottom", fontFamily: "Syne, sans-serif" },
    plotOptions: { pie: { donut: { size: "65%" } } },
    tooltip: { y: { formatter: (v) => fmtPriceMAD(v) } },
    dataLabels: { formatter: (v) => `${v.toFixed(1)}%` },
  };
  const pieSeries = statuses.map((k) =>
    parseFloat(statusMap[k]?.total_ttc || 0),
  );

  const barOpts = {
    chart: { ...CHART, type: "bar" },
    colors: ["#4361ee"],
    plotOptions: {
      bar: { horizontal: true, borderRadius: 5, barHeight: "55%" },
    },
    dataLabels: { enabled: false },
    xaxis: {
      labels: {
        formatter: (v) => fmtPrice(v, 0),
        style: { colors: "#94a3b8" },
      },
    },
    tooltip: { y: { formatter: (v) => fmtPriceMAD(v) } },
    grid: { borderColor: "#e2e8f0" },
  };
  const barSeries = [
    {
      name: "CA TTC",
      data: statuses.map((k) => ({
        x: k.replace(/_/g, " "),
        y: parseFloat(statusMap[k]?.total_ttc || 0),
      })),
    },
  ];

  return (
    <>
      <div className="rp-grid-4">
        <KpiCard
          icon="🧾"
          accent="blue"
          label="Total Factures"
          value={factures.totals.count}
          sub={fmtPriceMAD(factures.totals.montant_ttc)}
        />
        <KpiCard
          icon="✅"
          accent="green"
          label="Encaissé"
          value={fmtPriceMAD(factures.totals.montant_paye)}
          sub={`Taux: ${factures.totals.taux_recouvrement}%`}
        />
        <KpiCard
          icon="⏳"
          accent="yellow"
          label="Restant à Encaisser"
          value={fmtPriceMAD(factures.totals.montant_restant)}
        />
        <KpiCard
          icon="💰"
          accent="purple"
          label="Avances Enregistrées"
          value={fmtPriceMAD(advancements.total_collected)}
        />
      </div>

      <div className="rp-grid-4 rp-mt-12">
        {statuses.map((k, i) => (
          <KpiCard
            key={k}
            icon=""
            accent={accents[i]}
            label={k.replace(/_/g, " ")}
            value={statusMap[k]?.count || 0}
            sub={fmtPriceMAD(statusMap[k]?.total_ttc || 0)}
          />
        ))}
      </div>

      <div className="rp-grid-2 rp-mt-12">
        <Section title="Répartition TTC par Statut">
          {pieSeries.some((v) => v > 0) ? (
            <ReactApexChart
              options={pieOpts}
              series={pieSeries}
              type="donut"
              height={260}
            />
          ) : (
            <Empty />
          )}
        </Section>
        <Section title="CA par Statut">
          <ReactApexChart
            options={barOpts}
            series={barSeries}
            type="bar"
            height={220}
          />
        </Section>
      </div>

      <Section title="Taux de Recouvrement Global">
        <RecoveryBar
          rate={factures.totals.taux_recouvrement}
          paidLabel={`Payé: ${fmtPriceMAD(factures.totals.montant_paye)}`}
          remainLabel={`Restant: ${fmtPriceMAD(factures.totals.montant_restant)}`}
          color="#4361ee"
        />
      </Section>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: BONS DE LIVRAISON — Full BL analytics with Products & Payments
// ─────────────────────────────────────────────────────────────────────────────
const BLsTab = ({ data, loading }) => {
  if (loading)
    return (
      <div className="rp-grid-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} h={110} />
        ))}
      </div>
    );
  if (!data) return <Empty />;

  const { bon_livraisons, bl_products, bl_payments } = data;
  const statusMap = Object.fromEntries(
    (bon_livraisons.by_status || []).map((s) => [s.status, s]),
  );

  const blStatuses = [
    "payé",
    "envoyée",
    "partiellement_payée",
    "brouillon",
    "annulée",
  ];
  const blColors = ["#16a34a", "#4361ee", "#ca8a04", "#94a3b8", "#dc2626"];
  const blAccents = ["green", "blue", "yellow", "gray", "red"];

  const pieOpts = {
    chart: { ...CHART, type: "donut" },
    colors: blColors,
    labels: blStatuses.map((k) => k.replace(/_/g, " ")),
    legend: { position: "bottom", fontFamily: "Syne, sans-serif" },
    plotOptions: { pie: { donut: { size: "65%" } } },
    tooltip: { y: { formatter: (v) => fmtPriceMAD(v) } },
    dataLabels: { formatter: (v) => `${v.toFixed(1)}%` },
  };
  const pieSeries = blStatuses.map((k) =>
    parseFloat(statusMap[k]?.total_ttc || 0),
  );

  const totalCount = bon_livraisons.totals.count || 1;
  const radialOpts = {
    chart: { ...CHART, type: "radialBar" },
    colors: blColors,
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: { fontSize: "11px", fontFamily: "Syne, sans-serif" },
          value: {
            fontSize: "13px",
            fontFamily: "Syne, sans-serif",
            formatter: (v) => `${v}%`,
          },
          total: {
            show: true,
            label: "Total BLs",
            formatter: () => bon_livraisons.totals.count,
          },
        },
        hollow: { size: "42%" },
      },
    },
    labels: blStatuses.map((k) => k.replace(/_/g, " ")),
  };
  const radialSeries = blStatuses.map((k) =>
    Number(
      ((parseInt(statusMap[k]?.count || 0) / totalCount) * 100).toFixed(1),
    ),
  );

  const barOpts = {
    chart: { ...CHART, type: "bar" },
    colors: blColors,
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 5,
        barHeight: "55%",
        distributed: true,
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      labels: {
        formatter: (v) => fmtPriceMAD(v),
        style: { colors: "#94a3b8", fontSize: "10px" },
      },
    },
    legend: { show: false },
    tooltip: { y: { formatter: (v) => fmtPriceMAD(v) } },
    grid: { borderColor: "#e2e8f0" },
  };
  const barSeries = [
    {
      name: "CA TTC",
      data: blStatuses.map((k) => ({
        x: k.replace(/_/g, " "),
        y: parseFloat(statusMap[k]?.total_ttc || 0),
      })),
    },
  ];

  // is_facture conversion breakdown
  const convertedCount =
    bon_livraisons.by_status?.find((s) => s.is_facture === true)?.count || "—";
  const notConvertedCount =
    bon_livraisons.by_status?.find((s) => s.is_facture === false)?.count || "—";

  // BL Products Chart Options
  const productsChartOpts = {
    chart: { ...CHART, type: "line" },
    colors: ["#7c3aed", "#06b6d4"],
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 5 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: (bl_products || []).map(
        (p) => p.produit?.designation || `#${p.produit_id}`,
      ),
      labels: { rotate: -30, style: { colors: "#94a3b8", fontSize: "11px" } },
    },
    yaxis: [
      {
        title: { text: "CA (MAD)", style: { color: "#7c3aed" } },
        labels: { formatter: (v) => fmtPrice(v, 0) },
      },
      {
        opposite: true,
        title: { text: "Quantité", style: { color: "#06b6d4" } },
        labels: { formatter: (v) => fmtPrice(v, 0) },
      },
    ],
    legend: { position: "top", fontFamily: "Syne, sans-serif" },
    tooltip: { y: { formatter: (v) => fmtPrice(v, 0) } },
    grid: { borderColor: "#e2e8f0" },
  };

  const productsChartSeries = [
    {
      name: "CA TTC",
      type: "bar",
      data: (bl_products || []).map((p) => parseFloat(p.total_revenue) || 0),
    },
    {
      name: "Quantité",
      type: "line",
      data: (bl_products || []).map((p) => parseFloat(p.total_quantite) || 0),
    },
  ];

  return (
    <>
      {/* Main KPIs */}
      <div className="rp-grid-4">
        <KpiCard
          icon="🚚"
          accent="teal"
          label="Total BLs"
          value={bon_livraisons.totals.count}
          sub={fmtPriceMAD(bon_livraisons.totals.montant_ttc)}
        />
        <KpiCard
          icon="📋"
          accent="blue"
          label="Montant HT Total"
          value={fmtPriceMAD(bon_livraisons.totals.montant_ht)}
        />
        <KpiCard
          icon="✅"
          accent="green"
          label="BLs Payés"
          value={statusMap["payé"]?.count || 0}
          sub={fmtPriceMAD(statusMap["payé"]?.total_ttc || 0)}
        />
        <KpiCard
          icon="📤"
          accent="blue"
          label="BLs Envoyés"
          value={statusMap["envoyée"]?.count || 0}
          sub={fmtPriceMAD(statusMap["envoyée"]?.total_ttc || 0)}
        />
      </div>

      {/* All 5 statuses */}
      <div className="rp-grid-5 rp-mt-12">
        {blStatuses.map((k, i) => (
          <KpiCard
            key={k}
            icon=""
            accent={blAccents[i]}
            label={k.replace(/_/g, " ")}
            value={statusMap[k]?.count || 0}
            sub={fmtPriceMAD(statusMap[k]?.total_ttc || 0)}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="rp-grid-2 rp-mt-12">
        <Section title="Répartition TTC par Statut">
          {pieSeries.some((v) => v > 0) ? (
            <ReactApexChart
              options={pieOpts}
              series={pieSeries}
              type="donut"
              height={260}
            />
          ) : (
            <Empty />
          )}
        </Section>
        <Section title="Distribution des BLs par Statut (%)">
          {radialSeries.some((v) => v > 0) ? (
            <ReactApexChart
              options={radialOpts}
              series={radialSeries}
              type="radialBar"
              height={300}
            />
          ) : (
            <Empty />
          )}
        </Section>
      </div>

      <Section title="CA TTC par Statut">
        <ReactApexChart
          options={barOpts}
          series={barSeries}
          type="bar"
          height={220}
        />
      </Section>

      {/* Conversion status */}
      <Section title="Statut Conversion → Facture">
        <div
          className="rp-grid-4"
          style={{ gridTemplateColumns: "repeat(2,1fr)" }}
        >
          <KpiCard
            icon="🔄"
            accent="green"
            label="Convertis en Facture"
            value={convertedCount}
            sub="BLs déjà facturés"
          />
          <KpiCard
            icon="⏳"
            accent="yellow"
            label="Non Convertis"
            value={notConvertedCount}
            sub="En attente de facturation"
          />
        </div>
      </Section>

      {/* BL Products Section - NEW */}
      {bl_products && bl_products.length > 0 && (
        <>
          <Section title="Produits Vendus via Bons de Livraison">
            <ReactApexChart
              options={productsChartOpts}
              series={productsChartSeries}
              type="line"
              height={320}
            />
          </Section>

          <Section title="Classement Produits — BLs">
            <div className="rp-table-wrap">
              <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle text-nowrap">
                  <thead className="table-light">
                    <tr>
                      <th className="text-center">#</th>
                      <th>Référence</th>
                      <th>Désignation</th>
                      <th className="text-end">Qtité</th>
                      <th className="text-end">CA HT</th>
                      <th className="text-end">CA TTC</th>
                      <th className="text-end">Prix Moy.</th>
                    </tr>
                  </thead>

                  <tbody>
                    {bl_products.map((p, i) => (
                      <tr key={p.produit_id}>
                        {/* Rank */}
                        <td className="text-center">
                          <span className="badge bg-secondary rounded-pill">
                            {i + 1}
                          </span>
                        </td>

                        {/* Reference */}
                        <td>
                          <code className="text-primary fw-semibold">
                            {p.produit?.reference || "—"}
                          </code>
                        </td>

                        {/* Designation */}
                        <td>{p.produit?.designation || "—"}</td>

                        {/* Quantity */}
                        <td className="text-end">
                          {fmtPrice(p.total_quantite, 0)}
                        </td>

                        {/* CA HT */}
                        <td className="text-end">{fmtPriceMAD(p.total_ht)}</td>

                        {/* CA TTC */}
                        <td className="text-end fw-bold">
                          {fmtPriceMAD(p.total_revenue)}
                        </td>

                        {/* Average price */}
                        <td className="text-end">
                          {fmtPriceMAD(p.avg_prix_unitaire)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        </>
      )}

      {/* BL Payments Section - NEW */}
      {bl_payments && (
        <Section title="État des Paiements — Bons de Livraison">
          <div className="rp-grid-4">
            <KpiCard
              icon="💳"
              accent="blue"
              label="Total Paiements BLs"
              value={fmtPriceMAD(bl_payments.total_payments || 0)}
              sub={`${bl_payments.total_count || 0} règlement(s)`}
            />
            <KpiCard
              icon="✅"
              accent="green"
              label="Paiements Complètes"
              value={fmtPriceMAD(bl_payments.total_paid || 0)}
              sub={`${bl_payments.paid_count || 0} BLs`}
            />
            <KpiCard
              icon="⏳"
              accent="yellow"
              label="Paiements Partiels"
              value={fmtPriceMAD(bl_payments.total_partial || 0)}
              sub={`${bl_payments.partial_count || 0} BLs`}
            />
            <KpiCard
              icon="⚠️"
              accent="red"
              label="Restant à Payer"
              value={fmtPriceMAD(bl_payments.total_remaining || 0)}
            />
          </div>

          {bl_payments.by_method && bl_payments.by_method.length > 0 && (
            <div className="rp-grid-2 rp-mt-12">
              <Section title="Modes de Règlement — BLs">
                <div className="rp-table-wrap">
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>Mode</th>
                        <th>Nb.</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bl_payments.by_method.map((m) => (
                        <tr key={m.mode_reglement}>
                          <td className="rp-bold">{m.mode_reglement || "—"}</td>
                          <td>{m.count}</td>
                          <td className="rp-num">{fmtPriceMAD(m.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Taux de Recouvrement BLs">
                <RecoveryBar
                  rate={bl_payments.recovery_rate || 0}
                  paidLabel={`Payé: ${fmtPriceMAD(bl_payments.total_paid || 0)}`}
                  remainLabel={`Restant: ${fmtPriceMAD(bl_payments.total_remaining || 0)}`}
                  color="#06b6d4"
                />
              </Section>
            </div>
          )}
        </Section>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: REVENUE OVER TIME — Both Factures & BLs with equal detail
// ─────────────────────────────────────────────────────────────────────────────
const RevenueTab = ({ data, loading, granularity, setGranularity }) => {
  const [view, setView] = useState("combined");

  if (loading) return <Skeleton h={380} />;
  if (!data) return <Empty />;

  const {
    factures: factRows = [],
    bon_livraisons: blRows = [],
    payments: payRows = [],
  } = data;
  const allPeriods = [
    ...new Set([
      ...factRows.map((r) => r.period),
      ...blRows.map((r) => r.period),
    ]),
  ].sort();
  const factMap = Object.fromEntries(factRows.map((r) => [r.period, r]));
  const blMap = Object.fromEntries(blRows.map((r) => [r.period, r]));
  const payMap = Object.fromEntries(payRows.map((r) => [r.period, r]));

  const base = {
    chart: { ...CHART },
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 5 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: allPeriods,
      labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
    },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    legend: { position: "top", fontFamily: "Syne, sans-serif" },
    tooltip: { y: { formatter: (v) => fmtPriceMAD(v) } },
  };

  const combinedSeries = [
    {
      name: "Factures TTC",
      data: allPeriods.map((p) => parseFloat(factMap[p]?.total_ttc || 0)),
    },
    {
      name: "Bons Livraison TTC",
      data: allPeriods.map((p) => parseFloat(blMap[p]?.total_ttc || 0)),
    },
    {
      name: "Paiements Reçus",
      data: allPeriods.map((p) => parseFloat(payMap[p]?.total_amount || 0)),
    },
  ];

  const facSeries = [
    {
      name: "HT",
      data: allPeriods.map((p) => parseFloat(factMap[p]?.total_ht || 0)),
    },
    {
      name: "TTC",
      data: allPeriods.map((p) => parseFloat(factMap[p]?.total_ttc || 0)),
    },
    {
      name: "Payé",
      data: allPeriods.map((p) => parseFloat(factMap[p]?.total_paye || 0)),
    },
  ];

  const blSeries = [
    {
      name: "HT",
      type: "bar",
      data: allPeriods.map((p) => parseFloat(blMap[p]?.total_ht || 0)),
    },
    {
      name: "TTC",
      type: "bar",
      data: allPeriods.map((p) => parseFloat(blMap[p]?.total_ttc || 0)),
    },
    {
      name: "Nb BLs",
      type: "line",
      data: allPeriods.map((p) => parseInt(blMap[p]?.nb_bls || 0)),
    },
  ];

  const combinedOpts = {
    ...base,
    colors: ["#4361ee", "#06b6d4", "#22c55e"],
    chart: { ...CHART, type: "bar" },
    yaxis: {
      labels: {
        formatter: (v) => fmtPrice(v, 0),
        style: { colors: "#94a3b8" },
      },
    },
  };
  const facOpts = {
    ...base,
    colors: ["#cbd5e1", "#4361ee", "#22c55e"],
    chart: { ...CHART, type: "bar" },
    yaxis: {
      labels: {
        formatter: (v) => fmtPrice(v, 0),
        style: { colors: "#94a3b8" },
      },
    },
  };
  const blOpts = {
    ...base,
    colors: ["#a5f3fc", "#06b6d4", "#7c3aed"],
    chart: { ...CHART },
    yaxis: [
      {
        labels: {
          formatter: (v) => fmtPrice(v, 0),
          style: { colors: "#94a3b8" },
        },
      },
      {
        opposite: true,
        title: { text: "Nb BLs", style: { color: "#7c3aed" } },
        labels: { formatter: (v) => v },
      },
    ],
  };

  const granOpts = [
    { value: "day", label: "Jour" },
    { value: "week", label: "Sem." },
    { value: "month", label: "Mois" },
    { value: "year", label: "Année" },
  ];
  const viewOpts = [
    { value: "combined", label: "Combiné" },
    { value: "factures", label: "Factures" },
    { value: "bls", label: "BLs" },
  ];

  return (
    <>
      <Section
        title="Évolution du CA"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Segmented options={viewOpts} value={view} onChange={setView} />
            <Segmented
              options={granOpts}
              value={granularity}
              onChange={setGranularity}
            />
          </div>
        }
      >
        {allPeriods.length === 0 ? (
          <Empty />
        ) : (
          <>
            {view === "combined" && (
              <ReactApexChart
                options={combinedOpts}
                series={combinedSeries}
                type="bar"
                height={320}
              />
            )}
            {view === "factures" && (
              <ReactApexChart
                options={facOpts}
                series={facSeries}
                type="bar"
                height={320}
              />
            )}
            {view === "bls" && (
              <ReactApexChart
                options={blOpts}
                series={blSeries}
                type="line"
                height={320}
              />
            )}
          </>
        )}
      </Section>

      {/* Factures table */}
      <Section title="Détail par Période — Factures">
        {allPeriods.length === 0 ? (
          <Empty />
        ) : (
          <div className="rp-table-wrap">
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle text-nowrap">
                <thead className="table-light">
                  <tr>
                    <th>Période</th>
                    <th className="text-center">Nb. Fact.</th>
                    <th className="text-end">HT</th>
                    <th className="text-end">TTC</th>
                    <th className="text-end">Encaissé</th>
                    <th className="text-center">Taux</th>
                  </tr>
                </thead>

                <tbody>
                  {allPeriods.map((p) => {
                    const r = factMap[p] || {};
                    const rate =
                      r.total_ttc > 0
                        ? (
                            (parseFloat(r.total_paye || 0) /
                              parseFloat(r.total_ttc)) *
                            100
                          ).toFixed(1)
                        : "0.0";

                    return (
                      <tr key={p}>
                        {/* Period */}
                        <td className="fw-semibold">{p}</td>

                        {/* Invoice count */}
                        <td className="text-center">{r.nb_factures || 0}</td>

                        {/* HT */}
                        <td className="text-end">
                          {fmtPriceMAD(r.total_ht || 0)}
                        </td>

                        {/* TTC */}
                        <td className="text-end fw-bold">
                          {fmtPriceMAD(r.total_ttc || 0)}
                        </td>

                        {/* Paid */}
                        <td className="text-end text-success fw-semibold">
                          {fmtPriceMAD(r.total_paye || 0)}
                        </td>

                        {/* Rate */}
                        <td className="text-center">
                          <ProgressCell value={rate} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* BLs table — equal treatment */}
      <Section title="Détail par Période — Bons de Livraison">
        {allPeriods.length === 0 ? (
          <Empty />
        ) : (
          <div className="rp-table-wrap">
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle text-nowrap">
                <thead className="table-light">
                  <tr>
                    <th>Période</th>
                    <th className="text-center">Nb. BLs</th>
                    <th className="text-end">HT</th>
                    <th className="text-end">TTC</th>
                    <th className="text-end">Paiements Reçus</th>
                  </tr>
                </thead>

                <tbody>
                  {allPeriods.map((p) => {
                    const r = blMap[p] || {};
                    const pay = payMap[p] || {};

                    return (
                      <tr key={p}>
                        {/* Period */}
                        <td className="fw-semibold">{p}</td>

                        {/* BL count */}
                        <td className="text-center">{r.nb_bls || 0}</td>

                        {/* HT */}
                        <td className="text-end">
                          {fmtPriceMAD(r.total_ht || 0)}
                        </td>

                        {/* TTC */}
                        <td className="text-end fw-bold">
                          {fmtPriceMAD(r.total_ttc || 0)}
                        </td>

                        {/* Payments received */}
                        <td className="text-end text-success fw-semibold">
                          {fmtPriceMAD(pay.total_amount || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: PAYMENTS — Factures aging + BL payment methods (Enhanced)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// TAB: PAYMENTS — Factures & BonLivraison aging with full parity
// ─────────────────────────────────────────────────────────────────────────────
const PaymentsTab = ({ data, loading }) => {
  const [methodView, setMethodView] = useState("factures");
  const [docTypeView, setDocTypeView] = useState("factures"); // Toggle between factures and BLs

  if (loading) return <Skeleton h={300} />;
  if (!data) return <Empty />;

  const { factures, bon_livraisons, combined_totals, advancement_methods } =
    data;

  // Factures data
  const facturesAging = factures?.aging || [];
  const facturesOutstanding = factures?.total_outstanding || "0.00";
  const facturesOutstandingCount = factures?.total_outstanding_count || 0;
  const facturesPaymentMethods = factures?.payment_methods || [];

  // BonLivraison data
  const blAging = bon_livraisons?.aging || [];
  const blOutstanding = bon_livraisons?.total_outstanding || "0.00";
  const blOutstandingCount = bon_livraisons?.total_outstanding_count || 0;
  const blPaymentMethods = bon_livraisons?.payment_methods || [];

  // Combined totals
  const totalOutstanding = combined_totals?.total_outstanding || "0.00";
  const totalOutstandingCount = combined_totals?.total_outstanding_count || 0;

  const agingColors = {
    "0-30": "#22c55e",
    "31-60": "#eab308",
    "61-90": "#f97316",
    "90+": "#ef4444",
  };
  const agingAccents = {
    "0-30": "green",
    "31-60": "yellow",
    "61-90": "orange",
    "90+": "red",
  };

  // Select current data based on docTypeView
  const currentAging = docTypeView === "factures" ? facturesAging : blAging;
  const currentOutstanding =
    docTypeView === "factures" ? facturesOutstanding : blOutstanding;
  const currentOutstandingCount =
    docTypeView === "factures" ? facturesOutstandingCount : blOutstandingCount;
  const currentPaymentMethods =
    docTypeView === "factures" ? facturesPaymentMethods : blPaymentMethods;

  const pieOpts = {
    chart: { ...CHART, type: "donut" },
    colors: Object.values(agingColors),
    labels: currentAging.map((a) => `${a.bucket} jours (${a.count})`),
    legend: { position: "bottom", fontFamily: "Syne, sans-serif" },
    plotOptions: { pie: { donut: { size: "65%" } } },
    tooltip: { y: { formatter: (v) => fmtPriceMAD(v) } },
    dataLabels: { formatter: (v) => `${v.toFixed(1)}%` },
  };
  const pieSeries = currentAging.map((a) => parseFloat(a.total_restant) || 0);

  return (
    <>
      {/* Combined Overview KPIs */}
      <div className="rp-grid-2" style={{ marginBottom: "1.5rem" }}>
        <KpiCard
          icon="⚠️"
          accent="red"
          label="Total Créances (Fact. + BLs)"
          value={fmtPriceMAD(totalOutstanding)}
          sub={`${totalOutstandingCount} document(s) impayé(s)`}
        />
        <div className="rp-grid-2-tight">
          <KpiCard
            icon="🧾"
            accent="blue"
            label="Créances Factures"
            value={fmtPriceMAD(facturesOutstanding)}
            sub={`${facturesOutstandingCount} facture(s)`}
          />
          <KpiCard
            icon="🚚"
            accent="teal"
            label="Créances BLs"
            value={fmtPriceMAD(blOutstanding)}
            sub={`${blOutstandingCount} BL(s)`}
          />
        </div>
      </div>

      {/* Document Type Toggle */}
      <Section
        title="Vieillissement des Créances"
        action={
          <Segmented
            options={[
              { value: "factures", label: "🧾 Factures" },
              { value: "bls", label: "🚚 Bons Livraison" },
            ]}
            value={docTypeView}
            onChange={setDocTypeView}
          />
        }
      >
        {/* Aging buckets for selected document type */}
        <div className="rp-grid-4" style={{ marginBottom: "1rem" }}>
          {currentAging.map((a) => (
            <KpiCard
              key={a.bucket}
              icon="📅"
              accent={agingAccents[a.bucket]}
              label={`${a.bucket} jours`}
              value={fmtPriceMAD(a.total_restant)}
              sub={`${a.count} doc(s)`}
            />
          ))}
        </div>

        {/* Aging pie chart */}
        <div className="rp-grid-2">
          <div>
            {pieSeries.some((v) => v > 0) ? (
              <ReactApexChart
                options={pieOpts}
                series={pieSeries}
                type="donut"
                height={280}
              />
            ) : (
              <Empty
                msg={`Aucune créance impayée pour ${docTypeView === "factures" ? "les factures" : "les BLs"}`}
              />
            )}
          </div>

          {/* Payment Methods for selected document type */}
          <div>
            <h4
              style={{
                marginBottom: "1rem",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Modes de Règlement —{" "}
              {docTypeView === "factures" ? "Factures Payées" : "BLs Payés"}
            </h4>
            {currentPaymentMethods.length === 0 ? (
              <Empty msg="Aucun paiement enregistré" />
            ) : (
              <div className="rp-table-wrap">
                <table className="rp-table">
                  <thead>
                    <tr>
                      <th>Mode</th>
                      <th>Nb.</th>
                      <th>Total TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPaymentMethods.map((m) => (
                      <tr key={m.mode_reglement}>
                        <td className="rp-bold">{m.mode_reglement || "—"}</td>
                        <td>{m.count}</td>
                        <td className="rp-num">{fmtPriceMAD(m.total_ttc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Advancement Methods Section */}
      {advancement_methods && advancement_methods.length > 0 && (
        <Section title="Avances / Acomptes Reçus">
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Mode de Paiement</th>
                  <th>Nb. Avances</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {advancement_methods.map((m) => (
                  <tr key={m.paymentMethod}>
                    <td className="rp-bold">{m.paymentMethod || "—"}</td>
                    <td>{m.count}</td>
                    <td className="rp-num">{fmtPriceMAD(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Detailed aging tables for Factures */}
      {docTypeView === "factures" &&
        facturesAging.map((bucket) =>
          bucket.items?.length > 0 ? (
            <Section
              key={bucket.bucket}
              title={`Factures impayées — ${bucket.bucket} jours (${bucket.items.length})`}
              action={
                <span className="rp-badge rp-badge--danger">
                  {fmtPriceMAD(bucket.total_restant)}
                </span>
              }
            >
              <div className="rp-table-wrap">
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle text-nowrap">
                    <thead className="table-light">
                      <tr>
                        <th>Facture</th>
                        <th>Client</th>
                        <th>Date Fact.</th>
                        <th className="text-end">TTC</th>
                        <th className="text-end">Restant</th>
                        <th className="text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucket.items.map((f) => (
                        <tr key={f.id}>
                          <td className="fw-semibold">{f.num_facture}</td>
                          <td>{f.client?.nom_complete || "—"}</td>
                          <td>{fmtDate(f.date_facturation)}</td>
                          <td className="text-end">
                            {fmtPriceMAD(f.montant_ttc)}
                          </td>
                          <td className="text-end text-danger fw-bold">
                            {fmtPriceMAD(f.montant_restant)}
                          </td>
                          <td className="text-center">
                            <Badge status={f.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          ) : null,
        )}

      {/* Detailed aging tables for BonLivraison */}
      {docTypeView === "bls" &&
        blAging.map((bucket) =>
          bucket.items?.length > 0 ? (
            <Section
              key={bucket.bucket}
              title={`Bons de Livraison impayés — ${bucket.bucket} jours (${bucket.items.length})`}
              action={
                <span className="rp-badge rp-badge--danger">
                  {fmtPriceMAD(bucket.total_restant)}
                </span>
              }
            >
              <div className="rp-table-wrap">
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle text-nowrap">
                    <thead className="table-light">
                      <tr>
                        <th>Bon Livraison</th>
                        <th>Client</th>
                        <th>Date Livraison</th>
                        <th className="text-end">TTC</th>
                        <th className="text-end">Restant</th>
                        <th className="text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucket.items.map((bl) => (
                        <tr key={bl.id}>
                          {/* ✅ FIXED: Changed from num_bon to num_bon_livraison */}
                          <td className="fw-semibold">
                            {bl.num_bon_livraison}
                          </td>
                          <td>{bl.client?.nom_complete || "—"}</td>
                          <td>{fmtDate(bl.date_livraison)}</td>
                          <td className="text-end">
                            {fmtPriceMAD(bl.montant_ttc)}
                          </td>
                          <td className="text-end text-danger fw-bold">
                            {fmtPriceMAD(bl.montant_restant)}
                          </td>
                          <td className="text-center">
                            <Badge status={bl.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          ) : null,
        )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: PRODUCTS — Combined Factures & BLs Products
// ─────────────────────────────────────────────────────────────────────────────
const ProductsTab = ({ data, loading }) => {
  const [view, setView] = useState("combined");

  if (loading) return <Skeleton h={300} />;
  if (!data) return <Empty />;

  const { products, bl_products } = data;

  // Combined products data
  const combinedProducts = [...(products || []), ...(bl_products || [])];

  const barOpts = {
    chart: { ...CHART, type: "line" },
    colors: ["#7c3aed", "#06b6d4", "#22c55e", "#f59e0b"],
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 5 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: (products || []).map(
        (p) => p.produit?.designation || `#${p.produit_id}`,
      ),
      labels: { rotate: -30, style: { colors: "#94a3b8", fontSize: "11px" } },
    },
    yaxis: [
      {
        title: { text: "CA (MAD)", style: { color: "#7c3aed" } },
        labels: { formatter: (v) => fmtPrice(v, 0) },
      },
      {
        opposite: true,
        title: { text: "Quantité", style: { color: "#06b6d4" } },
        labels: { formatter: (v) => fmtPrice(v, 0) },
      },
    ],
    legend: { position: "top", fontFamily: "Syne, sans-serif" },
    tooltip: { y: { formatter: (v) => fmtPrice(v, 0) } },
    grid: { borderColor: "#e2e8f0" },
  };

  const barSeries = [
    {
      name: "CA Bon Livraisons",
      type: "bar",
      data: (products || []).map((p) => parseFloat(p.total_revenue) || 0),
    },
    {
      name: "Qté Bons",
      type: "line",
      data: (products || []).map((p) => parseFloat(p.total_quantite) || 0),
    },
    {
      name: "CA Bons",
      type: "bar",
      data: (bl_products || []).map((p) => parseFloat(p.total_revenue) || 0),
    },
    {
      name: "Qté Bons",
      type: "line",
      data: (bl_products || []).map((p) => parseFloat(p.total_quantite) || 0),
    },
  ];

  const viewOpts = [
    { value: "combined", label: "Combiné" },
    { value: "bls", label: "BLs" },
  ];

  return (
    <>
      <Section
        title="Produits — CA & Quantités Vendues"
        action={
          <Segmented options={viewOpts} value={view} onChange={setView} />
        }
      >
        <ReactApexChart
          options={barOpts}
          series={
            view === "combined"
              ? barSeries
              : view === "factures"
                ? barSeries.slice(0, 2)
                : barSeries.slice(2)
          }
          type="line"
          height={320}
        />
      </Section>

      <Section title="Classement Produits — Bon Livraisons">
        <div className="rp-table-wrap">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle text-nowrap">
              <thead className="table-light">
                <tr>
                  <th className="text-center">#</th>
                  <th>Référence</th>
                  <th>Désignation</th>
                  <th className="text-end">Qtité</th>
                  <th className="text-end">CA HT</th>
                  <th className="text-end">CA TTC</th>
                  <th className="text-end">Prix Moy.</th>
                </tr>
              </thead>

              <tbody>
                {(products || []).map((p, i) => (
                  <tr key={p.produit_id}>
                    {/* Rank */}
                    <td className="text-center">
                      <span className="badge bg-secondary rounded-pill">
                        {i + 1}
                      </span>
                    </td>

                    {/* Reference */}
                    <td>
                      <code className="text-primary fw-semibold">
                        {p.produit?.reference || "—"}
                      </code>
                    </td>

                    {/* Designation */}
                    <td>{p.produit?.designation || "—"}</td>

                    {/* Quantity */}
                    <td className="text-end">
                      {fmtPrice(p.total_quantite, 0)}
                    </td>

                    {/* CA HT */}
                    <td className="text-end">{fmtPriceMAD(p.total_ht)}</td>

                    {/* CA TTC */}
                    <td className="text-end fw-bold">
                      {fmtPriceMAD(p.total_revenue)}
                    </td>

                    {/* Average price */}
                    <td className="text-end">
                      {fmtPriceMAD(p.avg_prix_unitaire)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {bl_products && bl_products.length > 0 && (
        <Section title="Classement Produits — Bons de Livraison">
          <div className="rp-table-wrap">
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle text-nowrap">
                <thead className="table-light">
                  <tr>
                    <th className="text-center">#</th>
                    <th>Référence</th>
                    <th>Désignation</th>
                    <th className="text-end">Qtité</th>
                    <th className="text-end">CA HT</th>
                    <th className="text-end">CA TTC</th>
                    <th className="text-end">Prix Moy.</th>
                  </tr>
                </thead>

                <tbody>
                  {bl_products.map((p, i) => (
                    <tr key={p.produit_id}>
                      {/* Rank */}
                      <td className="text-center">
                        <span className="badge bg-secondary rounded-pill">
                          {i + 1}
                        </span>
                      </td>

                      {/* Reference */}
                      <td>
                        <code className="text-primary fw-semibold">
                          {p.produit?.reference || "—"}
                        </code>
                      </td>

                      {/* Designation */}
                      <td>{p.produit?.designation || "—"}</td>

                      {/* Quantity */}
                      <td className="text-end">
                        {fmtPrice(p.total_quantite, 0)}
                      </td>

                      {/* CA HT */}
                      <td className="text-end">{fmtPriceMAD(p.total_ht)}</td>

                      {/* CA TTC */}
                      <td className="text-end fw-bold">
                        {fmtPriceMAD(p.total_revenue)}
                      </td>

                      {/* Average price */}
                      <td className="text-end">
                        {fmtPriceMAD(p.avg_prix_unitaire)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: COMPARISON — Period-over-period for BOTH document types
// ─────────────────────────────────────────────────────────────────────────────
const ComparisonTab = ({ data, loading }) => {
  if (loading) return <Skeleton h={300} />;
  if (!data) return <Empty />;

  const { current, previous, changes, periods } = data;

  const rows = [
    {
      group: "🧾 Factures",
      label: "Nb. Factures",
      curr: current.factures.count,
      prev: previous.factures.count,
      chg: changes.factures.count_change,
      money: false,
    },
    {
      group: "🧾 Factures",
      label: "CA TTC",
      curr: current.factures.total_ttc,
      prev: previous.factures.total_ttc,
      chg: changes.factures.total_ttc_change,
      money: true,
    },
    {
      group: "🧾 Factures",
      label: "Encaissé",
      curr: current.factures.total_paye,
      prev: previous.factures.total_paye,
      chg: changes.factures.total_paye_change,
      money: true,
    },
    {
      group: "🚚 BLs",
      label: "Nb. BLs",
      curr: current.bon_livraisons.count,
      prev: previous.bon_livraisons.count,
      chg: changes.bon_livraisons.count_change,
      money: false,
    },
    {
      group: "🚚 BLs",
      label: "CA BLs TTC",
      curr: current.bon_livraisons.total_ttc,
      prev: previous.bon_livraisons.total_ttc,
      chg: changes.bon_livraisons.total_ttc_change,
      money: true,
    },
  ];

  const moneyRows = rows.filter((r) => r.money);
  const barOpts = {
    chart: { ...CHART, type: "bar" },
    colors: ["#4361ee", "#cbd5e1"],
    plotOptions: {
      bar: { columnWidth: "40%", borderRadius: 5, grouped: true },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: moneyRows.map((r) => r.label),
      labels: { style: { colors: "#94a3b8", fontSize: "10px" } },
    },
    yaxis: {
      labels: {
        formatter: (v) => fmtPrice(v, 0),
        style: { colors: "#94a3b8" },
      },
    },
    legend: { position: "top", fontFamily: "Syne, sans-serif" },
    tooltip: { y: { formatter: (v) => fmtPriceMAD(v) } },
    grid: { borderColor: "#e2e8f0" },
  };
  const barSeries = [
    { name: "Actuel", data: moneyRows.map((r) => parseFloat(r.curr) || 0) },
    { name: "Précédent", data: moneyRows.map((r) => parseFloat(r.prev) || 0) },
  ];

  return (
    <>
      <div className="rp-comp-periods">
        <div className="rp-comp-period rp-comp-period--current">
          <span className="rp-comp-period__label">Période actuelle</span>
          <span className="rp-comp-period__range">
            {fmtDate(periods.current.start)} — {fmtDate(periods.current.end)}
          </span>
        </div>
        <div className="rp-comp-vs">VS</div>
        <div className="rp-comp-period rp-comp-period--prev">
          <span className="rp-comp-period__label">Période précédente</span>
          <span className="rp-comp-period__range">
            {fmtDate(periods.previous.start)} — {fmtDate(periods.previous.end)}
          </span>
        </div>
      </div>

      <Section title="Comparaison Visuelle — Factures & BLs">
        <ReactApexChart
          options={barOpts}
          series={barSeries}
          type="bar"
          height={280}
        />
      </Section>

      <Section title="Tableau Comparatif Complet">
        <div className="rp-table-wrap">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle text-nowrap">
              <thead className="table-light">
                <tr>
                  <th>Type</th>
                  <th>Indicateur</th>
                  <th className="text-end">Actuel</th>
                  <th className="text-end">Précédent</th>
                  <th className="text-center">Évolution</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const isUp = parseFloat(r.chg) >= 0;

                  return (
                    <tr key={`${r.group}-${r.label}`}>
                      {/* Group / Type */}
                      <td className="text-muted small">{r.group}</td>

                      {/* Label */}
                      <td className="fw-semibold">{r.label}</td>

                      {/* Current */}
                      <td className="text-end fw-bold">
                        {r.money ? fmtPriceMAD(r.curr) : r.curr}
                      </td>

                      {/* Previous */}
                      <td className="text-end text-muted">
                        {r.money ? fmtPriceMAD(r.prev) : r.prev}
                      </td>

                      {/* Delta */}
                      <td className="text-center">
                        <span
                          className={`badge ${
                            isUp ? "bg-success" : "bg-danger"
                          } bg-opacity-75`}
                        >
                          {isUp ? "▲" : "▼"} {Math.abs(parseFloat(r.chg))}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filters, setFilters] = useState({
    startDate: yearStart(),
    endDate: today(),
  });
  const [granularity, setGranularity] = useState("month");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  const setTabLoading = (tab, val) => setLoading((p) => ({ ...p, [tab]: val }));
  const setTabData = (tab, val) => setData((p) => ({ ...p, [tab]: val }));
  const setTabError = (tab, val) => setErrors((p) => ({ ...p, [tab]: val }));

  // dashboard data is shared with Factures & BLs tabs (they extract their slice)
  const fetchMap = useCallback(
    () => ({
      dashboard: () => reportsService.getDashboard(filters),
      factures: () => reportsService.getDashboard(filters),
      bls: () => reportsService.getDashboard(filters),
      revenue: () =>
        reportsService.getRevenueOverTime({ ...filters, granularity }),
      payments: () => reportsService.getPaymentStatus(filters),
      products: () => reportsService.getProductStats({ ...filters, limit: 10 }),
      comparison: () => reportsService.getComparison(filters),
    }),
    [filters, granularity],
  );

  const loadTab = useCallback(
    async (tab) => {
      setTabLoading(tab, true);
      setTabError(tab, null);
      try {
        const res = await fetchMap()[tab]();
        setTabData(tab, res.data);
      } catch (err) {
        setTabError(
          tab,
          err?.response?.data?.message || "Erreur de chargement",
        );
      } finally {
        setTabLoading(tab, false);
      }
    },
    [fetchMap],
  );

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, filters]);
  useEffect(() => {
    if (activeTab === "revenue") loadTab("revenue");
  }, [granularity]);

  const tabContent = {
    dashboard: (
      <DashboardTab data={data.dashboard} loading={!!loading.dashboard} />
    ),
    factures: <FacturesTab data={data.factures} loading={!!loading.factures} />,
    bls: <BLsTab data={data.bls} loading={!!loading.bls} />,
    revenue: (
      <RevenueTab
        data={data.revenue}
        loading={!!loading.revenue}
        granularity={granularity}
        setGranularity={setGranularity}
      />
    ),
    payments: <PaymentsTab data={data.payments} loading={!!loading.payments} />,
    products: <ProductsTab data={data.products} loading={!!loading.products} />,
    comparison: (
      <ComparisonTab data={data.comparison} loading={!!loading.comparison} />
    ),
  };

  return (
    <div className="rp-root">
      <div className="rp-header">
        <div className="rp-header__left">
          <h1 className="rp-header__title">Rapports & Statistiques</h1>
          <p className="rp-header__sub">
            Vue analytique complète — Factures & Bons de Livraison
          </p>
        </div>
        <div className="rp-header__right">
          <div className="rp-filter-group">
            <label>Du</label>
            <DateInput
              value={filters.startDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, startDate: e.target.value }))
              }
            />
            <label>Au</label>
            <DateInput
              value={filters.endDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, endDate: e.target.value }))
              }
            />
          </div>{" "}
          <button
            className="rp-btn rp-btn--refresh"
            onClick={() => {
              setData({});
              loadTab(activeTab);
            }}
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      <div className="rp-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`rp-tab ${activeTab === t.id ? "rp-tab--active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="rp-tab__icon">{t.icon}</span>
            <span className="rp-tab__label">{t.label}</span>
            {loading[t.id] && <span className="rp-tab__spin" />}
          </button>
        ))}
      </div>

      <div className="rp-content">
        {errors[activeTab] ? (
          <div className="rp-error">
            <span>⚠️</span>
            <p>{errors[activeTab]}</p>
            <button className="rp-btn" onClick={() => loadTab(activeTab)}>
              Réessayer
            </button>
          </div>
        ) : (
          tabContent[activeTab]
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
