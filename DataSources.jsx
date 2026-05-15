import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Database, Plus, Trash2, CheckCircle, XCircle, Loader2, Play, Upload, FolderPlus } from 'lucide-react';
import './DataSources.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export default function DataSources({ onNavigateBack, activeConnectionId, setActiveConnectionId }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [mode, setMode] = useState(null); // null | 'external' | 'schema'
  const [testStatus, setTestStatus] = useState(null);
  const [testMessage, setTestMessage] = useState('');
  
  // External connection form
  const [formData, setFormData] = useState({
    name: '', host: 'localhost', port: 3306, username: 'root', password: '', database_name: ''
  });

  // Schema creation form
  const [schemaName, setSchemaName] = useState('');

  // File upload state
  const fileInputRef = useRef(null);
  const [uploadingTo, setUploadingTo] = useState(null);

  useEffect(() => { fetchConnections(); }, []);

  const fetchConnections = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/connections`);
      setConnections(res.data.connections);
    } catch (e) {
      console.error("Failed to fetch connections", e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.name === 'port' ? parseInt(e.target.value) || '' : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    setTestStatus(null);
  };

  const handleTest = async () => {
    if (!formData.host || !formData.username || !formData.database_name) return;
    setTestStatus('testing');
    try {
      const res = await axios.post(`${API_BASE_URL}/connections/test`, formData);
      if (res.data.success) {
        setTestStatus('success');
        setTestMessage('Connection successful!');
      } else {
        setTestStatus('error');
        setTestMessage('Failed to connect.');
      }
    } catch (e) {
      setTestStatus('error');
      setTestMessage('Network error or rejected.');
    }
  };

  const handleSaveExternal = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/connections`, formData);
      setMode(null);
      setFormData({ name: '', host: 'localhost', port: 3306, username: 'root', password: '', database_name: '' });
      fetchConnections();
    } catch (e) { alert('Failed to save connection.'); }
  };

  const handleCreateSchema = async (e) => {
    e.preventDefault();
    if (!schemaName) return;
    try {
      await axios.post(`${API_BASE_URL}/create-schema`, { schema_name: schemaName });
      setMode(null);
      setSchemaName('');
      fetchConnections();
    } catch (e) { alert('Failed to create schema.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this workspace?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/connections/${id}`);
      if (activeConnectionId === id) setActiveConnectionId(null);
      fetchConnections();
    } catch (e) { alert("Failed to delete."); }
  };

  const triggerUpload = (connId, e) => {
    e.stopPropagation();
    setUploadingTo(connId);
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || uploadingTo === null) return;
    
    if (!file.name.endsWith('.csv')) {
      alert("Only CSV files are supported at this time.");
      return;
    }

    const data = new FormData();
    data.append('file', file);
    data.append('connection_id', uploadingTo);

    setUploadingTo('loading');
    try {
      const r = await axios.post(`${API_BASE_URL}/upload-csv`, data);
      if (r.data.success) {
        alert(r.data.message);
        setActiveConnectionId(r.data.connection_id);
      }
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to upload CSV.");
    } finally {
      setUploadingTo(null);
      e.target.value = '';
    }
  };

  return (
    <div className="ds-page fade-in">
      <header className="ds-header">
        <div className="ds-header-content">
          <div className="ds-header-left">
            <Database size={24} />
            <div>
              <h1>Data Workspaces</h1>
              <p>Manage schemas, external databases, and CSV uploads</p>
            </div>
          </div>
          <button className="ds-back-btn" onClick={onNavigateBack}>
            Back to Query
          </button>
        </div>
      </header>

      <div className="ds-body">
        {loading ? (
          <div className="ds-loader"><Loader2 className="spin" size={32} /></div>
        ) : (
          <div className="ds-grid">
            {/* Connections List */}
            <div className="ds-list-col">
              <div className="ds-list-header">
                <h2>Your Workspaces</h2>
                <div className="ds-header-actions">
                  <button className="ds-add-btn schema" onClick={() => setMode('schema')}>
                    <FolderPlus size={16} /> New Schema
                  </button>
                  <button className="ds-add-btn external" onClick={() => setMode('external')}>
                    <Plus size={16} /> External DB
                  </button>
                </div>
              </div>

              <input type="file" accept=".csv" ref={fileInputRef} style={{display:'none'}} onChange={handleFileUpload} />

              <div className="ds-cards">
                {/* Default Connection Card */}
                <div className={`ds-card ${activeConnectionId === null ? 'active' : ''}`} onClick={() => setActiveConnectionId(null)}>
                  <div className="ds-card-info">
                    <h3>Default Workspace</h3>
                    <p>sqhelp_db (Config File)</p>
                  </div>
                  <div className="ds-card-actions">
                    <button className="ds-upload-btn" onClick={(e) => triggerUpload(null, e)} title="Upload CSV to Default Workspace">
                      {uploadingTo === null && <Upload size={16} />}
                      {uploadingTo === 'loading' && <Loader2 size={16} className="spin" />}
                    </button>
                    {activeConnectionId === null && <CheckCircle size={20} className="text-success" />}
                  </div>
                </div>

                {connections.map(c => (
                  <div key={c.id} className={`ds-card ${activeConnectionId === c.id ? 'active' : ''}`} onClick={() => setActiveConnectionId(c.id)}>
                    <div className="ds-card-info">
                      <h3>{c.name}</h3>
                      <p>{c.username}@{c.host} / {c.database_name}</p>
                    </div>
                    <div className="ds-card-actions">
                      <button className="ds-upload-btn" onClick={(e) => triggerUpload(c.id, e)} title="Upload CSV to this workspace">
                         <Upload size={16} />
                      </button>
                      {activeConnectionId === c.id && <CheckCircle size={20} className="text-success" />}
                      <button className="ds-del-btn" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Forms */}
            <div className="ds-form-col fade-in">
              {mode === null && (
                <div className="ds-empty-form">
                  <FolderPlus size={48} color="#cbd5e1" />
                  <h3>Manage Your Data</h3>
                  <p>Select an option on the left to create a new isolated schema for CSV uploads, or connect to an existing external database.</p>
                </div>
              )}

              {mode === 'schema' && (
                <div className="fade-in">
                  <h2>Create New Schema</h2>
                  <p className="ds-help-text">Creates an isolated database environment for your CSV data.</p>
                  <form className="ds-form" onSubmit={handleCreateSchema}>
                    <div className="ds-field">
                      <label>Schema/Workspace Name</label>
                      <input type="text" value={schemaName} onChange={e => setSchemaName(e.target.value)} placeholder="e.g. Q3 Marketing Data" required autoFocus />
                    </div>
                    <div className="ds-form-actions">
                      <button type="button" className="ds-cancel-btn" onClick={() => setMode(null)}>Cancel</button>
                      <button type="submit" className="ds-save-btn">Create Schema</button>
                    </div>
                  </form>
                </div>
              )}

              {mode === 'external' && (
                <div className="fade-in">
                  <h2>Connect External Database</h2>
                  <form className="ds-form" onSubmit={handleSaveExternal}>
                    <div className="ds-field">
                      <label>Connection Name</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Production DB" required />
                    </div>
                    
                    <div className="ds-row">
                      <div className="ds-field flex-2">
                        <label>Host</label>
                        <input type="text" name="host" value={formData.host} onChange={handleChange} required />
                      </div>
                      <div className="ds-field flex-1">
                        <label>Port</label>
                        <input type="number" name="port" value={formData.port} onChange={handleChange} required />
                      </div>
                    </div>

                    <div className="ds-row">
                      <div className="ds-field flex-1">
                        <label>Username</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} required />
                      </div>
                      <div className="ds-field flex-1">
                        <label>Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} />
                      </div>
                    </div>

                    <div className="ds-field">
                      <label>Database Name</label>
                      <input type="text" name="database_name" value={formData.database_name} onChange={handleChange} required />
                    </div>

                    {testStatus && (
                      <div className={`ds-test-result status-${testStatus}`}>
                        {testStatus === 'testing' && <><Loader2 size={16} className="spin" /> Testing...</>}
                        {testStatus === 'success' && <><CheckCircle size={16} /> {testMessage}</>}
                        {testStatus === 'error' && <><XCircle size={16} /> {testMessage}</>}
                      </div>
                    )}

                    <div className="ds-form-actions">
                      <button type="button" className="ds-cancel-btn" onClick={() => setMode(null)}>Cancel</button>
                      <button type="button" className="ds-test-btn" onClick={handleTest}>
                        <Play size={16} /> Test
                      </button>
                      <button type="submit" className="ds-save-btn">Save Connection</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
