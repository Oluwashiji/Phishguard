import { useEffect, useState } from 'react';
import {
  Sparkles, Loader, AlertCircle, TrendingUp, TrendingDown,
  Wand2, ArrowRight, CheckCircle2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import { api, type ExplainResult } from '../services/api';

interface ExplainPanelProps {
  input: string;
  inputType: 'url' | 'email';
  model: string;
}

const tooltipStyle = {
  contentStyle: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '12px',
  },
  labelStyle: { color: 'var(--text)' },
};

export function ExplainPanel({ input, inputType, model }: ExplainPanelProps) {
  const [data, setData] = useState<ExplainResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    api.explain(input, inputType, model)
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError((err as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [input, inputType, model]);

  if (loading) {
    return (
      <div style={{ padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <Loader size={22} className="animate-spin-custom" style={{ color: 'var(--blue)' }} />
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Computing SHAP explanations…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <AlertCircle size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '2px' }}>Couldn't load explanation</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const chartData = [...data.top_features].reverse().map(f => ({
    name: f.label.length > 34 ? f.label.slice(0, 34) + '…' : f.label,
    fullLabel: f.label,
    shap: f.shap_value,
    direction: f.direction,
  }));

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Plain-English summary */}
      <div style={{
        padding: '14px 16px', borderRadius: '10px',
        background: data.is_phishing ? 'var(--red-dim)' : 'var(--green-dim)',
        border: `1px solid ${data.is_phishing ? 'rgba(230,57,70,0.2)' : 'rgba(34,211,163,0.2)'}`,
        display: 'flex', gap: '10px', alignItems: 'flex-start',
      }}>
        <Sparkles size={16} style={{ color: data.is_phishing ? 'var(--red)' : 'var(--green)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{data.summary}</div>
      </div>

      {/* Feature contribution chart */}
      <div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Top Feature Contributions ({model.replace(/_/g, ' ')})
        </div>
        <div style={{ height: `${Math.max(chartData.length * 34, 160)}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => v.toFixed(2)} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(3)}`, 'SHAP value']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
              />
              <Bar dataKey="shap" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.direction === 'phishing' ? 'var(--red)' : 'var(--green)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: 'var(--text-dim)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--red)', display: 'inline-block' }} />
            Pushes toward phishing
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)', display: 'inline-block' }} />
            Pushes toward legitimate
          </span>
        </div>
      </div>

      {/* Per-model confidence comparison */}
      <div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Model Agreement
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.model_comparison.map(m => (
            <div key={m.model} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '132px', flexShrink: 0, fontSize: '12px', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {m.model === model && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />}
                {m.model.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </div>
              <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--surface2)', overflow: 'hidden' }}>
                <div style={{
                  width: `${m.phishing_probability}%`, height: '100%',
                  background: m.is_phishing ? 'var(--red)' : 'var(--green)',
                  borderRadius: '4px', transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ width: '52px', flexShrink: 0, fontSize: '12px', color: 'var(--text)', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                {m.phishing_probability.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What-if panel */}
      {data.what_if.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Wand2 size={12} /> What Would Change This Verdict
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.what_if.map((s, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: '8px',
                background: s.would_flip ? 'var(--green-dim)' : 'var(--surface2)',
                border: `1px solid ${s.would_flip ? 'rgba(34,211,163,0.25)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: '180px', fontSize: '12px', color: 'var(--text)' }}>
                  If <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>{s.label}</span> were removed
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ color: 'var(--red)' }}>{(s.original_probability * 100).toFixed(0)}%</span>
                  <ArrowRight size={11} style={{ color: 'var(--text-dim)' }} />
                  <span style={{ color: s.would_flip ? 'var(--green)' : 'var(--amber)' }}>{(s.new_probability * 100).toFixed(0)}%</span>
                </div>
                {s.would_flip ? (
                  <span style={{
                    padding: '3px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    background: 'rgba(34,211,163,0.2)', color: 'var(--green)',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <CheckCircle2 size={11} /> Would flip
                  </span>
                ) : (
                  <span style={{
                    padding: '3px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 600,
                    background: 'var(--amber-dim)', color: 'var(--amber)',
                  }}>
                    Not enough alone
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {data.what_if.some(s => s.would_flip)
              ? <TrendingDown size={11} />
              : <TrendingUp size={11} />}
            Each row tests one change in isolation — combining several would shift the verdict further than any single one shown here.
          </div>
        </div>
      )}
    </div>
  );
}