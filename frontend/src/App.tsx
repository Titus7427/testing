import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Clock3,
  ClipboardList,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Star,
  Wrench,
  X,
} from 'lucide-react'
import './App.css'

type ApiEnvelope<T> = { success: boolean; data: T; error?: { message: string } }
type Category = { id: number; name: string; slug: string; icon?: string }
type Service = {
  id: number
  name: string
  slug: string
  description: string
  base_price: number
  category: string
}
type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  role?: string
}
type Provider = {
  id: number
  business_name: string
  service_area: string
  location: string
  verification_status: string
  rating: number
  completed_jobs: number
  response_rate: number
  user: User | null
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
type ProviderServiceRequest = Omit<ServiceRequestItem, 'service'> & { service: Service }

const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
const tokenStorageKey = 'mobiserve-access-token'
const userStorageKey = 'mobiserve-user'

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })
  const payload = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || 'Something went wrong. Please try again.')
  }
  return payload.data
}

function formatUgx(amount: number) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(amount)
}

function App() {
  const [categories, setCategories] = useState<Category[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [location, setLocation] = useState('Kampala')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem(tokenStorageKey) || '')
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem(userStorageKey)
      return savedUser ? (JSON.parse(savedUser) as User) : null
    } catch {
      return null
    }
  })
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [requestService, setRequestService] = useState<Service | null>(null)
  const [queuedService, setQueuedService] = useState<Service | null>(null)
  const [requestBusy, setRequestBusy] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [myRequestsOpen, setMyRequestsOpen] = useState(false)
  const [myRequests, setMyRequests] = useState<ServiceRequestItem[]>([])
  const [myRequestsLoading, setMyRequestsLoading] = useState(false)
  const [myRequestsError, setMyRequestsError] = useState('')
  const [providerRequestsOpen, setProviderRequestsOpen] = useState(false)
  const [providerRequests, setProviderRequests] = useState<ProviderServiceRequest[]>([])
  const [providerRequestsLoading, setProviderRequestsLoading] = useState(false)
  const [providerRequestsError, setProviderRequestsError] = useState('')
  const [acceptingRequestId, setAcceptingRequestId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function loadMarketplace() {
    try {
      const [nextCategories, nextServices, nextProviders] = await Promise.all([
        apiRequest<Category[]>('/categories'),
        apiRequest<Service[]>('/services'),
        apiRequest<Provider[]>('/providers'),
      ])
      setCategories(nextCategories)
      setServices(nextServices)
      setProviders(nextProviders.filter((provider) => provider.verification_status === 'verified'))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load the marketplace.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitialMarketplace() {
      try {
        const [nextCategories, nextServices, nextProviders] = await Promise.all([
          apiRequest<Category[]>('/categories'),
          apiRequest<Service[]>('/services'),
          apiRequest<Provider[]>('/providers'),
        ])
        if (active) {
          setCategories(nextCategories)
          setServices(nextServices)
          setProviders(nextProviders.filter((provider) => provider.verification_status === 'verified'))
        }
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Could not load the marketplace.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadInitialMarketplace()
    return () => { active = false }
  }, [])

  const normalizedSearch = (submittedSearch || searchTerm).trim().toLowerCase()
  const filteredServices = services.filter((service) => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
    const matchesSearch = !normalizedSearch ||
      `${service.name} ${service.description} ${service.category}`.toLowerCase().includes(normalizedSearch)
    return matchesCategory && matchesSearch
  })

  function openRequest(service: Service) {
    setRequestError('')
    if (!token) {
      setQueuedService(service)
      setAuthMode('login')
      return
    }
    setRequestService(service)
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    try {
      const result = await apiRequest<{ token: string; user: User }>(
        authMode === 'register' ? '/auth/register' : '/auth/login',
        { method: 'POST', body: JSON.stringify(payload) },
      )
      const session = await apiRequest<{ user: User; role: string }>('/auth/me', {
        headers: { Authorization: `Bearer ${result.token}` },
      })
      const signedInUser = { ...result.user, role: session.role }
      localStorage.setItem(tokenStorageKey, result.token)
      localStorage.setItem(userStorageKey, JSON.stringify(signedInUser))
      setToken(result.token)
      setUser(signedInUser)
      setAuthMode(null)
      if (queuedService) {
        setRequestService(queuedService)
        setQueuedService(null)
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign in failed. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!requestService) return
    setRequestBusy(true)
    setRequestError('')
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    try {
      await apiRequest('/service-requests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...payload,
          service_id: requestService.id,
        }),
      })
      setRequestService(null)
      setNotice('Your request is on its way to local providers.')
      window.setTimeout(() => setNotice(''), 5000)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not send your request.')
    } finally {
      setRequestBusy(false)
    }
  }

  function signOut() {
    localStorage.removeItem(tokenStorageKey)
    localStorage.removeItem(userStorageKey)
    setToken('')
    setUser(null)
  }

  async function showMyRequests() {
    setMyRequestsOpen(true)
    setMyRequestsLoading(true)
    setMyRequestsError('')
    try {
      const items = await apiRequest<ServiceRequestItem[]>('/service-requests', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMyRequests(items)
    } catch (error) {
      setMyRequestsError(error instanceof Error ? error.message : 'Could not load your requests.')
    } finally {
      setMyRequestsLoading(false)
    }
  }

  async function showProviderRequests() {
    setProviderRequestsOpen(true)
    setProviderRequestsLoading(true)
    setProviderRequestsError('')
    try {
      const items = await apiRequest<ProviderServiceRequest[]>('/providers/service-requests', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setProviderRequests(items)
    } catch (error) {
      setProviderRequestsError(error instanceof Error ? error.message : 'Could not load open requests.')
    } finally {
      setProviderRequestsLoading(false)
    }
  }

  async function acceptProviderRequest(item: ProviderServiceRequest) {
    setAcceptingRequestId(item.id)
    setProviderRequestsError('')
    try {
      await apiRequest(`/service-requests/${item.id}/bookings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agreed_price: item.service.base_price }),
      })
      setNotice(`Request accepted at ${formatUgx(item.service.base_price)}.`)
      window.setTimeout(() => setNotice(''), 5000)
      await showProviderRequests()
    } catch (error) {
      setProviderRequestsError(error instanceof Error ? error.message : 'Could not accept this request.')
    } finally {
      setAcceptingRequestId(null)
    }
  }

  function openProviderPortal() {
    if (user?.role === 'PROVIDER') {
      void showProviderRequests()
    } else if (user) {
      setNotice('Provider inbox access is available to verified provider accounts.')
    } else {
      setAuthMode('login')
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedSearch(searchTerm)
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <div className="service-strip">
        <span>Local services, made easier</span>
        <span className="strip-location"><MapPin size={13} /> Kampala, Uganda</span>
      </div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="MobiServe home">
          <span className="brand-mark"><Wrench size={19} strokeWidth={2.5} /></span>
          <span>Mobi<span>Serve</span><small>UGANDA</small></span>
        </a>
        <nav className={mobileMenuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          <a href="#services" onClick={() => setMobileMenuOpen(false)}>Find a service</a>
          <a href="#providers" onClick={() => setMobileMenuOpen(false)}>Local providers</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
        </nav>
        <div className="header-actions">
          {user ? (
            <div className="account-menu">
              <span className="account-name">Hello, {user.first_name}</span>
              {user.role !== 'PROVIDER' && <button className="icon-button" onClick={() => void showMyRequests()} aria-label="My requests" title="My requests"><ClipboardList size={17} /></button>}
              <button className="icon-button signout-button" onClick={signOut} aria-label="Sign out" title="Sign out">
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <button className="signin-button" onClick={() => setAuthMode('login')}>Sign in</button>
          )}
          <button className="provider-cta" onClick={openProviderPortal}>{user?.role === 'PROVIDER' ? 'Provider inbox' : 'Provider portal'} <ArrowRight size={15} /></button>
        </div>
        <button className="icon-button menu-button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle navigation">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <img
            className="hero-photo"
            src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=2200&q=85"
            alt="Local technician working on a home repair"
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <div className="eyebrow"><span className="live-dot" /> HELP THAT FEELS CLOSE TO HOME</div>
            <h1>Good help.<br /><em>Right around</em> your corner.</h1>
            <p>Find trusted local professionals for the jobs that keep your home and business moving.</p>
            <form className="search-form" onSubmit={submitSearch}>
              <label className="search-service">
                <Search size={19} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="What do you need help with?"
                  aria-label="Search services"
                />
              </label>
              <span className="search-divider" />
              <label className="search-location">
                <MapPin size={18} />
                <input value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Your location" />
                <ChevronDown size={15} />
              </label>
              <button className="search-submit" type="submit">Find help <ArrowRight size={16} /></button>
            </form>
            <div className="hero-note"><ShieldCheck size={16} /> Vetted professionals. Clear pricing. Local care.</div>
          </div>
          <div className="hero-caption"><span>Real people. Reliable work.</span><span>01 / KAMPALA</span></div>
        </section>

        <section className="trust-row" aria-label="Marketplace highlights">
          <div><span className="trust-icon"><BadgeCheck size={18} /></span><span><strong>Verified professionals</strong><small>Reviewed before they join</small></span></div>
          <div><span className="trust-icon"><Star size={18} /></span><span><strong>Rated by neighbours</strong><small>Real customer feedback</small></span></div>
          <div><span className="trust-icon"><Clock3 size={18} /></span><span><strong>Quick to respond</strong><small>Help when you need it</small></span></div>
          <p>Built for Kampala.<br /><b>Growing across Uganda.</b></p>
        </section>

        <section className="content-section services-section" id="services">
          <div className="section-heading">
            <div>
              <span className="section-kicker">GET STARTED</span>
              <h2>What can we help with?</h2>
              <p>Choose a service and tell us what you need.</p>
            </div>
            <span className="result-location"><MapPin size={15} /> {location || 'Your area'}</span>
          </div>
          <div className="category-tabs" role="group" aria-label="Filter services by category">
            <button className={selectedCategory === 'all' ? 'category-tab active' : 'category-tab'} onClick={() => setSelectedCategory('all')}>All services</button>
            {categories.map((category) => (
              <button
                className={selectedCategory === category.name ? 'category-tab active' : 'category-tab'}
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-state"><span className="spinner" /> Loading local services...</div>
          ) : loadError ? (
            <div className="empty-state">
              <h3>We couldn’t reach the marketplace.</h3>
              <p>{loadError}</p>
              <button className="outline-button" onClick={() => { setLoading(true); setLoadError(''); void loadMarketplace() }}>Try again</button>
            </div>
          ) : filteredServices.length ? (
            <div className="service-grid">
              {filteredServices.map((service, index) => (
                <article className="service-card" key={service.id} style={{ animationDelay: `${index * 55}ms` }}>
                  <div className={`service-art art-${index % 4}`}><Wrench size={23} strokeWidth={1.7} /><span>{service.category}</span></div>
                  <div className="service-card-body">
                    <div className="service-title-row"><h3>{service.name}</h3><ArrowRight size={17} /></div>
                    <p>{service.description}</p>
                    <div className="service-card-footer">
                      <span>From <b>{formatUgx(service.base_price)}</b></span>
                      <button className="text-action" onClick={() => openRequest(service)}>Request <ArrowRight size={14} /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state"><h3>No matching services yet.</h3><p>Try another search or choose a different category.</p></div>
          )}
        </section>

        <section className="provider-band" id="providers">
          <div className="content-section provider-inner">
            <div className="section-heading provider-heading">
              <div>
                <span className="section-kicker">PEOPLE YOU CAN COUNT ON</span>
                <h2>Meet your local pros.</h2>
                <p>Skilled, verified, and part of your community.</p>
              </div>
              <a className="text-action view-link" href="#services">Explore services <ArrowRight size={15} /></a>
            </div>
            {loading ? (
              <div className="loading-state"><span className="spinner" /> Finding local professionals...</div>
            ) : providers.length ? (
              <div className="provider-grid">
                {providers.slice(0, 3).map((provider, index) => (
                  <article className="provider-card" key={provider.id} style={{ animationDelay: `${index * 80}ms` }}>
                    <div className={`provider-avatar avatar-${index % 4}`}>{provider.business_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</div>
                    <div className="provider-info">
                      <div className="provider-name-row"><h3>{provider.business_name}</h3><BadgeCheck size={17} fill="currentColor" /></div>
                      <p>{provider.service_area || provider.location}</p>
                      <div className="provider-stats"><span><Star size={14} fill="currentColor" /> {provider.rating.toFixed(1)}</span><span>{provider.completed_jobs} jobs done</span></div>
                      <div className="provider-response"><span className="live-dot" /> Usually responds within a few hours</div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state"><h3>New pros are joining soon.</h3><p>Browse services to find help in your area.</p></div>
            )}
          </div>
        </section>

        <section className="content-section how-section" id="how-it-works">
          <div className="how-heading">
            <span className="section-kicker">STRAIGHTFORWARD FROM START TO DONE</span>
            <h2>Three steps. One less thing to worry about.</h2>
          </div>
          <div className="steps-grid">
            <article><span className="step-number">01</span><div><h3>Tell us what you need</h3><p>Pick a service, describe the job, and share your area.</p></div></article>
            <article><span className="step-number">02</span><div><h3>Meet the right pro</h3><p>A verified local provider reviews your request and confirms the price.</p></div></article>
            <article><span className="step-number">03</span><div><h3>Get it taken care of</h3><p>Coordinate the visit directly and leave a review when the work is done.</p></div></article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top"><span className="brand-mark"><Wrench size={18} /></span><span>Mobi<span>Serve</span><small>UGANDA</small></span></a>
        <p>Good work starts with the right connection.</p>
        <span>© 2026 MobiServe Uganda</span>
      </footer>

      {authMode && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAuthMode(null)}>
          <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-heading">
            <button className="dialog-close" onClick={() => { setAuthMode(null); setQueuedService(null) }} aria-label="Close sign in"><X size={19} /></button>
            <span className="dialog-icon"><Wrench size={20} /></span>
            <span className="section-kicker">WELCOME TO MOBISERVE</span>
            <h2 id="auth-heading">{authMode === 'login' ? 'Good to have you back.' : 'Let’s get you started.'}</h2>
            <p className="dialog-subtitle">{authMode === 'login' ? 'Sign in to manage your requests and connect with local pros.' : 'Create an account to request trusted local services.'}</p>
            <form className="dialog-form" onSubmit={handleAuth}>
              {authMode === 'register' && <>
                <label>First name<input name="first_name" required autoComplete="given-name" /></label>
                <label>Last name<input name="last_name" required autoComplete="family-name" /></label>
              </>}
              <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
              {authMode === 'register' && <label>Phone number <span className="optional">(optional)</span><input name="phone" type="tel" autoComplete="tel" placeholder="+256 7XX XXX XXX" /></label>}
              <label>Password<input name="password" type="password" required minLength={authMode === 'register' ? 8 : undefined} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} /></label>
              {authError && <p className="form-error" role="alert">{authError}</p>}
              <button className="primary-button dialog-submit" disabled={authBusy}>{authBusy ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button>
            </form>
            {authMode === 'login' && <p className="demo-hint">Demo customer: customer@mobiserve.ug · MobiServeDemo2026!<br />Verified provider: daniel@mobiserve.ug · MobiServeProvider2026!</p>}
            <p className="switch-auth">{authMode === 'login' ? 'New to MobiServe?' : 'Already have an account?'} <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
          </section>
        </div>
      )}

      {requestService && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setRequestService(null)}>
          <section className="dialog request-dialog" role="dialog" aria-modal="true" aria-labelledby="request-heading">
            <button className="dialog-close" onClick={() => setRequestService(null)} aria-label="Close request form"><X size={19} /></button>
            <span className="section-kicker">NEW SERVICE REQUEST</span>
            <h2 id="request-heading">Tell us a little more.</h2>
            <p className="dialog-subtitle">Requesting <strong>{requestService.name}</strong>. A verified pro can follow up with you.</p>
            <form className="dialog-form" onSubmit={handleRequest}>
              <label>What needs doing?<input name="title" required maxLength={180} defaultValue={`Help with ${requestService.name.toLowerCase()}`} /></label>
              <label>Describe the job<textarea name="description" required rows={4} placeholder="Share a few details so the provider can understand the work." /></label>
              <label>Your area<input name="location" required maxLength={200} defaultValue={location} /></label>
              <label>How urgent is it?<select name="urgency" defaultValue="normal"><option value="low">Not urgent</option><option value="normal">Within a few days</option><option value="high">As soon as possible</option><option value="emergency">Emergency</option></select></label>
              {requestError && <p className="form-error" role="alert">{requestError}</p>}
              <button className="primary-button dialog-submit" disabled={requestBusy}>{requestBusy ? 'Sending request...' : 'Send request'} <ArrowRight size={16} /></button>
              <p className="secure-note"><ShieldCheck size={14} /> Your contact details stay private until a provider accepts.</p>
            </form>
          </section>
        </div>
      )}

      {myRequestsOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setMyRequestsOpen(false)}>
          <section className="dialog requests-dialog" role="dialog" aria-modal="true" aria-labelledby="requests-heading">
            <button className="dialog-close" onClick={() => setMyRequestsOpen(false)} aria-label="Close my requests"><X size={19} /></button>
            <span className="section-kicker">YOUR MOBISERVE ACTIVITY</span>
            <h2 id="requests-heading">My service requests</h2>
            <p className="dialog-subtitle">Track the requests you have shared with local professionals.</p>
            {myRequestsLoading ? (
              <div className="loading-state request-loading"><span className="spinner" /> Loading your requests...</div>
            ) : myRequestsError ? (
              <p className="form-error" role="alert">{myRequestsError}</p>
            ) : myRequests.length ? (
              <div className="request-list">
                {myRequests.map((item) => (
                  <article className="request-item" key={item.id}>
                    <div className="request-item-heading">
                      <div><span>{item.service?.name || 'Service request'}</span><h3>{item.title}</h3></div>
                      <span className={`request-status status-${item.status}`}>{item.status === 'submitted' ? 'Finding a pro' : item.status}</span>
                    </div>
                    <p>{item.description}</p>
                    <div className="request-item-meta"><span><MapPin size={13} />{item.location}</span><span>{item.urgency} priority</span></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state request-empty"><h3>No requests yet.</h3><p>Find a service and tell local providers what you need.</p><button className="outline-button" onClick={() => { setMyRequestsOpen(false); document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }) }}>Browse services</button></div>
            )}
          </section>
        </div>
      )}

      {providerRequestsOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setProviderRequestsOpen(false)}>
          <section className="dialog requests-dialog" role="dialog" aria-modal="true" aria-labelledby="provider-requests-heading">
            <button className="dialog-close" onClick={() => setProviderRequestsOpen(false)} aria-label="Close provider inbox"><X size={19} /></button>
            <span className="section-kicker">VERIFIED PROVIDER INBOX</span>
            <h2 id="provider-requests-heading">Requests for your services</h2>
            <p className="dialog-subtitle">Review open requests that match services on your provider profile.</p>
            {providerRequestsLoading ? (
              <div className="loading-state request-loading"><span className="spinner" /> Loading matching requests...</div>
            ) : providerRequestsError ? (
              <p className="form-error" role="alert">{providerRequestsError}</p>
            ) : providerRequests.length ? (
              <div className="request-list">
                {providerRequests.map((item) => (
                  <article className="request-item" key={item.id}>
                    <div className="request-item-heading">
                      <div><span>{item.service.name} · {item.urgency} priority</span><h3>{item.title}</h3></div>
                      <span className="request-status">Open</span>
                    </div>
                    <p>{item.description}</p>
                    <div className="request-item-meta"><span><MapPin size={13} />{item.location}</span><span>Starting at {formatUgx(item.service.base_price)}</span></div>
                    <button className="primary-button provider-accept" disabled={acceptingRequestId === item.id} onClick={() => void acceptProviderRequest(item)}>{acceptingRequestId === item.id ? 'Accepting...' : 'Accept request'} <ArrowRight size={15} /></button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state request-empty"><h3>No matching requests right now.</h3><p>New requests for services on your profile will appear here.</p></div>
            )}
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status"><Check size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16} /></button></div>}
    </div>
  )
}

export default App
