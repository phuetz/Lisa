/**
 * Modern Layout Component
 * 
 * Layout principal moderne avec navigation et sidebar - Style ChatGPT
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { 
  Menu, Home, Bot, Eye, Mic, Workflow, Settings, 
  Bell, MessageSquare, ChevronLeft, Heart, FileText, Code, HomeIcon
} from 'lucide-react';

interface ModernLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSidebar?: boolean;
  action?: React.ReactNode;
}

export const ModernLayout: React.FC<ModernLayoutProps> = ({
  children,
  title = 'Lisa',
  showSidebar = true,
  action,
}) => {
  // Responsive: détection mobile via MUI useMediaQuery (dynamique)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // < 900px
  const [sidebarOpen, setSidebarOpen] = useState(false); // Fermée par défaut

  // Fermer la sidebar automatiquement quand on passe en mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Eye, label: 'Vision', path: '/vision' },
    { icon: Mic, label: 'Audio', path: '/audio' },
    { icon: Bot, label: 'Agents', path: '/agents' },
    { icon: Workflow, label: 'Workflows', path: '/workflows' },
    { icon: HomeIcon, label: 'Maison', path: '/smart-home' },
    { icon: Heart, label: 'Santé', path: '/health' },
    { icon: FileText, label: 'Documents', path: '/documents' },
    { icon: Code, label: 'Code', path: '/code' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{
      display: 'flex',
      height: '100dvh',
      minHeight: '-webkit-fill-available',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Mobile overlay */}
      {showSidebar && isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40
          }}
        />
      )}
      
      {/* Sidebar */}
      {showSidebar && (
        <aside style={{
          width: sidebarOpen ? (isMobile ? '65vw' : '260px') : '0px',
          maxWidth: isMobile ? '250px' : '260px',
          backgroundColor: '#171717',
          borderRight: '1px solid #2d2d2d',
          display: 'flex',
          position: isMobile ? 'fixed' : 'relative',
          left: 0,
          top: 0,
          height: '100%',
          zIndex: isMobile ? 50 : 'auto',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          overflow: 'hidden'
        }}>
          {/* Logo */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #2d2d2d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10a37f 0%, #1a7f64 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bot size={18} color="#fff" />
              </div>
              <span style={{ 
                fontSize: '18px', 
                fontWeight: 600,
                background: 'linear-gradient(135deg, #10a37f, #1a7f64)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Lisa
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                padding: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav style={{
            flex: 1,
            padding: '12px 8px',
            overflowY: 'auto'
          }}>
            {navigationItems.map((item) => (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                className="nav-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  marginBottom: '4px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isActive(item.path) ? '#2d2d2d' : 'transparent',
                  color: isActive(item.path) ? '#fff' : '#888',
                  transition: 'all 0.2s ease'
                }}
              >
                <item.icon size={18} />
                <span style={{ fontSize: '14px' }}>{item.label}</span>
              </div>
            ))}
          </nav>

          {/* Settings */}
          <div style={{
            padding: '12px 8px',
            borderTop: '1px solid #2d2d2d'
          }}>
            <div
              onClick={() => navigate('/settings')}
              className="nav-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: isActive('/settings') ? '#2d2d2d' : 'transparent',
                color: isActive('/settings') ? '#fff' : '#888',
                transition: 'all 0.2s ease'
              }}
            >
              <Settings size={18} />
              <span style={{ fontSize: '14px' }}>Paramètres</span>
            </div>
          </div>
        </aside>
      )}

      {/* Sidebar Toggle (when closed) */}
      {showSidebar && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            left: '16px',
            top: '16px',
            padding: '10px',
            backgroundColor: '#2d2d2d',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Menu size={20} />
        </button>
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <header style={{
          padding: '16px 24px',
          borderBottom: '1px solid #2d2d2d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1a1a1a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Menu size={20} />
              </button>
            )}
            <h1 style={{ 
              fontSize: '20px', 
              fontWeight: 600,
              color: '#fff',
              margin: 0
            }}>
              {title}
            </h1>
            {action}
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              style={{
                position: 'relative',
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              <Bell size={20} />
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                backgroundColor: '#10a37f',
                borderRadius: '50%'
              }} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#212121'
        }}>
          <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ModernLayout;
