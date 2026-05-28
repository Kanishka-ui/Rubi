import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  GitBranch, Send, Loader2, CheckCircle, XCircle,
  ChevronRight, Filter, BarChart3, Calendar, Hash,
  Database, X, Play, Trash2, Plus,
} from 'lucide-react';
import AutoChart from './AutoChart.jsx';
import { recommendChart } from './chartUtils.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/* ═══════════════════════════════════════════════════════
 *  ANALYSIS THREAD PAGE
 * ═══════════════════════════════════════════════════════ */
export default function AnalysisThread({ onNavigateBack }) {
  const [steps, setSteps]         = useState([]);    // each step = { id, nlQuery, sql, explanation, result, timestamp }
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps, loading]);

  /* breadcrumbs: summarised trail of queries */
  const breadcrumbs = useMemo(() => {
    return steps.filter(s => s.result?.success).map(s => {
      const short = s.nlQuery.length > 30 ? s.nlQuery.slice(0, 28) + '...' : s.nlQuery;
      return { id: s.id, label: short };
    });
  }, [steps]);

  /* latest successful SQL for follow-up context */
  const lastSQL = useMemo(() => {
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].result?.success && steps[i].sql) return steps[i].sql;
    }
    return null;
  }, [steps]);

  /* ── submit a query (first or follow-up) ────────────── */
  const handleSubmit = async (queryText) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;
    setInput('');
    setError(null);
    setLoading(true);

    const stepId = Date.now();

    try {
      // Step 1: generate SQL (follow-up or fresh)
      const isFollowUp = !!lastSQL;
      const genURL = isFollowUp
        ? `${API_BASE_URL}/generate-followup`
        : `${API_BASE_URL}/generate-sql`;
      const genBody = isFollowUp
        ? { query: q, previous_sql: lastSQL }
        : { query: q };

      const genRes = await axios.post(genURL, genBody);
      if (!genRes.data.success) {
        setError(genRes.data.message || 'Failed to generate SQL');
        setLoading(false);
        return;
      }

      // Step 2: auto-execute the generated SQL
      const execRes = await axios.post(`${API_BASE_URL}/execute-sql`, { sql: genRes.data.sql });

      const step = {
        id: stepId,
        nlQuery: q,
        sql: genRes.data.sql,
        explanation: genRes.data.explanation,
        risk_level: genRes.data.risk_level,
        result: execRes.data,
        timestamp: new Date(),
        isFollowUp,
      };

      setSteps(prev => [...prev, step]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => { e.preventDefault(); handleSubmit(); };

  /* quick-action refine shortcuts */
  const refine = (text) => handleSubmit(text);

  const clearThread = () => { setSteps([]); setError(null); };

  /* ── render ─────────────────────────────────────────── */
  return (
    <div className="at-page">

      {/* Header */}
      <header className="at-header">
        <div className="at-header-content">
          <div className="at-header-left">
            <GitBranch size={26} />
            <div>
              <h1>Analysis Thread</h1>
              <p>Conversational data exploration</p>
            </div>
          </div>
          <div className="at-header-right">
            {steps.length > 0 && (
              <button className="dash-btn dash-btn-danger" onClick={clearThread}>
                <Trash2 size={15} /> New Thread
              </button>
            )}
            <button className="dash-btn dash-btn-primary" onClick={onNavigateBack}>
              <Database size={15} /> Back to Query
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb trail */}
      {breadcrumbs.length > 0 && (
        <div className="at-breadcrumbs">
          <div className="at-breadcrumb-inner">
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={bc.id}>
                {i > 0 && <ChevronRight size={14} className="at-bc-sep" />}
                <span className="at-bc-item">{bc.label}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Thread body */}
      <div className="at-body">
        {steps.length === 0 && !loading ? (
          <div className="at-empty">
            <GitBranch size={56} />
            <h2>Start an Analysis Thread</h2>
            <p>Ask your first question to begin exploring. Each follow-up query builds on the previous result.</p>
            <div className="at-starter-chips">
              {[
                'Show me the top 10 customers by total order value',
                'List all products with low stock',
                'Show orders from this month',
              ].map(q => (
                <button key={q} className="at-chip" onClick={() => { setInput(q); }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="at-thread">
            {steps.map((step, idx) => (
              <ThreadStep
                key={step.id}
                step={step}
                stepNumber={idx + 1}
                onRefine={refine}
              />
            ))}

            {loading && (
              <div className="at-step fade-in">
                <div className="at-step-loader">
                  <Loader2 size={20} className="spin" />
                  <span>Analysing...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="at-step at-step-error fade-in">
                <XCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <form className="at-input-bar" onSubmit={handleFormSubmit}>
        <input
          type="text"
          placeholder={lastSQL
            ? 'Ask a follow-up question to refine the results...'
            : 'Ask your first question to start exploring...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
}

/* ── Single step in the thread ─────────────────────────── */
function ThreadStep({ step, stepNumber, onRefine }) {
  const hasData = step.result?.success && step.result.data?.length > 0;
  const rec = hasData ? recommendChart(step.result.columns, step.result.data) : null;

  const quickActions = [];
  if (hasData) {
    // Suggest context-aware refine actions
    const cols = step.result.columns || [];
    const hasNumeric = cols.some(c =>
      step.result.data[0] && !isNaN(Number(step.result.data[0][c]))
    );
    const hasCategory = cols.some(c =>
      step.result.data[0] && isNaN(Number(step.result.data[0][c]))
    );

    quickActions.push({ label: 'Filter further', icon: Filter, prompt: 'Filter these results where ' });
    if (hasNumeric) quickActions.push({ label: 'Sort by value', icon: Hash, prompt: 'Sort these results by the highest value' });
    if (hasCategory) quickActions.push({ label: 'Group & count', icon: BarChart3, prompt: 'Group these results and show counts' });
    quickActions.push({ label: 'Show only top 5', icon: ChevronRight, prompt: 'Show only the top 5 from these results' });
  }

  return (
    <div className={`at-step fade-in ${step.isFollowUp ? 'at-step-followup' : ''}`}>
      {/* User question bubble */}
      <div className="at-step-question">
        <div className="at-step-badge">{step.isFollowUp ? 'Follow-up' : 'Step'} {stepNumber}</div>
        <div className="at-step-nl">{step.nlQuery}</div>
      </div>

      {/* SQL preview */}
      <div className="at-step-sql">
        <code>{step.sql}</code>
      </div>

      {/* Explanation */}
      <p className="at-step-explanation">{step.explanation}</p>

      {/* Result */}
      {step.result?.success ? (
        <>
          {/* Chart */}
          {rec && (
            <AutoChart columns={step.result.columns} data={step.result.data} height={240} />
          )}

          {/* Table */}
          {hasData && (
            <div className="at-table-wrap">
              <table className="result-table">
                <thead>
                  <tr>{step.result.columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {step.result.data.slice(0, 20).map((row, i) => (
                    <tr key={i}>
                      {step.result.columns.map((c, j) => <td key={j}>{row[c]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="at-table-info">
                {step.result.row_count} row(s) returned
                {step.result.row_count > 20 && ' (showing first 20)'}
              </div>
            </div>
          )}

          {/* Quick refine actions */}
          {quickActions.length > 0 && (
            <div className="at-quick-actions">
              <span className="at-qa-label">Refine:</span>
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  className="at-qa-btn"
                  onClick={() => onRefine(qa.prompt)}
                >
                  <qa.icon size={13} />
                  {qa.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="at-step-error-inline">
          <XCircle size={14} />
          <span>{step.result?.message || 'Query failed'}</span>
        </div>
      )}
    </div>
  );
}
