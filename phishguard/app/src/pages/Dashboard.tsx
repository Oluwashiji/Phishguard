import { useState, useEffect, useRef } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, Link2, Mail, AlertTriangle,
  CheckCircle, XCircle, Loader, Zap, ChevronDown, Copy, RotateCcw, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type PredictionResult } from '../services/api';

const MODELS = [
  { name: 'random_forest', label: 'Random Forest' },
  { name: 'logistic_regression', label: 'Logistic Regression' },
  { name: 'neural_network', label: 'Neural Network (MLP)' },
  { name: 'svm', label: 'Support Vector Machine' },
];

const SAMPLE_URLS = {
  safe: ['https://www.google.com', 'https://github.com/login', 'https://www.amazon.com'],
  phishing: [
    'http://192.168.1.1/login.php',
    'http://secure-paypal.verify-account.net/login',
    'http://amaz0n-security.com/verify',
  ],
};

const SAMPLE_EMAILS = {
  safe: 'Your Amazon order #12345 has been shipped. Track your package at amazon.com/orders.',
  phishing: 'URGENT: Your PayPal account has been suspended! Click here immediately to verify your credentials: http://evil.com/login',
};

export function Dashboard() {
  const [tab, setTab] = useState<'url' | 'email'>('url');
  const [input, setInput] = useState('');
  const [model, setModel] = useState('random_forest');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [showModelDrop, setShowModelDrop] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showModelDrop) {
      const close = () => setShowModelDrop(false);
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
  }, [showModelDrop]);

  const handleScan = async () => {
    if (!input.trim()) { toast.error('Enter a URL or email to scan'); return; }
    setScanning(true);
    setProgress(0);
    setResult(null);
    const iv = setInterval(() => setProgress(p => Math.min(p + Math.random() * 18, 88)), 180);
    try {
      const res = await api.predict(input.trim(), tab, model);
      clearInterval(iv);
      setProgress(100);
      setResult(res);
      if (res.is_phishing) toast.error('⚠ Phishing threat detected!');
      else toast.success('✓ Input appears legitimate');
    } catch (err) {
      clearInterval(iv);
      toast.error('Scan failed: ' + (err as Error).message);
    } finally {
      setTimeout(() => { setScanning(false); setProgress(0); }, 600);
    }
  };

  const currentModelLabel = MODELS.find(m => m.name === model)?.label || model;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ padding: '8px', background: 'var(--red-dim)', borderRadius: '8px', border: '1px solid rgba(230,57,70,0.2)' }}>
            <Shield size={20} style={{ color: 'var(--red)' }} />
          </div>
          <h1 className="font-display" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Threat Scanner
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', paddingLeft: '52px' }}>
          Paste a URL or email content — our ML ensemble will classify it in seconds.
        </p>
      </div>

      {/* Input Card */}
      <div className="pg-card" style={{ padding: '24px', marginBottom: '24px' }}>
        {/* Tab toggle */}
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <div className="pg-tabs" style={{ width: '100%', maxWidth: '320px' }}>
            {(['url', 'email'] as const).map(t => (
              <button key={t} className={`pg-tab ${tab === t ? 'active' : ''}`}
                onClick={() => { setTab(t); setInput(''); setResult(null); }}>
                {t === 'url' ? <Link2 size={13} style={{ marginRight: 6, display: 'inline' }} /> : <Mail size={13} style={{ marginRight: 6, display: 'inline' }} />}
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        {tab === 'url' ? (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            className="pg-input"
            style={{ padding: '12px 16px', fontSize: '14px', marginBottom: '16px', fontFamily: "'JetBrains Mono', monospace" }}
            placeholder="https://example.com"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
          />
        ) : (
          <textarea
            className="pg-input"
            style={{ padding: '12px 16px', fontSize: '14px', marginBottom: '16px', minHeight: '120px', resize: 'vertical' }}
            placeholder="Paste email content here..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
        )}

        {/* Quick samples */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Quick samples
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tab === 'url' ? (
              <>
                {SAMPLE_URLS.safe.slice(0, 2).map(u => (
                  <button key={u} className="btn-ghost" style={{ padding: '5px 12px', fontSize: '12px' }}
                    onClick={() => setInput(u)}>
                    <CheckCircle size={11} style={{ marginRight: 4, color: 'var(--green)', display: 'inline' }} />
                    {u.replace('https://', '').split('/')[0]}
                  </button>
                ))}
                {SAMPLE_URLS.phishing.slice(0, 2).map(u => (
                  <button key={u} className="btn-ghost" style={{ padding: '5px 12px', fontSize: '12px' }}
                    onClick={() => setInput(u)}>
                    <XCircle size={11} style={{ marginRight: 4, color: 'var(--red)', display: 'inline' }} />
                    Phishing #{SAMPLE_URLS.phishing.indexOf(u) + 1}
                  </button>
                ))}
              </>
            ) : (
              <>
                <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: '12px' }}
                  onClick={() => setInput(SAMPLE_EMAILS.safe)}>
                  <CheckCircle size={11} style={{ marginRight: 4, color: 'var(--green)', display: 'inline' }} />
                  Legitimate Email
                </button>
                <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: '12px' }}
                  onClick={() => setInput(SAMPLE_EMAILS.phishing)}>
                  <XCircle size={11} style={{ marginRight: 4, color: 'var(--red)', display: 'inline' }} />
                  Phishing Email
                </button>
              </>
            )}
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Model selector */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              className="btn-ghost"
              style={{ padding: '10px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              onClick={() => setShowModelDrop(!showModelDrop)}
            >
              <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Model:</span>
              {currentModelLabel}
              <ChevronDown size={13} />
            </button>
            {showModelDrop && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '4px', zIndex: 100, minWidth: '200px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
              }}>
                {MODELS.map(m => (
                  <button
                    key={m.name}
                    onClick={() => { setModel(m.name); setShowModelDrop(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', borderRadius: '6px', border: 'none',
                      background: model === m.name ? 'var(--red-dim)' : 'transparent',
                      color: model === m.name ? 'var(--red)' : 'var(--text-muted)',
                      cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
                    }}
                  >{m.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Scan button */}
          <button
            className="btn-primary"
            style={{ padding: '10px 28px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}
            onClick={handleScan}
            disabled={scanning || !input.trim()}
          >
            {scanning
              ? <><Loader size={15} className="animate-spin-custom" /> Scanning...</>
              : <><Zap size={15} /> Analyze {tab === 'url' ? 'URL' : 'Email'}</>
            }
          </button>

          {(input || result) && (
            <button className="btn-ghost" style={{ padding: '10px' }} onClick={() => { setInput(''); setResult(null); }}>
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {/* Progress */}
        {scanning && (
          <div style={{ marginTop: '16px' }}>
            <div className="pg-progress">
              <div className="pg-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px', textAlign: 'center' }}>
              Extracting features · Running {currentModelLabel}...
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="animate-fade-in">
          {/* Verdict banner */}
          <div
            className={`pg-card ${result.is_phishing ? 'glow-red' : 'glow-green'}`}
            style={{
              padding: '20px',
              marginBottom: '16px',
              borderColor: result.is_phishing ? 'rgba(230,57,70,0.35)' : 'rgba(34,211,163,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                background: result.is_phishing ? 'var(--red-dim)' : 'var(--green-dim)',
                border: `2px solid ${result.is_phishing ? 'rgba(230,57,70,0.4)' : 'rgba(34,211,163,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {result.is_phishing
                  ? <ShieldAlert size={24} style={{ color: 'var(--red)' }} />
                  : <ShieldCheck size={24} style={{ color: 'var(--green)' }} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                  Analysis Result
                </div>
                <div className="font-display" style={{
                  fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 800, letterSpacing: '-0.03em',
                  color: result.is_phishing ? 'var(--red)' : 'var(--green)',
                }}>
                  {result.is_phishing ? 'PHISHING DETECTED' : 'LEGITIMATE'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontFamily: "'Syne', sans-serif", fontWeight: 800, color: result.is_phishing ? 'var(--red)' : 'var(--green)', lineHeight: 1 }}>
                  {result.confidence}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>confidence</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                ['Model', result.model_used.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
                ['Type', result.input_type.toUpperCase()],
                ['Verdict', result.result],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: '4px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>{label}: </span>
                  <span style={{ color: 'var(--text)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk indicators + Features row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Risk indicators */}
            <div className="pg-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
                <span className="font-display" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Risk Indicators</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-dim)' }}>
                  {result.suspicious_features.length} found
                </span>
              </div>
              {result.suspicious_features.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.suspicious_features.map((f, i) => (
                    <div key={i} style={{
                      padding: '10px 12px',
                      background: f.severity === 'high' ? 'var(--red-dim)' : 'var(--amber-dim)',
                      border: `1px solid ${f.severity === 'high' ? 'rgba(230,57,70,0.2)' : 'rgba(245,166,35,0.2)'}`,
                      borderRadius: '8px',
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                    }}>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                        background: f.severity === 'high' ? 'rgba(230,57,70,0.25)' : 'rgba(245,166,35,0.25)',
                        color: f.severity === 'high' ? 'var(--red)' : 'var(--amber)',
                      }}>{f.severity}</span>
                      <div>
                        <div style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)', marginBottom: '2px' }}>
                          {f.feature}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{f.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
                  <CheckCircle size={32} style={{ color: 'var(--green)', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '13px' }}>No suspicious indicators found</div>
                </div>
              )}
            </div>

            {/* Input summary */}
            <div className="pg-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Info size={16} style={{ color: 'var(--blue)' }} />
                <span className="font-display" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Input Summary</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  ['Input', input.length > 60 ? input.substring(0, 60) + '...' : input],
                  ['Type', result.input_type.toUpperCase()],
                  ['Model', result.model_used.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
                  ['Verdict', result.result],
                  ['Scanned', new Date(result.timestamp).toLocaleTimeString()],
                ].map(([label, value]) => (
                  <div key={label} className="metric-pill">
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text)', fontFamily: label === 'Input' ? "'JetBrains Mono', monospace" : undefined, maxWidth: '180px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success('Result copied to clipboard'); }}
                className="btn-ghost"
                style={{ width: '100%', marginTop: '12px', padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Copy size={12} /> Copy Full Result
              </button>
            </div>
          </div>

          {/* Extracted features (collapsible) */}
          <div className="pg-card" style={{ overflow: 'hidden' }}>
            <button
              onClick={() => setShowFeatures(!showFeatures)}
              style={{
                width: '100%', padding: '16px 20px', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              }}
            >
              <span className="font-display" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                Extracted ML Features
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: 4 }}>
                ({Object.keys(result.features).length} features)
              </span>
              <ChevronDown size={14} style={{ marginLeft: 'auto', color: 'var(--text-dim)', transform: showFeatures ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            </button>
            {showFeatures && (
              <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                {Object.entries(result.features).map(([key, val]) => (
                  <div key={key} className="feature-chip">
                    <div className="label">{key.replace(/_/g, ' ')}</div>
                    <div className="value">
                      {typeof val === 'boolean' ? (val ? 'Yes' : 'No')
                        : typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(3))
                        : String(val)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}