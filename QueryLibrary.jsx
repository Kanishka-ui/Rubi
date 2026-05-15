import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Plus, Play, X, Search, Trash2,
  Tag, Clock, Zap, Database, Star, Edit3,
} from 'lucide-react';

const TEMPLATES_KEY = 'sqhelp_query_templates';

/* ── parameter regex: matches [ParamName] ────────────── */
const PARAM_RE = /\[([^\]]+)\]/g;

function extractParams(template) {
  const params = [];
  let m;
  while ((m = PARAM_RE.exec(template)) !== null) {
    if (!params.includes(m[1])) params.push(m[1]);
  }
  return params;
}

/* ── default template library ────────────────────────── */
const DEFAULT_TEMPLATES = [
  {
    id: 'd1',
    title: 'Top Products by Price',
    template: 'Show me the top [Limit] products sorted by price in [Order] order',
    category: 'Products',
    params: { Limit: '10', Order: 'descending' },
    paramOptions: { Order: ['ascending', 'descending'] },
    icon: 'star',
    usageCount: 12,
  },
  {
    id: 'd2',
    title: 'Orders by Status',
    template: 'Show all orders with status [Status]',
    category: 'Orders',
    params: { Status: 'delivered' },
    paramOptions: { Status: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
    icon: 'zap',
    usageCount: 8,
  },
  {
    id: 'd3',
    title: 'Stock by Category',
    template: 'Show total stock grouped by [GroupBy]',
    category: 'Products',
    params: { GroupBy: 'category name' },
    paramOptions: { GroupBy: ['category name', 'supplier name'] },
    icon: 'tag',
    usageCount: 15,
  },
  {
    id: 'd4',
    title: 'Customer from City',
    template: 'Show all customers from [City]',
    category: 'Customers',
    params: { City: 'Mumbai' },
    paramOptions: {},
    icon: 'database',
    usageCount: 6,
  },
  {
    id: 'd5',
    title: 'Revenue by Category',
    template: 'Show total revenue from order items grouped by [GroupBy] for orders with status [Status]',
    category: 'Orders',
    params: { GroupBy: 'product category', Status: 'delivered' },
    paramOptions: { Status: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
    icon: 'star',
    usageCount: 10,
  },
  {
    id: 'd6',
    title: 'Products in Price Range',
    template: 'Show all products with price between [MinPrice] and [MaxPrice]',
    category: 'Products',
    params: { MinPrice: '500', MaxPrice: '5000' },
    paramOptions: {},
    icon: 'zap',
    usageCount: 9,
  },
];

/* ── localStorage helpers ─────────────────────────────── */
function loadTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem(TEMPLATES_KEY));
    if (saved && saved.length > 0) return saved;
  } catch {}
  return DEFAULT_TEMPLATES;
}
function saveTemplates(t) { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t)); }

/* ── icon map ─────────────────────────────────────────── */
function TemplateIcon({ name, size = 16 }) {
  switch (name) {
    case 'star':     return <Star size={size} />;
    case 'zap':      return <Zap size={size} />;
    case 'tag':      return <Tag size={size} />;
    case 'database': return <Database size={size} />;
    default:         return <BookOpen size={size} />;
  }
}

/* ════════════════════════════════════════════════════════
 *  QUERY LIBRARY PAGE
 * ════════════════════════════════════════════════════════ */
export default function QueryLibrary({ onNavigateBack, onRunQuery }) {
  const [templates, setTemplates] = useState(loadTemplates);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [activeCard, setActiveCard] = useState(null);   // template id being configured
  const [paramValues, setParamValues] = useState({});   // current param fill-ins
  const [showCreate, setShowCreate]   = useState(false); // create-new modal

  useEffect(() => { saveTemplates(templates); }, [templates]);

  /* categories derived from templates */
  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return ['All', ...Array.from(cats).sort()];
  }, [templates]);

  /* filtered list */
  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (catFilter !== 'All' && t.category !== catFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())
        && !t.template.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [templates, catFilter, search]);

  /* ── open a card for param filling ────────────────── */
  const openCard = (tpl) => {
    setActiveCard(tpl.id);
    setParamValues({ ...tpl.params });
  };

  /* ── run the filled template ──────────────────────── */
  const runTemplate = (tpl) => {
    let query = tpl.template;
    const params = extractParams(tpl.template);
    params.forEach(p => {
      query = query.replace(`[${p}]`, paramValues[p] || tpl.params[p] || p);
    });

    // increment usage
    setTemplates(prev => prev.map(t =>
      t.id === tpl.id ? { ...t, usageCount: (t.usageCount || 0) + 1 } : t
    ));

    setActiveCard(null);
    onRunQuery(query);
  };

  /* ── delete template ──────────────────────────────── */
  const deleteTemplate = (id) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (activeCard === id) setActiveCard(null);
  };

  /* ── render ────────────────────────────────────────── */
  return (
    <div className="ql-page">

      {/* Header */}
      <header className="ql-header">
        <div className="ql-header-content">
          <div className="ql-header-left">
            <BookOpen size={26} />
            <div>
              <h1>Query Library</h1>
              <p>{templates.length} template{templates.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>
          <div className="ql-header-right">
            <button className="dash-btn dash-btn-ghost" onClick={() => setShowCreate(true)}>
              <Plus size={15} /> Create Template
            </button>
            <button className="dash-btn dash-btn-primary" onClick={onNavigateBack}>
              <Database size={15} /> Back to Query
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar: search + category filter */}
      <div className="ql-toolbar">
        <div className="ql-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="ql-categories">
          {categories.map(cat => (
            <button
              key={cat}
              className={`ql-cat-btn ${catFilter === cat ? 'active' : ''}`}
              onClick={() => setCatFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="ql-body">
        {filtered.length === 0 ? (
          <div className="ql-empty">
            <BookOpen size={48} />
            <h2>No templates found</h2>
            <p>Try adjusting your search or create a new template.</p>
          </div>
        ) : (
          <div className="ql-grid">
            {filtered.map(tpl => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                isActive={activeCard === tpl.id}
                paramValues={paramValues}
                setParamValues={setParamValues}
                onOpen={() => openCard(tpl)}
                onRun={() => runTemplate(tpl)}
                onClose={() => setActiveCard(null)}
                onDelete={() => deleteTemplate(tpl.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreate={(newTpl) => {
            setTemplates(prev => [...prev, newTpl]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

/* ── Template Card ──────────────────────────────────────── */
function TemplateCard({ tpl, isActive, paramValues, setParamValues, onOpen, onRun, onClose, onDelete }) {
  const params = extractParams(tpl.template);

  /* render the template text with highlighted params */
  const renderTemplate = () => {
    const parts = tpl.template.split(PARAM_RE);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // This is a param name
        return <span key={i} className="ql-param-highlight">[{part}]</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`ql-card fade-in ${isActive ? 'ql-card-active' : ''}`}>
      <div className="ql-card-header">
        <div className="ql-card-icon">
          <TemplateIcon name={tpl.icon} size={18} />
        </div>
        <div className="ql-card-meta">
          <span className="ql-card-category">{tpl.category}</span>
          <span className="ql-card-usage">{tpl.usageCount || 0} uses</span>
        </div>
        <button className="dash-icon-btn dash-icon-danger" onClick={onDelete} title="Delete">
          <X size={13} />
        </button>
      </div>

      <h3 className="ql-card-title">{tpl.title}</h3>
      <p className="ql-card-template">{renderTemplate()}</p>

      {!isActive ? (
        <button className="ql-card-run-btn" onClick={onOpen}>
          <Play size={14} /> Configure & Run
        </button>
      ) : (
        <div className="ql-card-params">
          <div className="ql-params-title">
            <Edit3 size={13} /> Fill in parameters:
          </div>
          {params.map(p => (
            <div key={p} className="ql-param-field">
              <label>{p}</label>
              {tpl.paramOptions?.[p] ? (
                <select
                  value={paramValues[p] || ''}
                  onChange={e => setParamValues(prev => ({ ...prev, [p]: e.target.value }))}
                >
                  {tpl.paramOptions[p].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={paramValues[p] || ''}
                  onChange={e => setParamValues(prev => ({ ...prev, [p]: e.target.value }))}
                  placeholder={`Enter ${p}...`}
                />
              )}
            </div>
          ))}
          <div className="ql-param-actions">
            <button className="ql-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="ql-btn-run" onClick={onRun}>
              <Play size={14} /> Run Query
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Create Template Modal ──────────────────────────────── */
function CreateTemplateModal({ onClose, onCreate }) {
  const [title, setTitle]       = useState('');
  const [template, setTemplate] = useState('');
  const [category, setCategory] = useState('General');
  const [icon, setIcon]         = useState('star');

  const params = extractParams(template);

  const handleCreate = () => {
    if (!title.trim() || !template.trim()) return;
    const defaults = {};
    params.forEach(p => { defaults[p] = ''; });
    onCreate({
      id: 'u_' + Date.now(),
      title: title.trim(),
      template: template.trim(),
      category,
      params: defaults,
      paramOptions: {},
      icon,
      usageCount: 0,
    });
  };

  return (
    <div className="ql-modal-overlay" onClick={onClose}>
      <div className="ql-modal" onClick={e => e.stopPropagation()}>
        <div className="ql-modal-header">
          <h2>Create New Template</h2>
          <button className="dash-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="ql-modal-body">
          <div className="ql-field">
            <label>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Top Customers by Revenue" />
          </div>

          <div className="ql-field">
            <label>Template Query</label>
            <textarea
              value={template}
              onChange={e => setTemplate(e.target.value)}
              placeholder="e.g., Show me the top [Limit] customers from [City]"
              rows={3}
            />
            <span className="ql-field-hint">
              Use [ParamName] for fill-in-the-blank parameters
            </span>
          </div>

          {params.length > 0 && (
            <div className="ql-detected-params">
              <span>Detected parameters: </span>
              {params.map(p => <span key={p} className="ql-param-tag">{p}</span>)}
            </div>
          )}

          <div className="ql-field-row">
            <div className="ql-field">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option>General</option>
                <option>Products</option>
                <option>Orders</option>
                <option>Customers</option>
                <option>Suppliers</option>
              </select>
            </div>
            <div className="ql-field">
              <label>Icon</label>
              <select value={icon} onChange={e => setIcon(e.target.value)}>
                <option value="star">Star</option>
                <option value="zap">Lightning</option>
                <option value="tag">Tag</option>
                <option value="database">Database</option>
                <option value="book">Book</option>
              </select>
            </div>
          </div>
        </div>

        <div className="ql-modal-footer">
          <button className="ql-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ql-btn-run" onClick={handleCreate} disabled={!title.trim() || !template.trim()}>
            <Plus size={14} /> Create Template
          </button>
        </div>
      </div>
    </div>
  );
}
