import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, Trash2, RefreshCw,
  Loader2, BarChart3, X, Clock, Database,
} from 'lucide-react';
import AutoChart from './AutoChart.jsx';
import { recommendChart } from './chartUtils.js';

const API_BASE_URL = 'http://localhost:8000/api';
const PINS_KEY = 'sqhelp_pinned_charts';

/* ── localStorage helpers ───────────────────────────────── */
const loadPins = () => {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]'); }
  catch { return []; }
};
const savePins = (p) => localStorage.setItem(PINS_KEY, JSON.stringify(p));

/* ════════════════════════════════════════════════════════ */

export default function Dashboard({ onNavigateBack }) {
  const [pins, setPins]           = useState(loadPins);
  const [refreshing, setRefreshing] = useState({});   // id → bool
  const [lastRefresh, setLastRefresh] = useState({});  // id → Date

  useEffect(() => { savePins(pins); }, [pins]);

  /* ── refresh a single pinned chart ────────────────── */
  const refreshPin = useCallback(async (pin) => {
    setRefreshing(prev => ({ ...prev, [pin.id]: true }));
    try {
      const r = await axios.post(`${API_BASE_URL}/execute-sql`, { sql: pin.sql });
      if (r.data.success && r.data.data) {
        setPins(prev => prev.map(p =>
          p.id === pin.id
            ? { ...p, columns: r.data.columns, data: r.data.data, rowCount: r.data.row_count }
            : p
        ));
        setLastRefresh(prev => ({ ...prev, [pin.id]: new Date() }));
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(prev => ({ ...prev, [pin.id]: false }));
    }
  }, []);

  /* ── refresh ALL pinned charts ────────────────────── */
  const refreshAll = useCallback(() => {
    pins.forEach(pin => refreshPin(pin));
  }, [pins, refreshPin]);

  /* ── remove a pin ──────────────────────────────────── */
  const removePin = (id) => {
    setPins(prev => prev.filter(p => p.id !== id));
  };

  const clearAll = () => setPins([]);

  /* ── render ────────────────────────────────────────── */
  return (
    <div className="dashboard-page">

      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-header-left">
            <LayoutDashboard size={26} />
            <div>
              <h1>Insights Dashboard</h1>
              <p>{pins.length} pinned visualization{pins.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="dashboard-header-right">
            {pins.length > 0 && (
              <>
                <button className="dash-btn dash-btn-ghost" onClick={refreshAll}>
                  <RefreshCw size={15} /> Refresh All
                </button>
                <button className="dash-btn dash-btn-danger" onClick={clearAll}>
                  <Trash2 size={15} /> Clear All
                </button>
              </>
            )}
            <button className="dash-btn dash-btn-primary" onClick={onNavigateBack}>
              <Database size={15} /> Back to Query
            </button>
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="dashboard-body">
        {pins.length === 0 ? (
          <div className="dashboard-empty">
            <BarChart3 size={56} />
            <h2>No pinned charts yet</h2>
            <p>
              Run queries in the main view and click the <strong>Pin to Dashboard</strong> button
              on any chart to add it here.
            </p>
            <button className="dash-btn dash-btn-primary" onClick={onNavigateBack}>
              <Database size={15} /> Go to Query View
            </button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {pins.map((pin) => (
              <DashboardCard
                key={pin.id}
                pin={pin}
                refreshing={refreshing[pin.id]}
                lastRefresh={lastRefresh[pin.id]}
                onRefresh={() => refreshPin(pin)}
                onRemove={() => removePin(pin.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── individual card ────────────────────────────────────── */
function DashboardCard({ pin, refreshing, lastRefresh, onRefresh, onRemove }) {
  const rec = useMemo(
    () => recommendChart(pin.columns, pin.data),
    [pin.columns, pin.data]
  );

  return (
    <div className="dash-card fade-in">
      <div className="dash-card-header">
        <div className="dash-card-title">
          <BarChart3 size={15} />
          <span>{pin.title || rec?.title || 'Chart'}</span>
        </div>
        <div className="dash-card-actions">
          {lastRefresh && (
            <span className="dash-card-time">
              <Clock size={11} />
              {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            className="dash-icon-btn"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh data"
          >
            {refreshing
              ? <Loader2 size={14} className="spin" />
              : <RefreshCw size={14} />}
          </button>
          <button className="dash-icon-btn dash-icon-danger" onClick={onRemove} title="Remove">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="dash-card-body">
        {rec ? (
          <AutoChart columns={pin.columns} data={pin.data} height={260} />
        ) : (
          <div className="dash-card-no-chart">Cannot visualize this data</div>
        )}
      </div>

      <div className="dash-card-footer">
        <code className="dash-card-sql">{pin.sql}</code>
        <span className="dash-card-rows">{pin.rowCount ?? '?'} rows</span>
      </div>
    </div>
  );
}
