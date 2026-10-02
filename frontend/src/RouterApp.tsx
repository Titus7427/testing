import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import type { AccountRole } from './auth/auth-context'
import { useAuth } from './auth/useAuth'
import { AdminActivityPage, AdminOverviewPage, AdminProvidersPage } from './pages/AdminPages'
import { CustomerOverview, CustomerProvidersPage, CustomerRequestsPage } from './pages/CustomerPages'
import { DashboardLayout } from './pages/DashboardLayout'
import { LoginPage } from './pages/LoginPage'
import { ProviderOverview, ProviderProfilePage, ProviderRequestsPage } from './pages/ProviderPages'
import './App.css'
import './Dashboard.css'

function landingRoute(role: AccountRole) {
  return role === 'ADMIN' ? '/admin' : role === 'PROVIDER' ? '/provider' : '/customer'
}

function LoadingScreen() {
  return <main className="session-loading"><span className="session-spinner" /><p>Preparing your MobiServe workspace...</p></main>
}

function PublicLogin() {
  const { user, ready } = useAuth()
  if (!ready) return <LoadingScreen />
  if (user) return <Navigate to={landingRoute(user.role)} replace />
  return <LoginPage />
}

function RequireRole({ role }: { role: AccountRole }) {
  const { user, ready } = useAuth()
  if (!ready) return <LoadingScreen />
  if (!user) return <Navigate to="/" replace />
  if (user.role !== role) return <Navigate to={landingRoute(user.role)} replace />
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicLogin />} />
      <Route element={<RequireRole role="CUSTOMER" />}>
        <Route path="/customer" element={<DashboardLayout role="CUSTOMER" />}>
          <Route index element={<CustomerOverview />} />
          <Route path="providers" element={<CustomerProvidersPage />} />
          <Route path="requests" element={<CustomerRequestsPage />} />
        </Route>
      </Route>
      <Route element={<RequireRole role="PROVIDER" />}>
        <Route path="/provider" element={<DashboardLayout role="PROVIDER" />}>
          <Route index element={<ProviderOverview />} />
          <Route path="requests" element={<ProviderRequestsPage />} />
          <Route path="profile" element={<ProviderProfilePage />} />
        </Route>
      </Route>
      <Route element={<RequireRole role="ADMIN" />}>
        <Route path="/admin" element={<DashboardLayout role="ADMIN" />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="providers" element={<AdminProvidersPage />} />
          <Route path="activity" element={<AdminActivityPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function RouterApp() {
  return <AuthProvider><BrowserRouter><AppRoutes /></BrowserRouter></AuthProvider>
}
