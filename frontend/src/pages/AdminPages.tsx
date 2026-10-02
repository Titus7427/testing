import { useEffect, useState } from 'react'
import { Activity, ArrowRight, BadgeCheck, Check, ShieldCheck, Users, X } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { apiRequest } from '../lib/api'

type Overview = {
  users: number
  customers: number
  providers: number
  provider_statuses: Record<string, number>
  requests: number
  request_statuses: Record<string, number>
  bookings: number
  services: number
  categories: number
}
type AdminProvider = {
  id: number
  business_name: string
  service_area: string
  location: string
  verification_status: string
  rating: number
  user: { first_name: string; last_name: string; email: string; phone?: string | null } | null
  services: { id: number; name: string; category: string }[]
}

function useAdminOverview() {
  const { token } = useAuth()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!token) return
    const activeToken = token
    let active = true
    apiRequest<Overview>('/admin/overview', {}, activeToken).then((data) => { if (active) setOverview(data) }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load admin data.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])
  return { overview, loading, error }
}

export function AdminOverviewPage() {
  const { overview, loading, error } = useAdminOverview()
  if (loading) return <div className="dashboard-loading">Loading administration overview...</div>
  if (error || !overview) return <div className="dashboard-error">{error || 'Overview is unavailable.'}</div>
  return <div className="role-page"><div className="dashboard-page-heading"><div><span className="dashboard-kicker">PLATFORM OPERATIONS</span><h1>Marketplace overview</h1><p>Monitor participation, provider verification, requests, and completed service activity.</p></div><span className="admin-access-badge"><ShieldCheck size={15} /> Administrator</span></div><section className="metric-grid admin-metrics"><article className="metric-card metric-mint"><span className="metric-icon"><Users size={18} /></span><small>Registered users</small><strong>{overview.users}</strong><span>{overview.customers} customer accounts</span></article><article className="metric-card metric-white"><span className="metric-icon"><BadgeCheck size={18} /></span><small>Provider profiles</small><strong>{overview.providers}</strong><span>{overview.provider_statuses.verified || 0} verified · {overview.provider_statuses.pending || 0} pending</span></article><article className="metric-card metric-amber"><span className="metric-icon"><Activity size={18} /></span><small>Service requests</small><strong>{overview.requests}</strong><span>{overview.request_statuses.submitted || 0} currently open</span></article><article className="metric-card metric-white"><span className="metric-icon"><Check size={18} /></span><small>Bookings</small><strong>{overview.bookings}</strong><span>{overview.services} services · {overview.categories} categories</span></article></section><div className="dashboard-two-column"><section className="dashboard-panel"><div className="panel-heading"><div><span className="dashboard-kicker">PROVIDER GOVERNANCE</span><h2>Verification queue</h2></div><a href="/admin/providers">Review providers <ArrowRight size={14} /></a></div><div className="admin-queue-card"><span className="queue-count">{overview.provider_statuses.pending || 0}</span><div><strong>Profiles waiting for review</strong><small>Confirm business details and service coverage before verification.</small></div><a href="/admin/providers" aria-label="Open provider review"><ArrowRight size={16} /></a></div></section><section className="dashboard-panel admin-health-panel"><span className="dashboard-kicker">SERVICE REQUEST PIPELINE</span><h2>Request status</h2>{Object.entries(overview.request_statuses).map(([status, count]) => <div className="status-count-row" key={status}><span>{status}</span><strong>{count}</strong></div>)}</section></div></div>
}

export function AdminProvidersPage() {
  const { token } = useAuth()
  const [providers, setProviders] = useState<AdminProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    const activeToken = token
    let active = true
    apiRequest<AdminProvider[]>(`/admin/providers?status=${statusFilter}`, {}, activeToken).then((result) => {
      if (active) setProviders(result)
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load providers.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [statusFilter, token])

  async function setVerification(provider: AdminProvider, verificationStatus: 'verified' | 'rejected') {
    if (!token) return
    setUpdatingId(provider.id)
    setError('')
    try {
      await apiRequest(`/admin/providers/${provider.id}/verification`, { method: 'PATCH', body: JSON.stringify({ verification_status: verificationStatus }) }, token)
      setProviders((current) => current.filter((item) => item.id !== provider.id))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update this profile.')
    } finally {
      setUpdatingId(null)
    }
  }

  return <div className="role-page"><div className="dashboard-page-heading"><div><span className="dashboard-kicker">TRUST AND SAFETY</span><h1>Provider verification</h1><p>Review local business profiles before customers see providers as verified.</p></div><span className="admin-access-badge"><ShieldCheck size={15} /> Administrator</span></div><div className="admin-filter-row"><div className="admin-status-tabs" role="group" aria-label="Filter provider status">{['pending', 'verified', 'rejected'].map((status) => <button key={status} className={statusFilter === status ? 'active' : ''} onClick={() => setStatusFilter(status)}>{status}</button>)}</div><span>{providers.length} profiles</span></div>{error && <div className="dashboard-error">{error}</div>}{loading ? <div className="dashboard-loading">Loading provider profiles...</div> : providers.length ? <section className="admin-provider-list">{providers.map((provider) => <article className="admin-provider-card" key={provider.id}><div className="admin-provider-avatar">{provider.business_name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('')}</div><div className="admin-provider-details"><div className="admin-provider-head"><div><span className="dashboard-kicker">{provider.verification_status} PROFILE</span><h2>{provider.business_name}</h2></div><span className={`verification-pill verify-${provider.verification_status}`}>{provider.verification_status}</span></div><p>{provider.user?.first_name} {provider.user?.last_name} · {provider.user?.email}</p><p>{provider.user?.phone || 'No phone provided'} · {provider.service_area || provider.location}</p><div className="provider-service-tags">{provider.services.map((service) => <span key={service.id}>{service.name}</span>)}</div>{statusFilter === 'pending' && <div className="admin-review-actions"><button className="approve-provider-button" disabled={updatingId === provider.id} onClick={() => void setVerification(provider, 'verified')}><Check size={15} /> Verify provider</button><button className="reject-provider-button" disabled={updatingId === provider.id} onClick={() => void setVerification(provider, 'rejected')}><X size={15} /> Reject</button></div>}</div></article>)}</section> : <div className="dashboard-empty"><BadgeCheck size={24} /><h2>No {statusFilter} provider profiles</h2><p>This queue is clear.</p></div>}</div>
}

export function AdminActivityPage() {
  const { overview, loading, error } = useAdminOverview()
  if (loading) return <div className="dashboard-loading">Loading marketplace activity...</div>
  if (error || !overview) return <div className="dashboard-error">{error || 'Activity is unavailable.'}</div>
  const rows = Object.entries(overview.request_statuses)
  return <div className="role-page"><div className="dashboard-page-heading"><div><span className="dashboard-kicker">MARKETPLACE OPERATIONS</span><h1>Activity and service health</h1><p>Review the current movement of requests through the marketplace.</p></div></div><section className="dashboard-panel activity-panel"><div className="panel-heading"><div><span className="dashboard-kicker">REQUEST PIPELINE</span><h2>Current request totals</h2></div><Activity size={19} /></div>{rows.length ? rows.map(([status, count]) => <div className="activity-row" key={status}><span className={`activity-status activity-${status}`} /><span>{status}</span><div className="activity-bar"><i style={{ width: `${Math.max(4, count / Math.max(overview.requests, 1) * 100)}%` }} /></div><strong>{count}</strong></div>) : <p className="activity-empty">No service requests have been created.</p>}</section></div>
}
