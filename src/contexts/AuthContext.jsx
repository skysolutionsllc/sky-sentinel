import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewAsRole, setViewAsRole] = useState(null) // Admin "View As" impersonation

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')
    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Login failed')
    }
    const data = await res.json()
    setToken(data.access_token)
    setUser(data.user)
    setViewAsRole(null)
    localStorage.setItem('auth_token', data.access_token)
    localStorage.setItem('auth_user', JSON.stringify(data.user))
    return data.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setViewAsRole(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  // The "effective" role — either the impersonated role or the real role
  const effectiveRole = viewAsRole || user?.role

  const hasRole = (...roles) => user && roles.includes(effectiveRole)

  const isAdmin = () => user?.role === 'admin' // Always check REAL role for admin features
  const isInvestigator = () => hasRole('admin', 'investigator')
  const canAccessSettings = () => user?.role === 'admin' && !viewAsRole // Hide in view-as mode too
  const canAccessInvestigation = () => hasRole('admin', 'investigator')

  const startViewAs = (role) => {
    if (user?.role !== 'admin') return
    setViewAsRole(role === user.role ? null : role)
  }

  const stopViewAs = () => setViewAsRole(null)

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      hasRole,
      isAdmin,
      isInvestigator,
      canAccessSettings,
      canAccessInvestigation,
      effectiveRole,
      viewAsRole,
      startViewAs,
      stopViewAs,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
