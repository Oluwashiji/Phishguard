import { Shield, BarChart3, Info, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Page } from '../App';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const menuItems = [
  { id: 'dashboard' as Page, label: 'Scanner', icon: Shield, desc: 'Detect threats' },
  { id: 'comparison' as Page, label: 'Model Lab', icon: BarChart3, desc: 'Compare ML models' },
  { id: 'about' as Page, label: 'About', icon: Info, desc: 'How it works' },
  { id: 'admin' as Page, label: 'Admin', icon: Settings, desc: 'System controls' },
];

export function Sidebar({ currentPage, onPageChange, isOpen, onToggle }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 40, display: 'none'
          }}
          className="mobile-overlay"
        />
      )}

      <aside style={{
        width: isOpen ? '220px' : '64px',
        minWidth: isOpen ? '220px' : '64px',
        height: '100vh',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease, min-width 0.3s ease',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 50,
      }}>

        {/* Logo */}
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          padding: isOpen ? '0 16px' : '0',
          justifyContent: isOpen ? 'space-between' : 'center',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '32px', height: '32px', flexShrink: 0,
              background: 'var(--red)', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px var(--red-glow)',
            }}>
              <Shield size={16} color="white" />
            </div>
            {isOpen && (
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  PhishGuard
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  ML Detection
                </div>
              </div>
            )}
          </div>
          {isOpen && (
            <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', padding: '4px' }}>
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id;
            return (
              <button
                key={id}
                onClick={() => onPageChange(id)}
                title={!isOpen ? label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: isOpen ? '10px 12px' : '10px',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  borderRadius: '8px',
                  border: `1px solid ${active ? 'rgba(230,57,70,0.25)' : 'transparent'}`,
                  background: active ? 'var(--red-dim)' : 'transparent',
                  color: active ? 'var(--red)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  width: '100%',
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; } }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {isOpen && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Toggle */}
        {!isOpen && (
          <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              onClick={onToggle}
              style={{
                width: '100%', padding: '8px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', justifyContent: 'center',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Footer */}
        {isOpen && (
          <div style={{
            padding: '16px', borderTop: '1px solid var(--border)', flexShrink: 0,
          }}>
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>
                4 ML Models Active
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Random Forest · LR · SVM · MLP
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}