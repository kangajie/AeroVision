import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LiveViewPage from './public/LiveViewPage'
import AdminLayout from './admin/AdminLayout'
import DashboardOverview from './admin/DashboardOverview'
import LiveMonitoringPage from './admin/LiveMonitoringPage'
import AnalyticsPage from './admin/AnalyticsPage'
import LogPage from './admin/LogPage'
import ConfigurationPage from './admin/ConfigurationPage'
import AdminLoginPage from './admin/AdminLoginPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<LiveViewPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="login" element={<AdminLoginPage />} />
          <Route path="dashboard" element={<DashboardOverview />} />
          <Route path="live-monitoring" element={<LiveMonitoringPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="log" element={<LogPage />} />
          <Route path="configuration" element={<ConfigurationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
