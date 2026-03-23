import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, ShieldAlert, Network, Search,
  MessageSquare, Settings, LogOut, User, Eye, RotateCcw
} from 'lucide-react'

export default function Sidebar() {
  const {
    user, logout, canAccessSettings, canAccessInvestigation,
    isAdmin, viewAsRole, startViewAs, stopViewAs, effectiveRole,
  } = useAuth()

  const navItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/alerts', icon: <ShieldAlert size={20} />, label: 'Alerts' },
    { path: '/clusters', icon: <Network size={20} />, label: 'Clusters' },
    ...(canAccessInvestigation() ? [
      { path: '/investigation', icon: <Search size={20} />, label: 'Investigation' },
      { path: '/query', icon: <MessageSquare size={20} />, label: 'AI Query' },
    ] : []),
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
        {/* View As — Admin only */}
        {isAdmin() && (
          <div style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: viewAsRole ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
            border: viewAsRole ? '1px solid rgba(245,158,11,0.25)' : '1px solid transparent',
            marginBottom: 8,
            transition: 'all 0.2s ease',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 6,
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              <Eye size={12} />
              View As
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['admin', 'investigator', 'viewer'].map(role => (
                <button
                  key={role}
                  onClick={() => startViewAs(role)}
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    borderRadius: 6,
                    border: 'none',
                    background: effectiveRole === role
                      ? `${roleColors[role]}22`
                      : 'rgba(255,255,255,0.04)',
                    color: effectiveRole === role
                      ? roleColors[role]
                      : '#64748b',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s ease',
                    outline: effectiveRole === role
                      ? `1px solid ${roleColors[role]}44`
                      : 'none',
                  }}
                >
                  {role === 'investigator' ? 'Invest.' : role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
            {viewAsRole && (
              <button
                onClick={stopViewAs}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  width: '100%',
                  marginTop: 6,
                  padding: '3px 0',
                  borderRadius: 4,
                  border: 'none',
                  background: 'rgba(245,158,11,0.12)',
                  color: '#f59e0b',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={10} />
                Back to Admin
              </button>
            )}
          </div>
        )}

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
              background: `linear-gradient(135deg, ${roleColors[effectiveRole] || '#3b82f6'}, ${roleColors[effectiveRole] || '#3b82f6'}88)`,
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
                color: roleColors[effectiveRole] || '#94a3b8',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}>
                {viewAsRole ? `Viewing as ${viewAsRole}` : effectiveRole}
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
