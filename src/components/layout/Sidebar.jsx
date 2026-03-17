import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ShieldAlert, Network, Search, MessageSquare, Settings } from 'lucide-react'

const navItems = [
  { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { path: '/alerts', icon: <ShieldAlert size={20} />, label: 'Alerts' },
  { path: '/clusters', icon: <Network size={20} />, label: 'Clusters' },
  { path: '/investigation', icon: <Search size={20} />, label: 'Investigation' },
  { path: '/query', icon: <MessageSquare size={20} />, label: 'AI Query' },
  { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
]

export default function Sidebar() {
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
        <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--sky-text-secondary)' }}>
          Team 1 — Sky Solutions
        </div>
        <div>ACT-IAC AI Hackathon 2026</div>
      </div>
    </aside>
  )
}
