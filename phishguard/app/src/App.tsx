import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ModelComparison } from './pages/ModelComparison';
import { About } from './pages/About';
import { AdminPanel } from './pages/AdminPanel';
import { Toaster } from 'sonner';

export type Page = 'dashboard' | 'comparison' | 'about' | 'admin';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'comparison': return <ModelComparison />;
      case 'about': return <About />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px',
        transition: 'all 0.3s'
      }}>
        {renderPage()}
      </main>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontFamily: "'DM Sans', sans-serif",
          }
        }}
      />
    </div>
  );
}

export default App;
