import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Database,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Table as TableIcon,
  Play,
  X,
  RefreshCw,
  Clock,
  Download,
  Edit3,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Trash2,
  LayoutDashboard,
  Pin,
  BookOpen,
  GitBranch,
  LogOut,
  Server,
  Network,
} from 'lucide-react';
import AuthPage from './AuthPage.jsx';
import AutoChart from './AutoChart.jsx';
import Dashboard from './Dashboard.jsx';
import QueryLibrary from './QueryLibrary.jsx';
import AnalysisThread from './AnalysisThread.jsx';
import DataSources from './DataSources.jsx';
import VisualSchemaMap from './VisualSchemaMap.jsx';
import { recommendChart } from './chartUtils.js';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const HISTORY_KEY = 'sqhelp_query_history';
const PINS_KEY    = 'sqhelp_pinned_charts';

/* ─── helpers ─────────────────────────────────────────── */
const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
};
const saveHistory = (h) => localStorage.setItem(HISTORY_KEY, JSON.stringify(h));

const exportCSV = (columns, data, label = 'results') => {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [columns.join(','), ...data.map(row => columns.map(c => escape(row[c])).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${label}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const fmt = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ─────────────────────────────────────────────────────── */

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeConnectionId, setActiveConnectionId] = useState(null);

  // ── Page routing ──────────────────────────────────────
  const [currentPage, setCurrentPage] = useState('query'); // 'query' | 'dashboard' | 'library' | 'thread' | 'datasources'

  const [schema, setSchema]                   = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [userQuery, setUserQuery]             = useState('');
  const [chatHistory, setChatHistory]         = useState([]);
  const [pendingQuery, setPendingQuery]       = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [showMap, setShowMap]                 = useState(false);

  // ── Query History ─────────────────────────────────────
  const [history, setHistory]                 = useState(loadHistory);
  const [historyOpen, setHistoryOpen]         = useState(false);

  // ── Inline SQL Editor ─────────────────────────────────
  const [editedSQL, setEditedSQL]             = useState('');
  const [originalSQL, setOriginalSQL]         = useState('');
  const [sqlEdited, setSqlEdited]             = useState(false);

  const chatEndRef = useRef(null);

  /* mount */
  useEffect(() => { 
    const initAuth = async () => {
      const token = localStorage.getItem('sqhelp_token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const res = await axios.get(`${API_BASE_URL}/auth/me`);
          setCurrentUser(res.data);
        } catch {
          localStorage.removeItem('sqhelp_token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setIsAuthLoading(false);
    };

    initAuth();
  }, []);

  /* load data when user logs in */
  useEffect(() => {
    if (currentUser) {
      checkConnection();
      loadSchema();
    }
  }, [currentUser]);

  /* apply connection ID and reload */
  useEffect(() => {
    if (activeConnectionId === null) {
      delete axios.defaults.headers.common['X-Connection-ID'];
    } else {
      axios.defaults.headers.common['X-Connection-ID'] = activeConnectionId;
    }
    
    // Only reload if user is logged in
    if (currentUser) {
      setSchema(null);
      checkConnection();
      loadSchema();
    }
  }, [activeConnectionId]);

  /* auto-scroll */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  /* sync editedSQL when pendingQuery changes */
  useEffect(() => {
    if (pendingQuery) {
      setEditedSQL(pendingQuery.sql);
      setOriginalSQL(pendingQuery.sql);
      setSqlEdited(false);
    }
  }, [pendingQuery?.sql]);

  /* persist history */
  useEffect(() => { saveHistory(history); }, [history]);

  /* ── API helpers ──────────────────────────────────── */
  const checkConnection = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/test-connection`);
      setConnectionStatus(r.data.success ? 'connected' : 'disconnected');
    } catch { setConnectionStatus('error'); }
  };

  const loadSchema = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/schema`);
      setSchema(r.data);
    } catch (e) { console.error('Error loading schema:', e); }
  };

  /* ── Submit NL query ──────────────────────────────── */
  const handleSubmitQuery = async (e) => {
    e.preventDefault();
    if (!userQuery.trim() || loading) return;
    const query = userQuery.trim();
    setUserQuery('');
    setLoading(true);
    setChatHistory(prev => [...prev, { type: 'user', content: query, timestamp: new Date() }]);

    try {
      const r = await axios.post(`${API_BASE_URL}/generate-sql`, { query });
      if (r.data.success) {
        setPendingQuery({
          sql: r.data.sql,
          explanation: r.data.explanation,
          warnings: r.data.warnings || [],
          errors: r.data.errors || [],
          risk_level: r.data.risk_level,
          nlQuery: query,
        });
        setChatHistory(prev => [...prev, {
          type: 'assistant',
          content: r.data.explanation,
          sql: r.data.sql,
          warnings: r.data.warnings || [],
          risk_level: r.data.risk_level,
          timestamp: new Date(),
        }]);
      } else {
        setChatHistory(prev => [...prev, {
          type: 'error', content: r.data.message || 'Failed to generate SQL',
          errors: r.data.errors || [], timestamp: new Date(),
        }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, {
        type: 'error', content: err.response?.data?.detail || 'An error occurred', timestamp: new Date(),
      }]);
    } finally { setLoading(false); }
  };

  /* ── Execute SQL ──────────────────────────────────── */
  const executeQuery = async () => {
    if (!pendingQuery) return;
    setLoading(true);
    const sqlToRun = editedSQL.trim();

    try {
      const r = await axios.post(`${API_BASE_URL}/execute-sql`, { sql: sqlToRun });

      // save to history
      const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        nlQuery: pendingQuery.nlQuery || '',
        sql: sqlToRun,
        success: r.data.success,
        rowCount: r.data.row_count ?? r.data.affected_rows ?? null,
      };
      setHistory(prev => [entry, ...prev].slice(0, 50));

      setChatHistory(prev => [...prev, {
        type: 'result',
        content: r.data.success ? 'Query executed successfully!' : 'Query execution failed',
        result: r.data,
        sql: sqlToRun,
        nlQuery: pendingQuery.nlQuery || '',
        timestamp: new Date(),
      }]);

      if (r.data.success) { setPendingQuery(null); loadSchema(); }
    } catch (err) {
      setChatHistory(prev => [...prev, {
        type: 'error', content: err.response?.data?.detail || 'Failed to execute query', timestamp: new Date(),
      }]);
    } finally { setLoading(false); }
  };

  /* ── Cancel ───────────────────────────────────────── */
  const cancelQuery = () => {
    setPendingQuery(null);
    setChatHistory(prev => [...prev, { type: 'system', content: 'Query execution cancelled', timestamp: new Date() }]);
  };

  /* ── History ──────────────────────────────────────── */
  const rerunFromHistory = (entry) => {
    setUserQuery(entry.nlQuery || entry.sql);
    setHistoryOpen(false);
  };
  const clearHistory = () => { setHistory([]); };

  /* ── SQL editor ───────────────────────────────────── */
  const handleSQLEdit = (val) => {
    setEditedSQL(val);
    setSqlEdited(val !== originalSQL);
  };
  const resetSQL = () => { setEditedSQL(originalSQL); setSqlEdited(false); };

  /* ── Pin to Dashboard ─────────────────────────────── */
  const pinToDashboard = (result, sql, nlQuery) => {
    const existing = JSON.parse(localStorage.getItem(PINS_KEY) || '[]');
    const pin = {
      id: Date.now(),
      sql,
      nlQuery: nlQuery || '',
      title: nlQuery || sql.slice(0, 60),
      columns: result.columns,
      data: result.data,
      rowCount: result.row_count,
      pinnedAt: new Date().toISOString(),
    };
    const updated = [...existing, pin];
    localStorage.setItem(PINS_KEY, JSON.stringify(updated));
    // Flash feedback
    alert('Chart pinned to dashboard!');
  };

  /* ── Render a chat message ────────────────────────── */
  const renderMessage = (message, index) => {
    switch (message.type) {
      case 'user':
        return (
          <div key={index} className="message user-message fade-in">
            <div className="message-content">{message.content}</div>
            <div className="message-time">{fmt(message.timestamp)}</div>
          </div>
        );

      case 'assistant':
        return (
          <div key={index} className="message assistant-message fade-in">
            <div className="message-header">
              <Database size={16} />
              <span>SQL Assistant</span>
              <span className="message-time-inline">{fmt(message.timestamp)}</span>
            </div>
            <div className="message-content">
              <p>{message.content}</p>
              {message.sql && (
                <div className="sql-block"><code>{message.sql}</code></div>
              )}
              {message.warnings?.length > 0 && (
                <div className="warnings">
                  {message.warnings.map((w, i) => (
                    <div key={i} className="warning-item"><AlertTriangle size={14} /><span>{w}</span></div>
                  ))}
                </div>
              )}
              {message.risk_level && (
                <div className={`risk-badge risk-${message.risk_level}`}>Risk: {message.risk_level}</div>
              )}
            </div>
          </div>
        );

      case 'result':
        const hasData = message.result.success && message.result.data?.length > 0;
        const rec = hasData ? recommendChart(message.result.columns, message.result.data) : null;

        return (
          <div key={index} className="message result-message fade-in">
            <div className="message-header">
              {message.result.success
                ? <CheckCircle size={16} className="text-green" />
                : <XCircle size={16} className="text-red" />}
              <span>{message.content}</span>
              <span className="message-time-inline">{fmt(message.timestamp)}</span>
            </div>

            {/* Action bar: Export CSV + Pin to Dashboard */}
            {hasData && (
              <div className="result-actions">
                {rec && (
                  <button
                    className="btn-pin"
                    onClick={() => pinToDashboard(message.result, message.sql, message.nlQuery)}
                    title="Pin chart to Dashboard"
                  >
                    <Pin size={14} />
                    Pin to Dashboard
                  </button>
                )}
                <button
                  className="btn-export"
                  onClick={() => exportCSV(message.result.columns, message.result.data, 'query')}
                  title="Download as CSV"
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
            )}

            {/* ── Interactive Auto-Visualization Chart ── */}
            {hasData && (
              <InteractiveChart
                columns={message.result.columns}
                data={message.result.data}
              />
            )}

            {/* Data table */}
            {message.result.success && message.result.data && (
              <div className="result-table-container">
                <table className="result-table">
                  <thead>
                    <tr>{message.result.columns?.map((c, i) => <th key={i}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {message.result.data.map((row, i) => (
                      <tr key={i}>
                        {message.result.columns?.map((c, j) => <td key={j}>{row[c]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="result-info">{message.result.row_count} row(s) returned</div>
              </div>
            )}
            {message.result.success && message.result.affected_rows !== undefined && (
              <div className="result-info">{message.result.affected_rows} row(s) affected</div>
            )}
            {!message.result.success && (
              <div className="error-details">{message.result.message}</div>
            )}
          </div>
        );

      case 'error':
        return (
          <div key={index} className="message error-message fade-in">
            <div className="message-header">
              <XCircle size={16} /><span>Error</span>
              <span className="message-time-inline">{fmt(message.timestamp)}</span>
            </div>
            <div className="message-content">{message.content}</div>
            {message.errors?.length > 0 && (
              <ul className="error-list">{message.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            )}
          </div>
        );

      case 'system':
        return (
          <div key={index} className="message system-message fade-in">
            <span>{message.content}</span>
          </div>
        );

      default: return null;
    }
  };

  /* ═══════════════════════════════════════════════════════
   *  AUTHENTICATION & APP WRAPPER
   * ═══════════════════════════════════════════════════════ */
  if (isAuthLoading) {
    return (
      <div className="app fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Loader2 size={48} className="spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onLogin={(user) => setCurrentUser(user)} />;
  }

  /* ═══════════════════════════════════════════════════════
   *  PAGE ROUTING
   * ═══════════════════════════════════════════════════════ */
  if (currentPage === 'dashboard') {
    return <Dashboard onNavigateBack={() => setCurrentPage('query')} />;
  }

  if (currentPage === 'library') {
    return (
      <QueryLibrary
        onNavigateBack={() => setCurrentPage('query')}
        onRunQuery={(q) => {
          setCurrentPage('query');
          setUserQuery(q);
        }}
      />
    );
  }

  if (currentPage === 'thread') {
    return <AnalysisThread onNavigateBack={() => setCurrentPage('query')} />;
  }

  if (currentPage === 'datasources') {
    return (
      <DataSources 
        onNavigateBack={() => setCurrentPage('query')} 
        activeConnectionId={activeConnectionId}
        setActiveConnectionId={setActiveConnectionId}
      />
    );
  }

  /* ═══════════════════════════════════════════════════════
   *  QUERY PAGE (main view)
   * ═══════════════════════════════════════════════════════ */
  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <Database size={28} />
            <div>
              <h1>SQheLp</h1>
              <p>Democratize data access for everyone</p>
            </div>
          </div>
          <div className="header-right">
            {/* Data Sources navigation */}
            <button
              className="icon-button"
              onClick={() => setCurrentPage('datasources')}
              title="Manage Workspaces & Data"
            >
              <Server size={18} />
            </button>

            {/* Analysis Thread navigation */}
            <button
              className="icon-button"
              onClick={() => setCurrentPage('thread')}
              title="Analysis Thread"
            >
              <GitBranch size={18} />
            </button>

            {/* Query Library navigation */}
            <button
              className="icon-button"
              onClick={() => setCurrentPage('library')}
              title="Query Library"
            >
              <BookOpen size={18} />
            </button>

            {/* Dashboard navigation */}
            <button
              className="icon-button dashboard-btn"
              onClick={() => setCurrentPage('dashboard')}
              title="Insights Dashboard"
            >
              <LayoutDashboard size={18} />
            </button>

            {/* History toggle */}
            <button
              className={`icon-button history-btn ${historyOpen ? 'active' : ''}`}
              onClick={() => setHistoryOpen(o => !o)}
              title="Query History"
            >
              <Clock size={18} />
              {history.length > 0 && <span className="history-badge">{history.length}</span>}
            </button>

            <div className={`connection-status status-${connectionStatus}`}>
              <div className="status-dot" />
              <span>
                {connectionStatus === 'connected'    && 'Connected'}
                {connectionStatus === 'disconnected' && 'Disconnected'}
                {connectionStatus === 'checking'     && 'Checking...'}
                {connectionStatus === 'error'        && 'Error'}
              </span>
            </div>
            <button className="icon-button" onClick={() => { loadSchema(); checkConnection(); }} title="Refresh">
              <RefreshCw size={18} />
            </button>

            {/* Logout */}
            <button
              className="icon-button"
              onClick={() => {
                localStorage.removeItem('sqhelp_token');
                delete axios.defaults.headers.common['Authorization'];
                setCurrentUser(null);
              }}
              title="Log Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="main-content">

        {/* History Drawer */}
        {historyOpen && (
          <aside className="history-panel fade-in">
            <div className="history-header">
              <div className="history-title">
                <Clock size={16} />
                <span>Query History</span>
                <span className="history-count">{history.length}</span>
              </div>
              <button className="btn-clear-history" onClick={clearHistory} title="Clear all">
                <Trash2 size={14} /> Clear
              </button>
            </div>

            {history.length === 0 ? (
              <div className="history-empty">No queries yet</div>
            ) : (
              <div className="history-list">
                {history.map((entry) => (
                  <div key={entry.id} className="history-item" onClick={() => rerunFromHistory(entry)}>
                    <div className="history-item-header">
                      <span className={`history-status ${entry.success ? 'ok' : 'fail'}`}>
                        {entry.success ? '\u2713' : '\u2717'}
                      </span>
                      <span className="history-item-time">
                        {new Date(entry.timestamp).toLocaleString([], {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      {entry.rowCount !== null && (
                        <span className="history-rows">{entry.rowCount} rows</span>
                      )}
                    </div>
                    {entry.nlQuery && (
                      <div className="history-nl">{entry.nlQuery}</div>
                    )}
                    <div className="history-sql">{entry.sql}</div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* Sidebar – Schema Viewer */}
        <aside className="sidebar">
          <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TableIcon size={18} />
              <h2>Database Schema</h2>
            </div>
            {schema && schema.tables?.length > 0 && (
              <button 
                className="dash-btn dash-btn-ghost" 
                onClick={() => setShowMap(true)} 
                title="View Visual ER Map"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem', height: '28px', background: '#f8fafc', color: '#475569' }}
              >
                <Network size={12} />
                Map
              </button>
            )}
          </div>
          {schema ? (
            <div className="schema-list">
              {schema.tables.map(table => (
                <SchemaTable key={table} table={table} schema={schema.schema[table]} />
              ))}
            </div>
          ) : (
            <div className="loading-schema">
              <Loader2 size={24} className="spin" />
              <p>Loading schema...</p>
            </div>
          )}
        </aside>

        {/* Main Chat Area */}
        <main className="chat-container">
          <div className="chat-messages">
            {chatHistory.length === 0 ? (
              <div className="empty-state">
                <Database size={48} />
                <h2>Welcome to SQheLp</h2>
                <p>Ask questions about your data in plain English!</p>
                <div className="example-queries">
                  <p className="example-title">Try asking:</p>
                  {[
                    'Show all products with price greater than 1000',
                    'Show total stock by category name',
                    'Show order count by status',
                  ].map(q => (
                    <button key={q} onClick={() => setUserQuery(q)}>"{q}"</button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg, i) => renderMessage(msg, i))
            )}
            {loading && (
              <div className="message assistant-message fade-in">
                <div className="message-header">
                  <Loader2 size={16} className="spin" />
                  <span>Generating SQL...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Pending Query Approval (Inline SQL Editor) */}
          {pendingQuery && !loading && (
            <div className="approval-panel fade-in">
              <div className="approval-header">
                <AlertTriangle size={20} />
                <h3>Review and Approve Query</h3>
                <span className={`risk-badge risk-${pendingQuery.risk_level} risk-badge-inline`}>
                  Risk: {pendingQuery.risk_level}
                </span>
              </div>

              <div className="approval-content">
                <div className="sql-editor-wrapper">
                  <div className="sql-editor-toolbar">
                    <div className="sql-editor-label">
                      <Edit3 size={13} />
                      <span>SQL Query {sqlEdited && <em className="edited-tag">(edited)</em>}</span>
                    </div>
                    {sqlEdited && (
                      <button className="btn-reset-sql" onClick={resetSQL} title="Restore original">
                        <RotateCcw size={13} /> Reset
                      </button>
                    )}
                  </div>
                  <textarea
                    className="sql-editor"
                    value={editedSQL}
                    onChange={e => handleSQLEdit(e.target.value)}
                    spellCheck={false}
                    rows={Math.min(8, editedSQL.split('\n').length + 1)}
                  />
                </div>

                <p className="approval-explanation">{pendingQuery.explanation}</p>

                {pendingQuery.warnings.length > 0 && (
                  <div className="approval-warnings">
                    {pendingQuery.warnings.map((w, i) => (
                      <div key={i} className="warning-item"><AlertTriangle size={14} /><span>{w}</span></div>
                    ))}
                  </div>
                )}
                {pendingQuery.errors.length > 0 && (
                  <div className="approval-errors">
                    {pendingQuery.errors.map((e, i) => (
                      <div key={i} className="error-item"><XCircle size={14} /><span>{e}</span></div>
                    ))}
                  </div>
                )}
              </div>

              <div className="approval-actions">
                <button className="btn btn-cancel" onClick={cancelQuery} disabled={loading}>
                  <X size={18} /> Cancel
                </button>
                <button
                  className="btn btn-execute"
                  onClick={executeQuery}
                  disabled={loading || !editedSQL.trim() || pendingQuery.errors.length > 0}
                >
                  <Play size={18} /> Execute Query
                </button>
              </div>
            </div>
          )}

          {/* Input Form */}
          <form className="chat-input-form" onSubmit={handleSubmitQuery}>
            <input
              type="text"
              className="chat-input"
              placeholder="Ask a question about your data... (e.g., 'Show all orders from last month')"
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="send-button" disabled={loading || !userQuery.trim()}>
              {loading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
            </button>
          </form>
        </main>
      </div>

      {/* Visual Schema Map Modal */}
      {showMap && schema && (
        <VisualSchemaMap 
          schema={schema} 
          onClose={() => setShowMap(false)} 
        />
      )}
    </div>
  );
}

/* ── Collapsible schema table component ────────────────── */
function SchemaTable({ table, schema }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="schema-table">
      <div className="table-name" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        <TableIcon size={14} />
        <span>{table}</span>
        <span className="table-col-count">{schema?.length ?? 0}</span>
        <span className="schema-chevron">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </div>
      {open && (
        <div className="table-columns">
          {schema?.map((col, i) => (
            <div key={i} className="column-item">
              <span className="column-name">{col.Field}</span>
              <span className="column-type">{col.Type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Interactive Chart Component ──────────────────────── */
function InteractiveChart({ columns, data }) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter numeric columns
  const numericCols = useMemo(() => {
    if (!columns || !data || data.length === 0) return [];
    return columns.filter(col => {
      return data.some(row => {
        const v = row[col];
        if (v === null || v === undefined || v === '') return false;
        const n = Number(v);
        return !isNaN(n) && isFinite(n);
      });
    });
  }, [columns, data]);

  // Set default state variables
  const [chartType, setChartType] = useState('bar');
  const [labelKey, setLabelKey] = useState(columns[0] || '');
  const [valueKey, setValueKey] = useState(numericCols[0] || columns[1] || columns[0] || '');

  // Reset keys if columns change
  useEffect(() => {
    if (columns && columns.length > 0) {
      setLabelKey(columns[0]);
      setValueKey(numericCols[0] || columns[1] || columns[0]);
    }
  }, [columns, numericCols]);

  if (!columns || !data || data.length === 0) return null;

  if (numericCols.length === 0) {
    return (
      <div style={{ padding: '0.5rem 0', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
        No numeric columns available in these results to visualize.
      </div>
    );
  }

  const customConfig = {
    chartType,
    labelKey,
    valueKeys: [valueKey],
    title: `${valueKey} by ${labelKey}`
  };

  return (
    <div className="interactive-chart" style={{ marginTop: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1rem',
          background: '#f1f5f9',
          border: 'none',
          fontWeight: '500',
          color: '#334155',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '0.85rem'
        }}
      >
        <Network size={14} color="#6366f1" />
        {isOpen ? 'Hide Visualization Map' : 'Show Visualization Map'}
      </button>

      {isOpen && (
        <div style={{ padding: '1rem', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
          {/* Custom Settings Selection Row */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>Chart Type</label>
              <select 
                value={chartType} 
                onChange={e => setChartType(e.target.value)} 
                style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#f8fafc', color: '#334155' }}
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>X-Axis (Label)</label>
              <select 
                value={labelKey} 
                onChange={e => setLabelKey(e.target.value)} 
                style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#f8fafc', color: '#334155' }}
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>Y-Axis (Value)</label>
              <select 
                value={valueKey} 
                onChange={e => setValueKey(e.target.value)} 
                style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#f8fafc', color: '#334155' }}
              >
                {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Chart Workspace */}
          <AutoChart 
            columns={columns}
            data={data}
            height={260}
            customConfig={customConfig}
          />
        </div>
      )}
    </div>
  );
}

export default App;
