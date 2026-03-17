import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, ShieldAlert, Network, Search,
  MessageSquare, Settings, LogOut, User
} from 'lucide-react'

export default function Sidebar() {
  const { user, logout, canAccessSettings, canAccessInvestigation } = useAuth()

  const navItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/alerts', icon: <ShieldAlert size={20} />, label: 'Alerts' },
    { path: '/clusters', icon: <Network size={20} />, label: 'Clusters' },
    ...(canAccessInvestigation() ? [
      { path: '/investigation', icon: <Search size={20} />, label: 'Investigation' },
    ] : []),
    { path: '/query', icon: <MessageSquare size={20} />, label: 'AI Query' },
    ...(canAccessSettings() ? [
      { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
    ] : []),
  ]

  const roleColors = {
    admin: '#f59e0b',
    investigator: '#3b82f6',
    viewer: '#22c55e',
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Sky Sentinel" className="sidebar-logo-img" />
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {/* User badge */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            marginBottom: 10,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${roleColors[user.role] || '#3b82f6'}, ${roleColors[user.role] || '#3b82f6'}88)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={16} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.2 }}>
                {user.display_name}
              </div>
              <div style={{
                fontSize: 11,
                color: roleColors[user.role] || '#94a3b8',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}>
                {user.role}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
        <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--sky-text-secondary)' }}>
          Team 1 — Sky Solutions
        </div>
        <div>ACT-IAC AI Hackathon 2026</div>
      </div>
    </aside>
  )
}
