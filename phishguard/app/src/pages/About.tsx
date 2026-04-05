import {
  Shield, Brain, Database, AlertTriangle, CheckCircle,
  ExternalLink, Code, ArrowRight, Link2, Mail, Cpu
} from 'lucide-react';

const TECH_STACK = {
  Frontend: ['React 19', 'TypeScript', 'Vite', 'Recharts', 'Tailwind CSS'],
  Backend: ['Python 3.11', 'Flask 3', 'Flask-CORS', 'Gunicorn'],
  'Machine Learning': ['scikit-learn', 'pandas', 'numpy', 'joblib'],
  Infrastructure: ['Render.com', 'GitHub', 'REST API'],
};

const URL_FEATURES = [
  ['URL Length', 'Total character count — longer often means suspicious'],
  ['Domain Subdomains', 'Excessive subdomains signal spoofing attempts'],
  ['HTTPS Protocol', 'Checks if secure protocol is used'],
  ['IP Address in URL', 'IP instead of domain is a strong indicator'],
  ['@ Symbol', 'Tricks browsers into ignoring the real domain'],
  ['URL Shortener', 'bit.ly, tinyurl etc. obscure true destination'],
  ['Suspicious TLD', '.tk, .ml, .xyz are common phishing domains'],
  ['Shannon Entropy', 'Measures randomness — high entropy = suspicious'],
  ['Brand in Subdomain', 'E.g. paypal.evil.com — classic spoofing'],
  ['Suspicious Keywords', 'verify, login, secure, update etc.'],
];

const EMAIL_FEATURES = [
  ['Phishing Keywords', 'urgent, suspended, verify, action required'],
  ['Urgency Score', 'Time-pressure language count'],
  ['HTML Content', 'Presence of HTML tags in email body'],
  ['Link Count', 'Excessive links increase risk'],
  ['Suspicious Patterns', 'Credit card numbers, SSNs detected'],
  ['Spelling Errors', 'Common misspellings in phishing mails'],
  ['Sender Mismatch', 'Display name vs actual email domain'],
  ['Reply-To Mismatch', 'Reply-to differs from sender'],
];

const PIPELINE = [
  { icon: ExternalLink, label: 'Input', desc: 'User pastes a URL or email text' },
  { icon: Database, label: 'Feature Extraction', desc: '18+ statistical & pattern features extracted' },
  { icon: Brain, label: 'ML Classification', desc: 'Model predicts phishing probability' },
  { icon: CheckCircle, label: 'Result', desc: 'Verdict + confidence + risk indicators returned' },
];

export function About() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '10px', background: 'var(--red-dim)', borderRadius: '10px', border: '1px solid rgba(230,57,70,0.2)' }}>
            <Shield size={22} style={{ color: 'var(--red)' }} />
          </div>
          <h1 className="font-display" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            About PhishGuard
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7, paddingLeft: '52px', maxWidth: '680px' }}>
          An enterprise-grade threat intelligence platform powered by a multi-model ML ensemble.
          PhishGuard delivers real-time detection of malicious URLs and phishing emails through
          advanced feature engineering, four classification algorithms, and a high-performance REST API.
        </p>
      </div>

      {/* Detection Pipeline */}
      <div className="pg-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div className="font-display" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '24px' }}>
          Detection Pipeline
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap' }}>
          {PIPELINE.map(({ icon: Icon, label, desc }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: '1 1 140px', minWidth: '120px' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 12px',
                  background: i === 3 ? 'var(--green-dim)' : 'var(--red-dim)',
                  border: `2px solid ${i === 3 ? 'rgba(34,211,163,0.25)' : 'rgba(230,57,70,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} style={{ color: i === 3 ? 'var(--green)' : 'var(--red)' }} />
                </div>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div style={{
                    position: 'absolute', top: '-26px', left: '50%', transform: 'translateX(-50%)',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'var(--red)', color: 'white',
                    fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i + 1}</div>
                </div>
                <div className="font-display" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
              </div>
              {i < PIPELINE.length - 1 && (
                <ArrowRight size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Feature extraction */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* URL features */}
        <div className="pg-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Link2 size={15} style={{ color: 'var(--red)' }} />
            <span className="font-display" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>URL Features</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-dim)' }}>{URL_FEATURES.length} extracted</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
            {URL_FEATURES.map(([name, desc]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right', maxWidth: '140px' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Email features */}
        <div className="pg-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Mail size={15} style={{ color: 'var(--blue)' }} />
            <span className="font-display" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Email Features</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-dim)' }}>{EMAIL_FEATURES.length} extracted</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
            {EMAIL_FEATURES.map(([name, desc]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right', maxWidth: '140px' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ML Models summary */}
      <div className="pg-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Cpu size={16} style={{ color: 'var(--amber)' }} />
          <span className="font-display" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>ML Models</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {[
            { name: 'Logistic Regression', type: 'Linear Classifier', color: '#e63946', desc: 'Fast, interpretable baseline. Uses sigmoid function to output probabilities.' },
            { name: 'Random Forest', type: 'Ensemble (100 Trees)', color: '#22d3a3', desc: 'Majority-vote ensemble. Handles non-linearity, provides feature importance.' },
            { name: 'Neural Network (MLP)', type: 'Deep Learning', color: '#f5a623', desc: '3 hidden layers (128→64→32). Learns complex feature interactions via backprop.' },
            { name: 'Support Vector Machine', type: 'Kernel Method (RBF)', color: '#3b82f6', desc: 'Finds optimal hyperplane in high-dimensional feature space. Memory-efficient.' },
          ].map(({ name, type, color, desc }) => (
            <div key={name} style={{ padding: '14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', borderLeft: `3px solid ${color}` }}>
              <div className="font-display" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{name}</div>
              <div style={{ fontSize: '10px', color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{type}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="pg-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Code size={16} style={{ color: 'var(--green)' }} />
          <span className="font-display" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Technology Stack</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {Object.entries(TECH_STACK).map(([category, items]) => (
            <div key={category} style={{ padding: '14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>{category}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {items.map(item => (
                  <div key={item} style={{
                    padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '5px', fontSize: '12px', color: 'var(--text-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{item}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phishing awareness */}
      <div className="pg-card" style={{ padding: '24px', borderColor: 'rgba(245,166,35,0.25)', background: 'linear-gradient(135deg, rgba(245,166,35,0.04), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
          <span className="font-display" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--amber)' }}>Phishing Awareness</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Common Red Flags</div>
            {['Urgent or threatening language', 'Requests for personal information', 'Mismatched sender domains', 'Generic greetings (Dear Customer)', 'Unexpected attachments or links'].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{s}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Protection Tips</div>
            {['Verify sender identity independently', 'Hover links before clicking them', 'Check for HTTPS on login pages', 'Enable multi-factor authentication', 'Keep your software up to date'].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '32px 0 8px', color: 'var(--text-dim)', fontSize: '13px' }}>
        <div style={{ marginBottom: '4px' }}>Built for scale. Designed for the modern threat landscape.</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
          PhishGuard · Real-Time Threat Intelligence · Powered by ML
        </div>
      </div>
    </div>
  );
}