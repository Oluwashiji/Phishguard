import { useState, useEffect } from 'react';
import {
  Settings, RefreshCw, Database, Activity, CheckCircle,
  AlertCircle, Play, FileText, Cpu, HardDrive, Upload, Wifi, WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

type LogType = 'success' | 'info' | 'error' | 'warn';
interface LogEntry { ts: string; msg: string; type: LogType; }

const ENDPOINTS = [
  { method: 'GET', path: '/api/health', desc: 'Health check & model list' },
  { method: 'GET', path: '/api/models', desc: 'Available models' },
  { method: 'POST', path: '/api/predict', desc: 'Single model prediction' },
  { method: 'POST', path: '/api/predict/all', desc: 'Predict with all models' },
  { method: 'GET', path: '/api/metrics', desc: 'Model performance metrics' },
  { method: 'GET', path: '/api/features/importance', desc: 'Feature importance scores' },
  { method: 'POST', path: '/api/analyze', desc: 'Feature extraction only' },
  { method: 'POST', path: '/api/train', desc: 'Retrain all models' },
];

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET:  { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  POST: { bg: 'rgba(34,211,163,0.12)', text: '#22d3a3' },
};

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export function AdminPanel() {
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [health, setHealth] = useState<{ status: string; models_loaded: string[] } | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([
    { ts: timestamp(), msg: 'Admin panel loaded', type: 'info' },
  ]);

  const addLog = (msg: string, type: LogType = 'info') =>
    setLogs(prev => [{ ts: timestamp(), msg, type }, ...prev].slice(0, 30));

  useEffect(() => { checkHealth(); }, []);

  const checkHealth = async () => {
    try {
      const res = await api.healthCheck();
      setHealth(res);
      setOnline(true);
      addLog(`API healthy — ${res.models_loaded.length} models loaded`, 'success');
    } catch (err) {
      setOnline(false);
      addLog('API unreachable: ' + (err as Error).message, 'error');
    }
  };

  const handleRetrain = async () => {
    setTraining(true);
    setProgress(0);
    addLog('Starting model retraining (3 000 samples)...', 'info');
    const iv = setInterval(() => setProgress(p => Math.min(p + Math.random() * 9, 92)), 500);
    try {
      await api.retrainModels(3000);
      clearInterval(iv);
      setProgress(100);
      addLog('All models retrained successfully', 'success');
      toast.success('Models retrained!');
      await checkHealth();
    } catch (err) {
      clearInterval(iv);
      addLog('Training failed: ' + (err as Error).message, 'error');
      toast.error('Training failed: ' + (err as Error).message);
    } finally {
      setTimeout(() => { setTraining(false); setProgress(0); }, 800);
    }
  };

  const models = health?.models_loaded ?? [];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ padding: '8px', background: 'rgba(245,166,35,0.12)', borderRadius: '8px', border: '1px solid rgba(245,166,35,0.2)' }}>
            <Settings size={20} style={{ color: 'var(--amber)' }} />
          </div>
          <h1 className="font-display" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            Admin Panel
          </h1>
          <button
            onClick={checkHealth}
            className="btn-ghost"
            style={{ marginLeft: 'auto', padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', paddingLeft: '52px' }}>
          Monitor system health, retrain models, and inspect the API.
        </p>
      </div>

      {/* Status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          {
            label: 'API Status',
            value: online === null ? 'Checking...' : online ? 'Online' : 'Offline',
            icon: online ? Wifi : WifiOff,
            color: online === null ? 'var(--text-dim)' : online ? 'var(--green)' : 'var(--red)',
            bg: online === null ? 'var(--surface2)' : online ? 'var(--green-dim)' : 'var(--red-dim)',
          },
          {
            label: 'Models Loaded',
            value: models.length ? `${models.length} / 4` : '—',
            icon: Cpu,
            color: 'var(--blue)',
            bg: 'var(--blue-dim)',
          },
          {
            label: 'API Version',
            value: 'v1.0.0',
            icon: Database,
            color: 'var(--amber)',
            bg: 'var(--amber-dim)',
          },
          {
            label: 'Train Size',
            value: '3 000',
            icon: HardDrive,
            color: 'var(--text-muted)',
            bg: 'var(--surface2)',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="pg-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="font-display" style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Model management */}
      <div className="pg-card" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Cpu size={16} style={{ color: 'var(--blue)' }} />
          <span className="font-display" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Model Management</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {/* Current models */}
          <div style={{ padding: '16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Active Models</div>
            {models.length > 0 ? models.map(m => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text)', textTransform: 'capitalize' }}>
                  {m.replace(/_/g, ' ')}
                </span>
                <span style={{ padding: '2px 8px', background: 'var(--green-dim)', color: 'var(--green)', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active
                </span>
              </div>
            )) : (
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', padding: '12px 0' }}>
                {online === false ? 'Backend offline — connect to see models' : 'Loading...'}
              </div>
            )}
          </div>

          {/* Config */}
          <div style={{ padding: '16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Training Config</div>
            {[
              ['Dataset Size', '3 000 samples'],
              ['Train / Test Split', '80 / 20'],
              ['Cross-validation', '5-fold'],
              ['URL Features', '18 extracted'],
              ['Email Features', '17 extracted'],
              ['Random Seed', '42 (reproducible)'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{k}</span>
                <span style={{ fontSize: '12px', color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Retrain */}
        <div style={{ padding: '16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: training ? '16px' : 0 }}>
            <div>
              <div className="font-display" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Retrain All Models</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Generates fresh synthetic dataset and retrains all 4 algorithms. Takes ~2 min.
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ padding: '9px 22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', marginLeft: '16px', flexShrink: 0 }}
              onClick={handleRetrain}
              disabled={training}
            >
              {training
                ? <><RefreshCw size={13} className="animate-spin-custom" /> Training...</>
                : <><Play size={13} /> Start Training</>
              }
            </button>
          </div>
          {training && (
            <div>
              <div className="pg-progress" style={{ marginBottom: '6px' }}>
                <div className="pg-progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>
                {Math.round(progress)}% — Training in progress...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dataset info */}
      <div className="pg-card" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Database size={16} style={{ color: 'var(--green)' }} />
          <span className="font-display" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Dataset</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Upload zone */}
          <div style={{
            padding: '28px', border: '2px dashed var(--border2)', borderRadius: '10px',
            textAlign: 'center', cursor: 'default',
          }}>
            <Upload size={28} style={{ color: 'var(--text-dim)', margin: '0 auto 10px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Upload Custom Dataset</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>CSV or JSON · max 16 MB</div>
            <button className="btn-ghost" style={{ padding: '7px 16px', fontSize: '12px' }} disabled>
              Coming Soon
            </button>
          </div>
          {/* Stats */}
          <div style={{ padding: '16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
              Current Dataset
            </div>
            {[
              ['Source', 'Synthetic (generated)'],
              ['Total Samples', '3 000'],
              ['Phishing', '1 500 (50%)'],
              ['Legitimate', '1 500 (50%)'],
              ['Balance', 'Stratified'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{k}</span>
                <span style={{ fontSize: '12px', color: 'var(--text)' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: '12px', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--text-dim)' }}>
              <div>url,label</div>
              <div>https://google.com,<span style={{ color: 'var(--green)' }}>0</span></div>
              <div>http://evil.com/login,<span style={{ color: 'var(--red)' }}>1</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* API endpoints */}
      <div className="pg-card" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <FileText size={16} style={{ color: 'var(--text-muted)' }} />
          <span className="font-display" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>API Endpoints</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ENDPOINTS.map(({ method, path, desc }) => {
            const c = METHOD_COLORS[method] ?? { bg: 'var(--surface2)', text: 'var(--text-muted)' };
            return (
              <div key={path} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '9px 12px', background: 'var(--surface2)',
                border: '1px solid var(--border)', borderRadius: '7px',
              }}>
                <span style={{
                  padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.06em', flexShrink: 0,
                  background: c.bg, color: c.text,
                }}>{method}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--text)', flex: 1 }}>{path}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity log */}
      <div className="pg-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Activity size={16} style={{ color: 'var(--text-muted)' }} />
          <span className="font-display" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Activity Log</span>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-dim)' }}>{logs.length} entries</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '240px', overflowY: 'auto' }}>
          {logs.map((log, i) => {
            const icon = log.type === 'success' ? <CheckCircle size={12} style={{ color: 'var(--green)', flexShrink: 0 }} />
              : log.type === 'error' ? <AlertCircle size={12} style={{ color: 'var(--red)', flexShrink: 0 }} />
              : <Activity size={12} style={{ color: 'var(--blue)', flexShrink: 0 }} />;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                {icon}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--text-dim)', flexShrink: 0 }}>{log.ts}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.msg}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
