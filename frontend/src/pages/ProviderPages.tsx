import { useEffect, useState, type FormEvent } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { ArrowRight, Check, Crosshair, MapPin, ShieldCheck, Star, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { apiRequest, formatUgx } from '../lib/api'

type Service = { id: number; name: string; description: string; base_price: number; category: string }
type ProviderProfile = {
  id: number
  business_name: string
  location: string
  service_area: string
  latitude: number | null
  longitude: number | null
  show_location: boolean
  verification_status: string
  rating: number
  completed_jobs: number
  response_rate: number
  service_ids: number[]
}
type OpenRequest = {
  id: number
  title: string
  description: string
  urgency: string
  location: string
  status: string
  service: Service
}

function useProviderDashboard() {
  const { token } = useAuth()
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [requests, setRequests] = useState<OpenRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    if (!token) return
    const nextProfile = await apiRequest<ProviderProfile>('/provider/profile', {}, token)
    const nextRequests = nextProfile.verification_status === 'verified'
      ? await apiRequest<OpenRequest[]>('/providers/service-requests', {}, token)
      : []
    setProfile(nextProfile)
    setRequests(nextRequests)
  }

  useEffect(() => {
    if (!token) return
    const activeToken = token
    let active = true
    async function loadProviderWorkspace() {
      const nextProfile = await apiRequest<ProviderProfile>('/provider/profile', {}, activeToken)
      const nextRequests = nextProfile.verification_status === 'verified'
        ? await apiRequest<OpenRequest[]>('/providers/service-requests', {}, activeToken)
        : []
      if (!active) return
      setProfile(nextProfile)
      setRequests(nextRequests)
    }
    void loadProviderWorkspace().catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load provider workspace.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  return { token, profile, setProfile, requests, setRequests, loading, error, refresh }
}

function ProviderRequestCards({
  requests,
  token,
  onAccepted,
}: {
  requests: OpenRequest[]
  token: string | null
  onAccepted: (id: number) => void
}) {
  const [acceptingId, setAcceptingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function accept(item: OpenRequest) {
    if (!token) return
    setAcceptingId(item.id)
    setError('')
    try {
      await apiRequest(`/service-requests/${item.id}/bookings`, {
        method: 'POST',
        body: JSON.stringify({ agreed_price: item.service.base_price }),
      }, token)
      onAccepted(item.id)
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'Could not accept this request.')
    } finally {
      setAcceptingId(null)
    }
  }

  if (!requests.length) return <div className="dashboard-empty compact-empty"><Wrench size={22} /><h2>No matching open requests</h2><p>New jobs for your selected services will appear here. Keep notifications enabled to spot them quickly.</p></div>

  return <div className="provider-job-list">{error && <p className="dashboard-error">{error}</p>}{requests.map((item) => <article className="provider-job-card" key={item.id}><div className="job-card-top"><span className={`urgency-tag urgency-${item.urgency}`}>{item.urgency} priority</span><span>#{item.id}</span></div><span className="job-service-label">{item.service.category} / {item.service.name}</span><h2>{item.title}</h2><p>{item.description}</p><div className="job-meta-row"><span><MapPin size={14} />{item.location}</span><strong>Starting at {formatUgx(item.service.base_price)}</strong></div><button className="dashboard-primary-action" disabled={acceptingId === item.id} onClick={() => void accept(item)}>{acceptingId === item.id ? 'Accepting...' : 'Accept request'} <ArrowRight size={15} /></button></article>)}</div>
}

function acceptedNotice(setNotice: (value: string) => void, setRequests: (update: (items: OpenRequest[]) => OpenRequest[]) => void) {
  return (id: number) => {
    setRequests((items) => items.filter((item) => item.id !== id))
    setNotice(`Request #${id} accepted. The customer has been notified.`)
    window.setTimeout(() => setNotice(''), 5000)
  }
}

export function ProviderOverview() {
  const { token, profile, requests, setRequests, loading, error, refresh } = useProviderDashboard()
  const [notice, setNotice] = useState('')
  const onAccepted = acceptedNotice(setNotice, setRequests)
  if (loading) return <div className="dashboard-loading">Loading provider workspace...</div>
  if (error) return <div className="dashboard-error">{error}</div>
  if (!profile) return <div className="dashboard-error">Provider profile not found.</div>

  return <div className="role-page">
    <div className="dashboard-page-heading"><div><span className="dashboard-kicker">PROVIDER WORKSPACE</span><h1>Good morning, {profile.business_name}.</h1><p>Manage your availability, review requests, and keep your provider profile up to date.</p></div><Link className="dashboard-primary-action" to="/provider/profile">Edit your profile <ArrowRight size={16} /></Link></div>
    {profile.verification_status !== 'verified' && <div className="verification-banner"><ShieldCheck size={20} /><div><strong>Your profile is under review.</strong><p>You can finish your profile now. The open request inbox becomes available after verification.</p></div><span>{profile.verification_status}</span></div>}
    <section className="metric-grid provider-metrics"><article className="metric-card metric-mint"><span className="metric-icon"><Wrench size={18} /></span><small>Matching open requests</small><strong>{requests.length}</strong><span>Based on your listed services</span></article><article className="metric-card metric-white"><span className="metric-icon"><Star size={18} /></span><small>Provider rating</small><strong>{profile.rating ? profile.rating.toFixed(1) : 'New'}</strong><span>{profile.completed_jobs} completed jobs</span></article><article className="metric-card metric-amber"><span className="metric-icon"><ShieldCheck size={18} /></span><small>Profile verification</small><strong className="verification-metric">{profile.verification_status}</strong><span>{profile.show_location ? 'Map pin shared with customers' : 'Map pin hidden from customers'}</span></article></section>
    <section className="dashboard-panel provider-inbox-panel"><div className="panel-heading"><div><span className="dashboard-kicker">LIVE OPPORTUNITIES</span><h2>Requests matching your services</h2></div><button className="panel-refresh" onClick={() => void refresh()}><span>Refresh</span><ArrowRight size={14} /></button></div><ProviderRequestCards requests={requests} token={token} onAccepted={onAccepted} /></section>
    {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}
  </div>
}

export function ProviderRequestsPage() {
  const { token, requests, setRequests, loading, error, refresh } = useProviderDashboard()
  const [notice, setNotice] = useState('')
  const onAccepted = acceptedNotice(setNotice, setRequests)
  return <div className="role-page"><div className="dashboard-page-heading"><div><span className="dashboard-kicker">MATCHED TO YOUR SERVICES</span><h1>Open requests</h1><p>Jobs nearby that match the services on your provider profile.</p></div><button className="dashboard-secondary-action" onClick={() => void refresh()}>Refresh inbox <ArrowRight size={15} /></button></div>{loading ? <div className="dashboard-loading">Loading open requests...</div> : error ? <div className="dashboard-error">{error}</div> : <ProviderRequestCards requests={requests} token={token} onAccepted={onAccepted} />}{notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}</div>
}

function LocationPicker({
  position,
  onChoose,
}: {
  position: [number, number]
  onChoose: (position: [number, number]) => void
}) {
  useMapEvents({ click(event) { onChoose([event.latlng.lat, event.latlng.lng]) } })
  return <CircleMarker center={position} radius={10} pathOptions={{ color: '#fffefa', weight: 3, fillColor: '#dc7b4e', fillOpacity: 1 }} />
}

export function ProviderProfilePage() {
  const { token } = useAuth()
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [serviceIds, setServiceIds] = useState<number[]>([])
  const [position, setPosition] = useState<[number, number]>([0.3476, 32.5825])
  const [locationSet, setLocationSet] = useState(false)
  const [location, setLocation] = useState('Kampala, Uganda')
  const [shareLocation, setShareLocation] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.all([
      apiRequest<ProviderProfile>('/provider/profile', {}, token),
      apiRequest<Service[]>('/services'),
    ]).then(([nextProfile, nextServices]) => {
      if (!active) return
      setProfile(nextProfile)
      setServices(nextServices)
      setServiceIds(nextProfile.service_ids || [])
      setShareLocation(nextProfile.show_location)
      setLocation(nextProfile.location || nextProfile.service_area || '')
      if (nextProfile.latitude !== null && nextProfile.longitude !== null) {
        setPosition([nextProfile.latitude, nextProfile.longitude])
        setLocationSet(true)
      }
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load your profile.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  function locateMe() {
    if (!navigator.geolocation) {
      setError('This browser does not support location detection. Click your approximate position on the map instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition([result.coords.latitude, result.coords.longitude])
        setLocationSet(true)
        setError('')
      },
      () => setError('Location access was not granted. You can click the map to place an approximate pin.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    const formData = new FormData(event.currentTarget)
    const nextLocation = String(formData.get('location') || '').trim()
    if (shareLocation && !locationSet) {
      setError('Choose your location on the map or use browser location before sharing a pin.')
      setSaving(false)
      return
    }
    try {
      await apiRequest('/provider/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          location: nextLocation,
          show_location: shareLocation,
          ...(locationSet ? { latitude: position[0], longitude: position[1] } : {}),
        }),
      }, token)
      await apiRequest('/provider/services', { method: 'PUT', body: JSON.stringify({ service_ids: serviceIds }) }, token)
      setLocation(nextLocation)
      setNotice('Provider profile saved.')
      window.setTimeout(() => setNotice(''), 4500)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your provider profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="dashboard-loading">Loading provider profile...</div>

  return <div className="role-page"><div className="dashboard-page-heading"><div><span className="dashboard-kicker">YOUR PUBLIC BUSINESS DETAILS</span><h1>Provider profile</h1><p>Choose the services customers can request and decide whether to share your map pin.</p></div>{profile && <span className={`verification-pill verify-${profile.verification_status}`}>{profile.verification_status}</span>}</div>{error && <div className="dashboard-error">{error}</div>}{profile && <form className="provider-profile-form" onSubmit={saveProfile}>
    <section className="dashboard-panel profile-service-panel"><div className="panel-heading"><div><span className="dashboard-kicker">WHAT YOU DO</span><h2>Your services</h2></div><span>{serviceIds.length} selected</span></div><div className="service-checkbox-grid">{services.map((service) => <label className={serviceIds.includes(service.id) ? 'service-checkbox checked' : 'service-checkbox'} key={service.id}><input type="checkbox" checked={serviceIds.includes(service.id)} onChange={(event) => setServiceIds((current) => event.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id))} /><span className="service-checkbox-mark">{serviceIds.includes(service.id) && <Check size={13} />}</span><span><strong>{service.name}</strong><small>{service.category} · from {formatUgx(service.base_price)}</small></span></label>)}</div></section>
    <section className="dashboard-panel location-editor"><div className="panel-heading"><div><span className="dashboard-kicker">OPTIONAL PUBLIC MAP PIN</span><h2>Set your service location</h2></div><button className="locate-button" type="button" onClick={locateMe}><Crosshair size={15} />Use my location</button></div><label className="profile-field">Location or service area<input name="location" value={location} onChange={(event) => setLocation(event.target.value)} maxLength={200} placeholder="Neighbourhood or district" /></label><div className="pin-coordinates"><span><MapPin size={14} />Pin preview</span><code>{locationSet ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : 'Choose a pin to set coordinates'}</code></div><div className="location-picker-map"><MapContainer center={position} zoom={13} scrollWheelZoom className="leaflet-market-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><LocationPicker position={position} onChoose={(nextPosition) => { setPosition(nextPosition); setLocationSet(true) }} /></MapContainer></div><p className="map-instructions">Click the map to place your service pin, or use your device location.</p><label className="location-share-toggle"><input type="checkbox" checked={shareLocation} onChange={(event) => setShareLocation(event.target.checked)} /><span className="toggle-track" /><span><strong>Show my pin to customers</strong><small>Your exact pin is hidden unless you enable this setting.</small></span></label></section>
    {error && <p className="login-error">{error}</p>}<button className="dashboard-primary-action save-profile-action" disabled={saving}>{saving ? 'Saving profile...' : 'Save profile and services'} <Check size={16} /></button>
  </form>}{notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}</div>
}
