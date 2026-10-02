import { useEffect, useState, type FormEvent } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { ArrowRight, Check, Clock3, MapPin, Search, ShieldCheck, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { apiRequest } from '../lib/api'
import 'leaflet/dist/leaflet.css'

type Service = {
  id: number
  name: string
  description: string
  base_price: number
  category: string
}
type Provider = {
  id: number
  business_name: string
  service_area: string
  location: string
  latitude: number | null
  longitude: number | null
  show_location?: boolean
  verification_status: string
  rating: number
  completed_jobs: number
  response_rate: number
  services: Service[]
}
type ServiceRequestItem = {
  id: number
  title: string
  description: string
  urgency: string
  location: string
  status: string
  service: Service | null
}

function RequestStatus({ status }: { status: string }) {
  const label = status === 'submitted' ? 'Finding a provider' : status
  return <span className={`request-status status-${status}`}>{label}</span>
}

function MapFocus({ position }: { position: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.flyTo(position, 13, { duration: 0.6 }) }, [map, position])
  return null
}

export function CustomerOverview() {
  const { token, user } = useAuth()
  const [requests, setRequests] = useState<ServiceRequestItem[]>([])
  const [providerCount, setProviderCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.all([
      apiRequest<ServiceRequestItem[]>('/service-requests', {}, token),
      apiRequest<Provider[]>('/providers'),
    ]).then(([nextRequests, providers]) => {
      if (!active) return
      setRequests(nextRequests)
      setProviderCount(providers.length)
    }).catch(() => {
      if (active) setRequests([])
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  const openRequests = requests.filter((request) => request.status === 'submitted' || request.status === 'accepted').length
  const latestRequest = requests[0]

  return (
    <div className="role-page customer-page">
      <div className="dashboard-page-heading">
        <div><span className="dashboard-kicker">YOUR HOME SERVICES</span><h1>Good morning, {user?.first_name}.</h1><p>Find local help or pick up where you left off.</p></div>
        <Link className="dashboard-primary-action" to="/customer/providers">Find a provider <ArrowRight size={16} /></Link>
      </div>
      <section className="metric-grid" aria-label="Customer activity summary">
        <article className="metric-card metric-mint"><span className="metric-icon"><Clock3 size={18} /></span><small>Active requests</small><strong>{loading ? '—' : openRequests}</strong><span>Requests in progress</span></article>
        <article className="metric-card metric-white"><span className="metric-icon"><ShieldCheck size={18} /></span><small>Vetted local providers</small><strong>{loading ? '—' : providerCount}</strong><span>Ready to help in Kampala</span></article>
        <article className="metric-card metric-amber"><span className="metric-icon"><ClipboardIcon /></span><small>All-time requests</small><strong>{loading ? '—' : requests.length}</strong><span>Your service history</span></article>
      </section>
      <div className="dashboard-two-column">
        <section className="dashboard-panel">
          <div className="panel-heading"><div><span className="dashboard-kicker">RECENT ACTIVITY</span><h2>Your latest request</h2></div><Link to="/customer/requests">View all <ArrowRight size={14} /></Link></div>
          {loading ? <div className="panel-loading">Loading your activity...</div> : latestRequest ? (
            <article className="dashboard-request-card"><div className="request-card-top"><span>{latestRequest.service?.name || 'Service request'}</span><RequestStatus status={latestRequest.status} /></div><h3>{latestRequest.title}</h3><p>{latestRequest.description}</p><div className="request-card-footer"><span><MapPin size={13} />{latestRequest.location}</span><span>{latestRequest.urgency} priority</span></div></article>
          ) : <div className="empty-panel"><p>You haven’t requested a service yet.</p><Link to="/customer/providers">Browse local providers <ArrowRight size={14} /></Link></div>}
        </section>
        <section className="dashboard-panel next-step-panel">
          <span className="dashboard-kicker">A GOOD PLACE TO START</span><h2>Find the right person for the job.</h2><p>Compare trusted providers near you, see their work areas, and contact the right one for your service.</p><Link className="panel-callout-link" to="/customer/providers"><span><MapPin size={19} /></span><span>Explore the provider map<small>Browse services by location</small></span><ArrowRight size={16} /></Link>
        </section>
      </div>
      <section className="dashboard-panel quick-services-panel"><div className="panel-heading"><div><span className="dashboard-kicker">QUICK ACCESS</span><h2>Popular services</h2></div><Link to="/customer/providers">All providers <ArrowRight size={14} /></Link></div><div className="quick-service-grid"><Link to="/customer/providers?service=computer"><span className="quick-service-icon">01</span><span><strong>Computer repair</strong><small>Repairs and troubleshooting</small></span><ArrowRight size={15} /></Link><Link to="/customer/providers?service=plumbing"><span className="quick-service-icon quick-two">02</span><span><strong>Plumbing</strong><small>Leaks, pipes, and fixtures</small></span><ArrowRight size={15} /></Link><Link to="/customer/providers?service=electrical"><span className="quick-service-icon quick-three">03</span><span><strong>Electrical</strong><small>Safe repairs and installations</small></span><ArrowRight size={15} /></Link></div></section>
    </div>
  )
}

function ClipboardIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 9 4.5ZM9 10h6M9 14h6M9 18h3"/></svg>
}

export function CustomerRequestsPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState<ServiceRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    apiRequest<ServiceRequestItem[]>('/service-requests', {}, token).then((result) => {
      if (active) setRequests(result)
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load requests.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  return (
    <div className="role-page">
      <div className="dashboard-page-heading"><div><span className="dashboard-kicker">CUSTOMER ACTIVITY</span><h1>My service requests</h1><p>Follow each request from the first message to provider acceptance.</p></div><Link className="dashboard-primary-action" to="/customer/providers">Find a provider <ArrowRight size={16} /></Link></div>
      {loading ? <div className="dashboard-loading">Loading your requests...</div> : error ? <div className="dashboard-error">{error}</div> : requests.length ? <section className="request-history-list">{requests.map((item) => <article className="request-history-item" key={item.id}><div className="history-main"><span className="history-service">{item.service?.name || 'Service request'} · {item.urgency} priority</span><h2>{item.title}</h2><p>{item.description}</p><span className="history-location"><MapPin size={13} />{item.location}</span></div><div className="history-side"><RequestStatus status={item.status} /><span>Request #{item.id}</span></div></article>)}</section> : <section className="dashboard-empty"><ClipboardIcon /><h2>No requests yet</h2><p>Your submitted service requests will appear here.</p><Link className="dashboard-primary-action" to="/customer/providers">Browse providers <ArrowRight size={16} /></Link></section>}
    </div>
  )
}

export function CustomerProvidersPage() {
  const { token } = useAuth()
  const [providers, setProviders] = useState<Provider[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [serviceFilter, setServiceFilter] = useState(() => new URLSearchParams(window.location.search).get('service') || '')
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null)
  const [requestService, setRequestService] = useState<Service | null>(null)
  const [requestBusy, setRequestBusy] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([apiRequest<Provider[]>('/providers'), apiRequest<Service[]>('/services')]).then(([nextProviders, nextServices]) => {
      if (!active) return
      setProviders(nextProviders.filter((provider) => provider.verification_status === 'verified'))
      setServices(nextServices)
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load providers.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filteredProviders = providers.filter((provider) => {
    const matchesQuery = `${provider.business_name} ${provider.service_area} ${provider.location} ${provider.services.map((item) => item.name).join(' ')}`.toLowerCase().includes(query.toLowerCase())
    const matchesService = !serviceFilter || provider.services.some((item) => `${item.name} ${item.category}`.toLowerCase().includes(serviceFilter.toLowerCase()))
    return matchesQuery && matchesService
  })
  const mappedProviders = filteredProviders.filter((provider) => provider.latitude !== null && provider.longitude !== null)
  const selected = mappedProviders.find((provider) => provider.id === selectedProvider) || mappedProviders[0]
  const position: [number, number] = selected ? [selected.latitude as number, selected.longitude as number] : [0.3476, 32.5825]

  async function submitServiceRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !requestService) return
    setRequestBusy(true)
    setRequestError('')
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      await apiRequest('/service-requests', { method: 'POST', body: JSON.stringify({ ...payload, service_id: requestService.id }) }, token)
      setRequestService(null)
      setNotice('Your request was sent to verified providers who offer this service.')
      window.setTimeout(() => setNotice(''), 5000)
    } catch (submitError) {
      setRequestError(submitError instanceof Error ? submitError.message : 'Could not send your request.')
    } finally {
      setRequestBusy(false)
    }
  }

  return (
    <div className="role-page providers-page">
      <div className="dashboard-page-heading"><div><span className="dashboard-kicker">TRUSTED LOCAL PROFESSIONALS</span><h1>Find your local pro.</h1><p>Compare verified providers and see their location when they choose to share it.</p></div><span className="verified-summary"><ShieldCheck size={16} /> Verified providers only</span></div>
      <div className="provider-search-row"><label className="provider-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by trade, provider, or area" /></label><select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} aria-label="Filter by service"><option value="">All services</option>{services.map((service) => <option key={service.id} value={service.name}>{service.name}</option>)}</select></div>
      {loading ? <div className="dashboard-loading">Finding verified providers...</div> : error ? <div className="dashboard-error">{error}</div> : <div className="provider-finder-grid">
        <section className="provider-directory" aria-label="Verified providers">
          <div className="directory-count">{filteredProviders.length} providers <span>·</span> {mappedProviders.length} map pins shared</div>
          {filteredProviders.map((provider) => <article className={provider.id === selected?.id ? 'directory-provider selected' : 'directory-provider'} key={provider.id} onClick={() => setSelectedProvider(provider.id)}><div className="directory-avatar">{provider.business_name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('')}</div><div className="directory-info"><div className="directory-title-row"><h2>{provider.business_name}</h2><ShieldCheck size={15} /></div><span className="directory-area"><MapPin size={12} />{provider.service_area || provider.location}</span><span className="directory-rating"><Star size={13} fill="currentColor" /> {provider.rating.toFixed(1)} <i>·</i> {provider.completed_jobs} jobs</span><div className="provider-service-tags">{provider.services.map((service) => <span key={service.id}>{service.name}</span>)}</div><div className="directory-actions"><button onClick={(event) => { event.stopPropagation(); setRequestService(provider.services[0] || null) }}>Request service <ArrowRight size={13} /></button>{provider.latitude !== null && provider.longitude !== null && <span><MapPin size={12} /> Pinned</span>}</div></div></article>)}
          {!filteredProviders.length && <div className="directory-empty">No providers match this search yet.</div>}
        </section>
        <section className="provider-map-panel"><div className="map-panel-head"><div><span className="dashboard-kicker">KAMPALA SERVICE MAP</span><strong>{selected ? selected.business_name : 'Provider locations'}</strong></div><span className="map-live-key"><i /> Shared pin</span></div><div className="provider-map" aria-label="Map of providers who shared a location"><MapContainer center={position} zoom={12} scrollWheelZoom className="leaflet-market-map"><MapFocus position={position} /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{mappedProviders.map((provider) => <CircleMarker key={provider.id} center={[provider.latitude as number, provider.longitude as number]} radius={provider.id === selected?.id ? 11 : 8} pathOptions={{ color: '#fffefa', weight: 3, fillColor: provider.id === selected?.id ? '#dc7b4e' : '#246047', fillOpacity: 1 }} eventHandlers={{ click: () => setSelectedProvider(provider.id) }}><Popup><div className="map-popup"><strong>{provider.business_name}</strong><span>{provider.service_area}</span><span>★ {provider.rating.toFixed(1)} · {provider.completed_jobs} jobs</span></div></Popup></CircleMarker>)}</MapContainer>{!mappedProviders.length && <div className="map-empty"><MapPin size={22} /><span>No providers have shared a precise map pin in this search.</span></div>}</div><p className="map-attribution-note">Pins appear only when providers opt in to sharing an approximate service location. Map data © OpenStreetMap.</p></section>
      </div>}
      {requestService && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setRequestService(null)}><section className="dialog request-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-request-title"><button className="dialog-close" onClick={() => setRequestService(null)} aria-label="Close request"><span>×</span></button><span className="dashboard-kicker">NEW SERVICE REQUEST</span><h2 id="customer-request-title">Tell us what you need.</h2><p className="dialog-subtitle">Providers who offer <strong>{requestService.name}</strong> will be notified.</p><form className="dialog-form" onSubmit={submitServiceRequest}><label>Request title<input required name="title" maxLength={180} defaultValue={`Help with ${requestService.name.toLowerCase()}`} /></label><label>Describe the job<textarea required name="description" rows={4} /></label><label>Service location<input required name="location" maxLength={200} placeholder="Neighbourhood or address" /></label><label>Urgency<select name="urgency" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="emergency">Emergency</option></select></label>{requestError && <p className="login-error">{requestError}</p>}<button className="login-submit" disabled={requestBusy}>{requestBusy ? 'Sending...' : 'Send request'} <ArrowRight size={16} /></button></form></section></div>}
      {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}
    </div>
  )
}
