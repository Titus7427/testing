import { useState, type FormEvent } from 'react'
import { ArrowRight, BadgeCheck, MapPin, ShieldCheck, Wrench } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

function dashboardPath(role: string) {
  return role === 'ADMIN' ? '/admin' : role === 'PROVIDER' ? '/provider' : '/customer'
}

export function LoginPage() {
  const { user, signIn, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [accountType, setAccountType] = useState<'customer' | 'provider'>('customer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to={dashboardPath(user.role)} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>
    try {
      if (mode === 'login') {
        await signIn(values.email, values.password)
      } else {
        await register({ ...values, account_type: accountType })
      }
      const currentUser = JSON.parse(localStorage.getItem('mobiserve-user') || '{}') as { role?: string }
      navigate(dashboardPath(currentUser.role || 'CUSTOMER'), { replace: true })
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not sign in. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-story">
        <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1500&q=85" alt="A local technician at work" />
        <div className="login-story-shade" />
        <a className="login-brand" href="/" aria-label="MobiServe home"><span><Wrench size={18} /></span>MobiServe <small>UGANDA</small></a>
        <div className="login-story-copy">
          <span className="login-eyebrow"><span /> LOCAL PEOPLE. RELIABLE WORK.</span>
          <h1>Care for your home.<br /><em>Close to home.</em></h1>
          <p>Find skilled local professionals, book with confidence, and keep every service request in one place.</p>
        </div>
        <div className="login-story-foot"><span><ShieldCheck size={15} /> Verified local professionals</span><span>KAMPALA · UGANDA</span></div>
      </section>

      <section className="login-panel">
        <div className="login-panel-head"><span>Already part of MobiServe?</span><span className="login-panel-mark"><BadgeCheck size={15} /> COMMUNITY-FIRST SERVICE</span></div>
        <div className="login-form-wrap">
          <span className="form-kicker">{mode === 'login' ? 'YOUR LOCAL SERVICE HUB' : 'JOIN YOUR LOCAL NETWORK'}</span>
          <h2>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2>
          <p className="login-intro">{mode === 'login' ? 'Sign in to find help, manage requests, or grow your local service business.' : 'One account gives you a clear place to manage your services.'}</p>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Sign in</button>
            <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>Create account</button>
          </div>

          {mode === 'register' && (
            <div className="account-type-control" role="group" aria-label="Choose account type">
              <button className={accountType === 'customer' ? 'selected' : ''} onClick={() => setAccountType('customer')} type="button">I need services</button>
              <button className={accountType === 'provider' ? 'selected' : ''} onClick={() => setAccountType('provider')} type="button">I provide services</button>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'register' && <div className="form-two-col"><label>First name<input name="first_name" required autoComplete="given-name" /></label><label>Last name<input name="last_name" required autoComplete="family-name" /></label></div>}
            <label>Email address<input type="email" name="email" required autoComplete="email" placeholder="you@example.com" /></label>
            {mode === 'register' && <label>Phone number <span className="field-note">Optional</span><input name="phone" type="tel" autoComplete="tel" placeholder="+256 7XX XXX XXX" /></label>}
            {mode === 'register' && accountType === 'provider' && <>
              <label>Business or trading name<input name="business_name" required maxLength={180} placeholder="Your service business" /></label>
              <label>Service area<input name="service_area" required maxLength={200} placeholder="Neighbourhoods or districts" /></label>
            </>}
            <label>Password<input type="password" name="password" required minLength={mode === 'register' ? 8 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} /></label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in securely' : 'Create account'} <ArrowRight size={17} /></button>
          </form>
          <p className="login-privacy"><ShieldCheck size={15} /> Your account and service details stay protected.</p>
          {mode === 'login' && <details className="demo-access"><summary>Open demo accounts</summary><p>Customer: customer@mobiserve.ug · MobiServeDemo2026!</p><p>Provider: daniel@mobiserve.ug · MobiServeProvider2026!</p><p>Admin: admin@mobiserve.ug · MobiServeAdmin2026!</p></details>}
        </div>
        <div className="login-panel-foot"><span>© 2026 MobiServe Uganda</span><span><MapPin size={13} /> Kampala, Uganda</span></div>
      </section>
    </main>
  )
}
