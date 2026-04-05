import { useState, useEffect } from 'react';
import { BarChart3, Trophy, RefreshCw, Target, Activity, TrendingUp, Crosshair } from 'lucide-react';
import { api, type ModelMetrics } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

const DEFAULT_METRICS: ModelMetrics[] = [
  { model_name: 'logistic_regression', accuracy: 0.92, precision: 0.89, recall: 0.94, f1_score: 0.91 },
  { model_name: 'random_forest', accuracy: 0.96, precision: 0.94, recall: 0.97, f1_score: 0.95 },
  { model_name: 'neural_network', accuracy: 0.94, precision: 0.92, recall: 0.95, f1_score: 0.93 },
  { model_name: 'svm', accuracy: 0.93, precision: 0.91, recall: 0.94, f1_score: 0.92 },
];

const COLORS = ['#e63946', '#22d3a3', '#f5a623', '#3b82f6'];
const fmtName = (n: string) => n.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export function ModelComparison() {
  const [metrics, setMetrics] = useState<ModelMetrics[]>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');

  useEffect(() => { loadMetrics(); }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.getMetrics();
      setMetrics(res.metrics);
    } catch {
      setMetrics(DEFAULT_METRICS);
    } finally {
      setLoading(false);
    }
  };

  const best = metrics.reduce((b, c) => c.f1_score > b.f1_score ? c : b, metrics[0]);

  const barData = metrics.map(m => ({
    name: fmtName(m.model_name).split(' ')[0],
    Accuracy: +(m.accuracy * 100).toFixed(1),
    Precision: +(m.precision * 100).toFixed(1),
    Recall: +(m.recall * 100).toFixed(1),
    'F1 Score': +(m.f1_score * 100).toFixed(1),
  }));

  const radarData = ['Accuracy', 'Precision', 'Recall', 'F1 Score'].map(metric => {
    const key = metric.toLowerCase().replace(' ', '_') as keyof ModelMetrics;
    const row: Record<string, string | number> = { metric };
    metrics.forEach(m => { row[fmtName(m.model_name).split(' ')[0]] = +((m[key] as number) * 100).toFixed(1); });
    return row;
  });

  const tooltipStyle = {
    contentStyle: {
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '12px',
    },
    labelStyle: { color: 'var(--text)' },
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '8px', background: 'var(--blue-dim)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
              <BarChart3 size={20} style={{ color: 'var(--blue)' }} />
            </div>
            <h1 className="font-display" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              Model Laboratory
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', paddingLeft: '52px' }}>
            Performance comparison across 4 ML algorithms
          </p>
        </div>
        <button
          className="btn-ghost"
          style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={loadMetrics}
          disabled={loading}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Best model */}
      {best && (
        <div className="pg-card" style={{
          padding: '20px 24px', marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(34,211,163,0.06) 0%, rgba(34,211,163,0.02) 100%)',
          borderColor: 'rgba(34,211,163,0.2)',
          display: 'flex', alignItems: 'center', gap: '20px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'rgba(34,211,163,0.15)', border: '2px solid rgba(34,211,163,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Trophy size={22} style={{ color: 'var(--green)' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
              Best Performing Model
            </div>
            <div className="font-display" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
              {fmtName(best.model_name)}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              F1 Score: <span style={{ color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {(best.f1_score * 100).toFixed(1)}%
              </span>
              &nbsp;·&nbsp;Accuracy: <span style={{ color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {(best.accuracy * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Model cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {metrics.map((m, i) => (
          <div key={m.model_name} className="pg-card" style={{
            padding: '16px',
            borderColor: m.model_name === best?.model_name ? 'rgba(34,211,163,0.25)' : undefined,
          }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i], display: 'inline-block' }} />
                {m.model_name === best?.model_name && (
                  <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(34,211,163,0.15)', color: 'var(--green)', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Best
                  </span>
                )}
              </div>
              <div className="font-display" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '6px' }}>
                {fmtName(m.model_name)}
              </div>
            </div>
            {[
              { icon: Target, label: 'Accuracy', val: m.accuracy, color: '#3b82f6' },
              { icon: Crosshair, label: 'Precision', val: m.precision, color: '#a855f7' },
              { icon: Activity, label: 'Recall', val: m.recall, color: 'var(--amber)' },
              { icon: TrendingUp, label: 'F1', val: m.f1_score, color: 'var(--green)' },
            ].map(({ icon: Icon, label, val, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-dim)' }}>
                  <Icon size={11} />
                  <span style={{ fontSize: '11px' }}>{label}</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color }}>
                  {(val * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="pg-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <span className="font-display" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
            Performance Visualization
          </span>
          <div className="pg-tabs" style={{ width: 'auto' }}>
            <button className={`pg-tab ${chartType === 'bar' ? 'active' : ''}`} onClick={() => setChartType('bar')}>Bar</button>
            <button className={`pg-tab ${chartType === 'radar' ? 'active' : ''}`} onClick={() => setChartType('radar')}>Radar</button>
          </div>
        </div>

        <div style={{ height: '360px' }}>
          {chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis domain={[80, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
                <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }} />
                <Bar dataKey="Accuracy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Precision" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Recall" fill="var(--amber)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="F1 Score" fill="var(--green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[80, 100]} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                {metrics.map((m, i) => (
                  <Radar
                    key={m.model_name}
                    name={fmtName(m.model_name).split(' ')[0]}
                    dataKey={fmtName(m.model_name).split(' ')[0]}
                    stroke={COLORS[i]}
                    fill={COLORS[i]}
                    fillOpacity={0.08}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Algorithm descriptions */}
      <div className="pg-card" style={{ padding: '24px' }}>
        <div className="font-display" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>
          Algorithm Overview
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            {
              title: 'Logistic Regression',
              desc: 'Linear probabilistic model. Fast, interpretable, and effective baseline for binary classification.',
              pros: ['Highly interpretable', 'Fast training', 'Good with linear patterns'],
              cons: ['Limited to linear boundaries', 'May underfit complex data'],
              color: COLORS[0],
            },
            {
              title: 'Random Forest',
              desc: 'Ensemble of decision trees with majority voting. Handles non-linear relationships and feature interactions.',
              pros: ['Feature importance scores', 'Robust to overfitting', 'Non-linear patterns'],
              cons: ['Slower inference', 'Less interpretable'],
              color: COLORS[1],
            },
            {
              title: 'Neural Network (MLP)',
              desc: 'Multi-layer perceptron learning complex mappings through backpropagation and hidden layers.',
              pros: ['Complex pattern learning', 'Flexible architecture', 'Adapts to large datasets'],
              cons: ['Black box model', 'Longer training', 'Needs more data'],
              color: COLORS[2],
            },
            {
              title: 'Support Vector Machine',
              desc: 'Finds the optimal separating hyperplane using support vectors in high-dimensional space.',
              pros: ['Effective in high dimensions', 'Memory efficient', 'Strong theoretical basis'],
              cons: ['Slow on large data', 'Sensitive to scaling'],
              color: COLORS[3],
            },
          ].map(({ title, desc, pros, cons, color }) => (
            <div key={title} style={{ padding: '16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', borderLeft: `3px solid ${color}` }}>
              <div className="font-display" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{title}</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>{desc}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Pros</div>
                  {pros.map(p => <div key={p} style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>· {p}</div>)}
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Cons</div>
                  {cons.map(c => <div key={c} style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>· {c}</div>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}