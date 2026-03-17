import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import SupplierDetail from './pages/SupplierDetail'
import Clusters from './pages/Clusters'
import Investigation from './pages/Investigation'
import AIQuery from './pages/AIQuery'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/supplier/:npi" element={<SupplierDetail />} />
            <Route path="/clusters" element={<Clusters />} />
            <Route path="/investigation" element={<Investigation />} />
            <Route path="/query" element={<AIQuery />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
