import { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { ModelComparison } from './pages/ModelComparison';
import { About } from './pages/About';
import { AdminPanel } from './pages/AdminPanel';
import { Toaster } from 'sonner';
import { Shield, BarChart3, Info, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from './services/api';

export type Page = 'dashboard' | 'comparison' | 'about' | 'admin';

const NAV_ITEMS = [
  { id: 'dashboard' as Page, label: 'Scanner', icon: Shield },
  { id: 'comparison' as Page, label: 'Models', icon: BarChart3 },
  { id: 'about' as Page, label: 'About', icon: Info },
  { id: 'admin' as Page, label: 'Admin', icon: Settings },
];

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Warm up backend on load to reduce first-scan latency
  useEffect(() => {
    api.healthCheck().catch(() => {});
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'comparison': return <ModelComparison />;
      case 'about': return <About />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard />;
    }
  };

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)', width: '100vw', overflowX: 'hidden', position: 'relative' }}>
        <header style={{
          height: '56px', flexShrink: 0,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{
            width: '28px', height: '28px', background: 'var(--red)', borderRadius: '7px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 10px var(--red-glow)',
          }}>
            <Shield size={14} color="white" />
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>
            PhishGuard
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>
            ML Detection
          </span>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: '80px', width: '100%', boxSizing: 'border-box' }}>
          {renderPage()}
        </main>

        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '64px', background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id;
            return (
              <button key={id} onClick={() => setCurrentPage(id)} style={{
                flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? 'var(--red)' : 'var(--text-dim)', transition: 'color 0.15s',
              }}>
                <Icon size={20} />
                <span style={{ fontSize: '10px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{label}</span>
              </button>
            );
          })}
        </nav>
        <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" } }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <aside style={{
        width: sidebarOpen ? '220px' : '64px', minWidth: sidebarOpen ? '220px' : '64px',
        height: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease, min-width 0.3s ease',
        overflow: 'hidden', position: 'relative', zIndex: 50,
      }}>
        <div style={{
          height: '64px', display: 'flex', alignItems: 'center',
          padding: sidebarOpen ? '0 16px' : '0', justifyContent: sidebarOpen ? 'space-between' : 'center',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '32px', height: '32px', flexShrink: 0, background: 'var(--red)',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px var(--red-glow)',
            }}>
              <Shield size={16} color="white" />
            </div>
            {sidebarOpen && (
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: 'var(--text)', letterSpacing: '-0.02em' }}>PhishGuard</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>ML Detection</div>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', padding: '4px' }}>
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id;
            return (
              <button key={id} onClick={() => setCurrentPage(id)} title={!sidebarOpen ? label : undefined} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: sidebarOpen ? '10px 12px' : '10px', justifyContent: sidebarOpen ? 'flex-start' : 'center',
                borderRadius: '8px', border: `1px solid ${active ? 'rgba(230,57,70,0.25)' : 'transparent'}`,
                background: active ? 'var(--red-dim)' : 'transparent',
                color: active ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer',
                transition: 'all 0.15s', width: '100%', fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden',
              }}>
                <Icon size={16} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {!sidebarOpen && (
          <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(true)} style={{
              width: '100%', padding: '8px', background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: '8px',
              color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', justifyContent: 'center',
            }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {sidebarOpen && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>4 ML Models Active</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Random Forest · LR · SVM · MLP</div>
            </div>
          </div>
        )}
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', padding: '32px', transition: 'all 0.3s' }}>
        {renderPage()}
      </main>
      <Toaster theme="dark" toastOptions={{ style: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" } }} />
    </div>
  );
}

export default App;