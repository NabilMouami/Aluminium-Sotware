import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FiTrendingUp,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiCalendar,
  FiRefreshCw,
  FiChevronDown,
  FiArrowUpRight,
  FiArrowDownRight,
  FiList,
} from "react-icons/fi";
import { config_url } from "@/utils/config";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v, d = 2) => {
  const n = parseFloat(v);
  return isNaN(n) ? "0.00" : n.toFixed(d);
};

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return format(typeof d === "string" ? parseISO(d) : d, "dd/MM/yyyy HH:mm", {
      locale: fr,
    });
  } catch {
    return "—";
  }
};

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const STATUS_META = {
  payée: {
    label: "Payée",
    color: "#059669",
    bg: "rgba(5,150,105,.12)",
    icon: "✓",
  },
  partiellement_payée: {
    label: "Partiel",
    color: "#d97706",
    bg: "rgba(217,119,6,.12)",
    icon: "◑",
  },
  en_attente: {
    label: "En attente",
    color: "#3b82f6",
    bg: "rgba(59,130,246,.12)",
    icon: "⏳",
  },
  brouillon: {
    label: "Brouillon",
    color: "#6b7280",
    bg: "rgba(107,114,128,.12)",
    icon: "✏",
  },
  envoyée: {
    label: "Envoyée",
    color: "#9333ea",
    bg: "rgba(147,51,234,.12)",
    icon: "↗",
  },
  en_retard: {
    label: "En retard",
    color: "#ef4444",
    bg: "rgba(239,68,68,.12)",
    icon: "!",
  },
  annulée: {
    label: "Annulée",
    color: "#4b5563",
    bg: "rgba(75,85,99,.12)",
    icon: "✕",
  },
};

const PAYMENT_META = {
  espece: { label: "Espèces", icon: "💵" },
  cheque: { label: "Chèque", icon: "📄" },
  virement: { label: "Virement", icon: "🏦" },
  carte: { label: "Carte", icon: "💳" },
  multiple: { label: "Multiple", icon: "🔀" },
  non_paye: { label: "Non payé", icon: "—" },
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, unit = "Dh", sub, color, icon, trend }) {
  return (
    <div className="caisse-stat-card" style={{ "--accent": color }}>
      <div className="caisse-stat-icon">{icon}</div>
      <div className="caisse-stat-body">
        <span className="caisse-stat-label">{label}</span>
        <span className="caisse-stat-value">
          {value} <span className="caisse-stat-unit">{unit}</span>
        </span>
        {sub && <span className="caisse-stat-sub">{sub}</span>}
      </div>
      {trend !== undefined && (
        <div className={`caisse-trend ${trend >= 0 ? "up" : "down"}`}>
          {trend >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Payment Method Bar ───────────────────────────────────────────────────────
function PaymentBar({ data }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  const colors = ["#059669", "#3b82f6", "#d97706", "#9333ea", "#ef4444"];
  return (
    <div className="caisse-payment-bar">
      <div className="caisse-bar-track">
        {data.map((d, i) => (
          <div
            key={d.method}
            className="caisse-bar-seg"
            style={{
              width: total ? `${(d.amount / total) * 100}%` : "0%",
              background: colors[i % colors.length],
            }}
            title={`${d.label}: ${fmt(d.amount)} Dh`}
          />
        ))}
      </div>
      <div className="caisse-bar-legend">
        {data.map((d, i) => (
          <div key={d.method} className="caisse-bar-legend-item">
            <span
              className="caisse-dot"
              style={{ background: colors[i % colors.length] }}
            />
            <span>{d.label}</span>
            <strong>{fmt(d.amount)} Dh</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ bon }) {
  const sm = STATUS_META[bon.status] || STATUS_META.brouillon;
  const pm = PAYMENT_META[bon.paymentType] || PAYMENT_META.non_paye;
  return (
    <tr className="caisse-tx-row">
      <td>
        <span className="caisse-tx-num">{bon.deliveryNumber}</span>
      </td>
      <td className="caisse-tx-client">{bon.customerName}</td>
      <td>
        <span
          className="caisse-status-badge"
          style={{ color: sm.color, background: sm.bg }}
        >
          {sm.icon} {sm.label}
        </span>
      </td>
      <td>
        <span className="caisse-pm-badge">
          {pm.icon} {pm.label}
        </span>
      </td>
      <td className="caisse-tx-amount">{fmt(bon.total)} Dh</td>
      {/* ✅ paidOnDate = amount actually paid on this specific date */}
      <td className="caisse-tx-adv">{fmt(bon.paidOnDate || 0)} Dh</td>
      <td
        className={`caisse-tx-rest ${parseFloat(bon.remainingAmount) > 0 ? "owed" : ""}`}
      >
        {fmt(bon.remainingAmount)} Dh
      </td>
      <td className="caisse-tx-date">{formatDate(bon.createdAt)}</td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CaissierPage() {
  const [bons, setBons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Fetch
  useEffect(() => {
    setLoading(true);
    axios
      .get(`${config_url}/api/bonlivraisons/by-date`, {
        params: {
          startDate: date,
          endDate: date,
        },
      })
      .then((r) => {
        setBons(r.data || []);
        setLastRefreshed(new Date());
      })
      .catch(() => setBons([]))
      .finally(() => setLoading(false));
  }, [refreshKey, date]);

  // Filter by selected date (createdAt OR paymentDate OR advancements)
  const dayBons = useMemo(() => {
    const d = new Date(date);
    const start = startOfDay(d).getTime();
    const end = endOfDay(d).getTime();
    return bons.filter((b) => {
      const createdTime = new Date(b.createdAt).getTime();
      if (createdTime >= start && createdTime <= end) return true;

      if (b.paymentDate) {
        const paymentTime = new Date(b.paymentDate).getTime();
        if (!isNaN(paymentTime) && paymentTime >= start && paymentTime <= end)
          return true;
      }

      // ✅ Also keep if it has advancements on this date (already filtered by backend)
      if (b.advancements && b.advancements.length > 0) return true;

      return false;
    });
  }, [bons, date]);

  // Apply status filter
  const filtered = useMemo(() => {
    if (statusFilter === "all") return dayBons;
    return dayBons.filter((b) => b.status === statusFilter);
  }, [dayBons, statusFilter]);

  // ── Statistics ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const cash = dayBons.filter((b) =>
      ["payée", "partiellement_payée"].includes(b.status),
    );

    // ✅ Use paidOnDate — amount actually paid on the selected date
    const cashIn = cash.reduce(
      (s, b) => s + parseFloat(b.paidOnDate || 0),
      0,
    );

    const paidFull = dayBons.filter((b) => b.status === "payée");
    const paidFullTotal = paidFull.reduce(
      (s, b) => s + parseFloat(b.total || 0),
      0,
    );

    const partial = dayBons.filter(
      (b) => b.status === "partiellement_payée",
    );

    // ✅ Use paidOnDate for partial advancements
    const partialAdv = partial.reduce(
      (s, b) => s + parseFloat(b.paidOnDate || 0),
      0,
    );

    const remaining = dayBons.reduce((s, b) => {
      if (["annulée", "payée"].includes(b.status)) return s;
      return s + parseFloat(b.remainingAmount || 0);
    }, 0);

    const grossTotal = dayBons.reduce(
      (s, b) => s + parseFloat(b.total || 0),
      0,
    );

    // ✅ Payment method breakdown using paidOnDate
    const pmMap = {};
    dayBons.forEach((b) => {
      if (!["payée", "partiellement_payée"].includes(b.status)) return;
      const pm = b.paymentType || "non_paye";
      const amt = parseFloat(b.paidOnDate || 0);
      if (amt > 0) pmMap[pm] = (pmMap[pm] || 0) + amt;
    });

    const pmData = Object.entries(pmMap)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        method: k,
        label: PAYMENT_META[k]?.label || k,
        amount: v,
      }))
      .sort((a, b) => b.amount - a.amount);

    const byStatus = {};
    dayBons.forEach((b) => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    });

    return {
      cashIn,
      paidFull: paidFull.length,
      paidFullTotal,
      partialCount: partial.length,
      partialAdv,
      remaining,
      grossTotal,
      totalBons: dayBons.length,
      pmData,
      byStatus,
      especes: pmMap["espece"] || 0,
      cheques: pmMap["cheque"] || 0,
      virements: pmMap["virement"] || 0,
    };
  }, [dayBons]);

  const displayDate = useMemo(() => {
    try {
      return format(new Date(date), "EEEE d MMMM yyyy", { locale: fr });
    } catch {
      return date;
    }
  }, [date]);

  const isToday = date === todayStr();

  return (
    <>
      <style>{`
        .caisse-page {
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
          background: #f3f4f6;
          min-height: 100vh;
          color: #1f2937;
          padding: 28px 32px;
        }
        .caisse-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 28px;
        }
        .caisse-brand {
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #059669;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .caisse-title {
          font-size: 26px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          line-height: 1.2;
        }
        .caisse-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin-top: 4px;
        }
        .caisse-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .caisse-date-pick {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px 14px;
        }
        .caisse-date-pick svg { color: #059669; }
        .caisse-date-pick input {
          background: transparent;
          border: none;
          outline: none;
          color: #1f2937;
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
          width: 140px;
        }
        .caisse-date-pick input::-webkit-calendar-picker-indicator {
          filter: invert(0) opacity(0.4);
          cursor: pointer;
        }
        .caisse-refresh-btn {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px 14px;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          transition: all .2s;
        }
        .caisse-refresh-btn:hover {
          border-color: #059669;
          color: #059669;
        }
        .caisse-refresh-btn svg { font-size: 14px; }
        .caisse-today-badge {
          background: rgba(5,150,105,.1);
          color: #059669;
          border: 1px solid rgba(5,150,105,.2);
          border-radius: 20px;
          font-size: 11px;
          padding: 4px 12px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .caisse-date-banner {
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          border: 1px solid #e5e7eb;
          border-left: 3px solid #059669;
          border-radius: 12px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .caisse-date-banner-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .caisse-date-banner-left svg { color: #059669; font-size: 20px; }
        .caisse-date-banner-day {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          text-transform: capitalize;
        }
        .caisse-date-banner-refresh {
          font-size: 12px;
          color: #9ca3af;
        }
        .caisse-total-bons-pill {
          background: rgba(59,130,246,.1);
          color: #3b82f6;
          border-radius: 20px;
          padding: 4px 14px;
          font-size: 13px;
          font-weight: 600;
        }
        .caisse-cash-hero {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #ffffff 100%);
          border: 1px solid rgba(5,150,105,.2);
          border-radius: 16px;
          padding: 28px 32px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          position: relative;
          overflow: hidden;
        }
        .caisse-cash-hero::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 180px; height: 180px;
          background: radial-gradient(circle, rgba(5,150,105,.1) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .caisse-cash-label {
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #059669;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .caisse-cash-amount {
          font-size: 44px;
          font-weight: 800;
          color: #111827;
          line-height: 1;
          letter-spacing: -1px;
        }
        .caisse-cash-amount span { font-size: 22px; color: #059669; margin-left: 8px; }
        .caisse-cash-sub {
          font-size: 13px;
          color: rgba(5,150,105,.7);
          margin-top: 6px;
        }
        .caisse-cash-pills {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .caisse-cash-pill {
          background: rgba(255,255,255,.8);
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 12px;
          padding: 14px 20px;
          text-align: center;
          min-width: 110px;
        }
        .caisse-cash-pill-val {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }
        .caisse-cash-pill-label {
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .caisse-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .caisse-stat-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          transition: border-color .2s, transform .2s;
          position: relative;
          overflow: hidden;
        }
        .caisse-stat-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: var(--accent, #059669);
          border-radius: 3px 0 0 3px;
        }
        .caisse-stat-card:hover {
          border-color: var(--accent, #059669);
          transform: translateY(-2px);
        }
        .caisse-stat-icon {
          font-size: 22px;
          line-height: 1;
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          background: #f3f4f6;
          border-radius: 10px;
          flex-shrink: 0;
        }
        .caisse-stat-body { flex: 1; min-width: 0; }
        .caisse-stat-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: block;
          margin-bottom: 4px;
        }
        .caisse-stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          display: block;
          line-height: 1.1;
        }
        .caisse-stat-unit { font-size: 13px; color: #6b7280; }
        .caisse-stat-sub {
          font-size: 11px;
          color: #9ca3af;
          display: block;
          margin-top: 4px;
        }
        .caisse-trend {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          padding: 3px 8px;
        }
        .caisse-trend.up { background: rgba(5,150,105,.1); color: #059669; }
        .caisse-trend.down { background: rgba(239,68,68,.1); color: #ef4444; }
        .caisse-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 900px) {
          .caisse-two-col { grid-template-columns: 1fr; }
        }
        .caisse-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
        }
        .caisse-panel-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .caisse-panel-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .caisse-panel-title svg { color: #059669; }
        .caisse-panel-body { padding: 20px; }
        .caisse-bar-track {
          height: 10px;
          background: #f3f4f6;
          border-radius: 10px;
          display: flex;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .caisse-bar-seg {
          height: 100%;
          transition: width .6s ease;
        }
        .caisse-bar-legend {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .caisse-bar-legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #4b5563;
        }
        .caisse-bar-legend-item strong {
          margin-left: auto;
          color: #111827;
        }
        .caisse-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .caisse-status-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .caisse-status-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .caisse-status-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          min-width: 130px;
          color: #4b5563;
        }
        .caisse-status-bar-wrap {
          flex: 1;
          background: #f3f4f6;
          border-radius: 4px;
          height: 6px;
          overflow: hidden;
        }
        .caisse-status-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width .6s ease;
        }
        .caisse-status-count {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          min-width: 24px;
          text-align: right;
        }
        .caisse-table-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .caisse-table-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .caisse-table-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .caisse-table-title svg { color: #059669; }
        .caisse-status-filter {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 6px 12px;
          color: #1f2937;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          cursor: pointer;
          appearance: none;
          padding-right: 28px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
        }
        .caisse-table-wrap { overflow-x: auto; }
        table.caisse-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        table.caisse-table thead tr {
          background: #f9fafb;
        }
        table.caisse-table th {
          padding: 10px 16px;
          text-align: left;
          font-size: 11px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 600;
          white-space: nowrap;
        }
        .caisse-tx-row {
          border-bottom: 1px solid #f3f4f6;
          transition: background .15s;
        }
        .caisse-tx-row:last-child { border-bottom: none; }
        .caisse-tx-row:hover { background: #f9fafb; }
        .caisse-tx-row td { padding: 12px 16px; vertical-align: middle; }
        .caisse-tx-num {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #3b82f6;
          background: rgba(59,130,246,.1);
          padding: 3px 8px;
          border-radius: 6px;
        }
        .caisse-tx-client { color: #1f2937; font-weight: 500; }
        .caisse-tx-amount { font-weight: 700; color: #111827; }
        .caisse-tx-adv { color: #059669; font-weight: 600; }
        .caisse-tx-rest { color: #6b7280; }
        .caisse-tx-rest.owed { color: #d97706; font-weight: 600; }
        .caisse-tx-date { color: #9ca3af; font-size: 12px; white-space: nowrap; }
        .caisse-status-badge {
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 20px;
          font-weight: 600;
          white-space: nowrap;
        }
        .caisse-pm-badge { font-size: 12px; color: #6b7280; }
        .caisse-empty {
          text-align: center;
          padding: 48px 20px;
          color: #9ca3af;
        }
        .caisse-empty-icon { font-size: 40px; margin-bottom: 12px; }
        .caisse-empty-text { font-size: 14px; }
        .caisse-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          flex-direction: column;
          gap: 16px;
          color: #6b7280;
        }
        .caisse-spinner {
          width: 36px; height: 36px;
          border: 3px solid #e5e7eb;
          border-top-color: #059669;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .caisse-especes-row {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .caisse-especes-card {
          flex: 1;
          min-width: 160px;
          background: linear-gradient(135deg, #ecfdf5, #ffffff);
          border: 1px solid rgba(5,150,105,.2);
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .caisse-especes-card .icon {
          font-size: 28px;
          width: 48px; height: 48px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(5,150,105,.1);
          border-radius: 12px;
        }
        .caisse-especes-card .info-label {
          font-size: 11px;
          color: rgba(5,150,105,.7);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 4px;
        }
        .caisse-especes-card .info-val {
          font-size: 22px;
          font-weight: 800;
          color: #059669;
        }
        .caisse-especes-card .info-val span {
          font-size: 13px;
          font-weight: 400;
          color: rgba(5,150,105,.5);
          margin-left: 4px;
        }
        @media (max-width: 640px) {
          .caisse-page { padding: 16px; }
          .caisse-cash-amount { font-size: 32px; }
          .caisse-stats-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="caisse-page">
        {/* ── Header ── */}
        <div className="caisse-header">
          <div className="caisse-header-left">
            <h1 className="caisse-title">Caisse & Encaissements</h1>
            <div className="caisse-subtitle">
              Suivi des paiements et transactions journalières
            </div>
          </div>
          <div className="caisse-header-right">
            {isToday && (
              <div className="caisse-today-badge">● Aujourd'hui</div>
            )}
            <div className="caisse-date-pick">
              <FiCalendar size={16} />
              <input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <button
              className="caisse-refresh-btn"
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Actualiser"
            >
              <FiRefreshCw size={14} />
              Actualiser
            </button>
          </div>
        </div>

        {/* ── Date Banner ── */}
        <div className="caisse-date-banner">
          <div className="caisse-date-banner-left">
            <FiCalendar />
            <div>
              <div className="caisse-date-banner-day">{displayDate}</div>
              <div className="caisse-date-banner-refresh">
                Actualisé à {format(lastRefreshed, "HH:mm:ss")}
              </div>
            </div>
          </div>
          <div className="caisse-total-bons-pill">
            {dayBons.length} bon{dayBons.length !== 1 ? "s" : ""} ce jour
          </div>
        </div>

        {loading ? (
          <div className="caisse-loading">
            <div className="caisse-spinner" />
            <span>Chargement de la caisse…</span>
          </div>
        ) : (
          <>
            {/* ── Cash Hero ── */}
            <div className="caisse-cash-hero">
              <div>
                <div className="caisse-cash-label">
                  💰 Total Encaissé ce Jour
                </div>
                <div className="caisse-cash-amount">
                  {fmt(stats.cashIn)} <span>Dh</span>
                </div>
                <div className="caisse-cash-sub">
                  Sur {fmt(stats.grossTotal)} Dh de chiffre d'affaires
                  journalier
                </div>
              </div>
              <div className="caisse-cash-pills">
                <div className="caisse-cash-pill">
                  <div className="caisse-cash-pill-val">{stats.paidFull}</div>
                  <div className="caisse-cash-pill-label">Payés</div>
                </div>
                <div className="caisse-cash-pill">
                  <div className="caisse-cash-pill-val">
                    {stats.partialCount}
                  </div>
                  <div className="caisse-cash-pill-label">Partiels</div>
                </div>
                <div className="caisse-cash-pill">
                  <div className="caisse-cash-pill-val">{stats.totalBons}</div>
                  <div className="caisse-cash-pill-label">Total BL</div>
                </div>
              </div>
            </div>

            {/* ── Espèces / Chèque / Virement breakdown ── */}
            {(stats.especes > 0 ||
              stats.cheques > 0 ||
              stats.virements > 0) && (
              <div className="caisse-especes-row">
                {stats.especes > 0 && (
                  <div className="caisse-especes-card">
                    <div className="icon">💵</div>
                    <div>
                      <div className="info-label">Espèces</div>
                      <div className="info-val">
                        {fmt(stats.especes)} <span>Dh</span>
                      </div>
                    </div>
                  </div>
                )}
                {stats.cheques > 0 && (
                  <div
                    className="caisse-especes-card"
                    style={{
                      background: "linear-gradient(135deg,#eff6ff,#ffffff)",
                      borderColor: "rgba(59,130,246,.2)",
                    }}
                  >
                    <div
                      className="icon"
                      style={{ background: "rgba(59,130,246,.1)" }}
                    >
                      📄
                    </div>
                    <div>
                      <div
                        className="info-label"
                        style={{ color: "rgba(59,130,246,.7)" }}
                      >
                        Chèques
                      </div>
                      <div className="info-val" style={{ color: "#3b82f6" }}>
                        {fmt(stats.cheques)}{" "}
                        <span style={{ color: "rgba(59,130,246,.5)" }}>Dh</span>
                      </div>
                    </div>
                  </div>
                )}
                {stats.virements > 0 && (
                  <div
                    className="caisse-especes-card"
                    style={{
                      background: "linear-gradient(135deg,#faf5ff,#ffffff)",
                      borderColor: "rgba(147,51,234,.2)",
                    }}
                  >
                    <div
                      className="icon"
                      style={{ background: "rgba(147,51,234,.1)" }}
                    >
                      🏦
                    </div>
                    <div>
                      <div
                        className="info-label"
                        style={{ color: "rgba(147,51,234,.7)" }}
                      >
                        Virements
                      </div>
                      <div className="info-val" style={{ color: "#9333ea" }}>
                        {fmt(stats.virements)}{" "}
                        <span style={{ color: "rgba(147,51,234,.5)" }}>Dh</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Stat Cards ── */}
            <div className="caisse-stats-grid">
              <StatCard
                label="Payés intégralement"
                value={fmt(stats.paidFullTotal)}
                icon={<FiCheckCircle />}
                color="#059669"
                sub={`${stats.paidFull} bon(s)`}
              />
              <StatCard
                label="Acomptes reçus"
                value={fmt(stats.partialAdv)}
                icon={<FiTrendingUp />}
                color="#d97706"
                sub={`${stats.partialCount} partiel(s)`}
              />
            </div>

            {/* ── Two-col panels ── */}
            <div className="caisse-two-col">
              <div className="caisse-panel">
                <div className="caisse-panel-header">
                  <div className="caisse-panel-title">
                    <FiDollarSign /> Répartition par mode de paiement
                  </div>
                </div>
                <div className="caisse-panel-body">
                  {stats.pmData.length === 0 ? (
                    <div className="caisse-empty">
                      <div className="caisse-empty-icon">💳</div>
                      <div className="caisse-empty-text">
                        Aucun paiement ce jour
                      </div>
                    </div>
                  ) : (
                    <PaymentBar data={stats.pmData} />
                  )}
                </div>
              </div>

              <div className="caisse-panel">
                <div className="caisse-panel-header">
                  <div className="caisse-panel-title">
                    <FiList /> Répartition par statut
                  </div>
                </div>
                <div className="caisse-panel-body">
                  {Object.keys(stats.byStatus).length === 0 ? (
                    <div className="caisse-empty">
                      <div className="caisse-empty-icon">📋</div>
                      <div className="caisse-empty-text">
                        Aucun bon ce jour
                      </div>
                    </div>
                  ) : (
                    <div className="caisse-status-grid">
                      {Object.entries(stats.byStatus)
                        .sort((a, b) => b[1] - a[1])
                        .map(([status, count]) => {
                          const sm =
                            STATUS_META[status] || STATUS_META.brouillon;
                          const pct = stats.totalBons
                            ? (count / stats.totalBons) * 100
                            : 0;
                          return (
                            <div key={status} className="caisse-status-row">
                              <div className="caisse-status-label">
                                <span
                                  className="caisse-status-badge"
                                  style={{
                                    color: sm.color,
                                    background: sm.bg,
                                  }}
                                >
                                  {sm.icon}
                                </span>
                                <span style={{ color: "#6b7280", fontSize: 12 }}>
                                  {sm.label}
                                </span>
                              </div>
                              <div className="caisse-status-bar-wrap">
                                <div
                                  className="caisse-status-bar-fill"
                                  style={{
                                    width: `${pct}%`,
                                    background: sm.color,
                                  }}
                                />
                              </div>
                              <div className="caisse-status-count">{count}</div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Transactions Table ── */}
            <div className="caisse-table-panel">
              <div className="caisse-table-header">
                <div className="caisse-table-title">
                  <FiList /> Transactions du{" "}
                  <span style={{ color: "#059669" }}>{displayDate}</span>
                </div>
                <select
                  className="caisse-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tous les statuts</option>
                  {Object.entries(STATUS_META).map(([v, m]) => (
                    <option key={v} value={v}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="caisse-empty">
                  <div className="caisse-empty-icon">🧾</div>
                  <div className="caisse-empty-text">
                    {dayBons.length === 0
                      ? "Aucun bon de livraison pour cette date"
                      : "Aucun résultat pour ce filtre"}
                  </div>
                </div>
              ) : (
                <div className="caisse-table-wrap">
                  <table className="caisse-table">
                    <thead>
                      <tr>
                        <th>N° BL</th>
                        <th>Client</th>
                        <th>Statut</th>
                        <th>Paiement</th>
                        <th>Total</th>
                        <th>Encaissé (jour)</th>
                        <th>Reste</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((bon) => (
                        <TxRow key={bon.id} bon={bon} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Footer summary ── */}
            {filtered.length > 0 && (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "14px 20px",
                  display: "flex",
                  gap: 32,
                  flexWrap: "wrap",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#6b7280" }}>
                  <strong style={{ color: "#111827" }}>
                    {filtered.length}
                  </strong>{" "}
                  transaction(s)
                </span>
                <span style={{ color: "#6b7280" }}>
                  Total :{" "}
                  <strong style={{ color: "#111827" }}>
                    {fmt(
                      filtered.reduce(
                        (s, b) => s + parseFloat(b.total || 0),
                        0,
                      ),
                    )}{" "}
                    Dh
                  </strong>
                </span>
                <span style={{ color: "#6b7280" }}>
                  Encaissé :{" "}
                  <strong style={{ color: "#059669" }}>
                    {/* ✅ Use paidOnDate for accurate daily total */}
                    {fmt(
                      filtered.reduce(
                        (s, b) => s + parseFloat(b.paidOnDate || 0),
                        0,
                      ),
                    )}{" "}
                    Dh
                  </strong>
                </span>
                <span style={{ color: "#6b7280" }}>
                  Reste :{" "}
                  <strong style={{ color: "#d97706" }}>
                    {fmt(
                      filtered.reduce((s, b) => {
                        if (["annulée", "payée"].includes(b.status)) return s;
                        return s + parseFloat(b.remainingAmount || 0);
                      }, 0),
                    )}{" "}
                    Dh
                  </strong>
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}