import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Sidebar from './components/layout/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import SupplierDetail from './pages/SupplierDetail'
import Clusters from './pages/Clusters'
import Investigation from './pages/Investigation'
import AIQuery from './pages/AIQuery'
import Settings from './pages/Settings'

function ProtectedRoute({ children, requiredRoles }) {
  const { user } = useAuth()
  if (requiredRoles && !requiredRoles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Login />

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/supplier/:npi" element={<SupplierDetail />} />
          <Route path="/clusters" element={<Clusters />} />
          <Route path="/investigation" element={
            <ProtectedRoute requiredRoles={['admin', 'investigator']}>
              <Investigation />
            </ProtectedRoute>
          } />
          <Route path="/query" element={<AIQuery />} />
          <Route path="/settings" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
