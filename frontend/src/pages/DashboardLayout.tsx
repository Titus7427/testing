import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react'
import type { AccountRole } from '../auth/auth-context'
import { useAuth } from '../auth/useAuth'
import { apiRequest } from '../lib/api'

type NotificationItem = {
  id: number
  title: string
  message: string
  is_read: boolean
  created_at: string
  booking_id: number | null
}

const navByRole: Record<AccountRole, { label: string; to: string; icon: typeof LayoutDashboard }[]> = {
  CUSTOMER: [
    { label: 'Overview', to: '/customer', icon: LayoutDashboard },
    { label: 'Find a provider', to: '/customer/providers', icon: MapPinned },
    { label: 'My requests', to: '/customer/requests', icon: ClipboardList },
  ],
  PROVIDER: [
    { label: 'Work dashboard', to: '/provider', icon: LayoutDashboard },
    { label: 'Open requests', to: '/provider/requests', icon: ClipboardList },
    { label: 'My profile', to: '/provider/profile', icon: BriefcaseBusiness },
  ],
  ADMIN: [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard },
    { label: 'Provider review', to: '/admin/providers', icon: ShieldCheck },
    { label: 'Activity', to: '/admin/activity', icon: Activity },
  ],
}

const roleLabels: Record<AccountRole, string> = {
  CUSTOMER: 'Customer space',
  PROVIDER: 'Provider workspace',
  ADMIN: 'Administration',
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function DashboardLayout({ role }: { role: AccountRole }) {
  const { user, token, signOut } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    const activeToken = token
    let active = true
    async function refreshNotifications() {
      try {
        const result = await apiRequest<NotificationItem[]>('/notifications', {}, activeToken)
        if (active) setNotifications(result)
      } catch {
        if (active) setNotifications([])
      }
    }
    void refreshNotifications()
    const interval = window.setInterval(() => void refreshNotifications(), 30000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [token])

  async function markRead(notification: NotificationItem) {
    if (notification.is_read || !token) return
    try {
      await apiRequest(`/notifications/${notification.id}/read`, { method: 'PATCH' }, token)
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item))
    } catch {
      return
    }
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length

  return (
    <div className="dashboard-shell">
      <aside className={mobileOpen ? 'dashboard-sidebar mobile-open' : 'dashboard-sidebar'}>
        <NavLink className="dashboard-brand" to="/">
          <span className="dashboard-brand-mark"><Wrench size={18} /></span>
          <span>MobiServe<small>UGANDA</small></span>
        </NavLink>
        <div className="workspace-label">{roleLabels[role]}</div>
        <nav className="dashboard-nav" aria-label={`${roleLabels[role]} navigation`}>
          {navByRole[role].map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === `/${role.toLowerCase()}`} onClick={() => setMobileOpen(false)}>
              <Icon size={17} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-location"><span><MapPinned size={16} /></span><div><strong>Kampala, Uganda</strong><small>Local marketplace</small></div></div>
          <button className="sidebar-signout" onClick={signOut}><LogOut size={16} /> Sign out</button>
          <span className="sidebar-version">MOBISERVE · 2026</span>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <div className="dashboard-main">
        <header className="dashboard-header">
          <button className="dashboard-menu-toggle" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation">
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div className="dashboard-breadcrumb"><span>MobiServe</span><ChevronDown size={14} /><strong>{roleLabels[role]}</strong></div>
          <div className="dashboard-header-actions">
            <div className="notification-wrap">
              <button className={notificationOpen ? 'notification-bell is-open' : 'notification-bell'} onClick={() => setNotificationOpen((value) => !value)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
                <Bell size={18} />{unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {notificationOpen && <>
                <button className="popover-dismiss" aria-label="Close notifications" onClick={() => setNotificationOpen(false)} />
                <section className="notification-popover" aria-label="Notifications">
                  <div className="notification-popover-head"><div><strong>Notifications</strong><small>{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</small></div><Bell size={16} /></div>
                  {notifications.length ? <div className="notification-items">
                    {notifications.slice(0, 8).map((item) => (
                      <button className={item.is_read ? 'notification-item' : 'notification-item unread'} key={item.id} onClick={() => void markRead(item)}>
                        <span className="notification-dot" /><span className="notification-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{relativeTime(item.created_at)}</small></span>
                      </button>
                    ))}
                  </div> : <p className="notification-empty">Updates about your requests will appear here.</p>}
                </section>
              </>}
            </div>
            <span className="header-user-avatar">{user?.first_name.slice(0, 1)}{user?.last_name.slice(0, 1)}</span>
            <div className="header-user-copy"><strong>{user?.first_name} {user?.last_name}</strong><small>{role.toLowerCase()}</small></div>
          </div>
        </header>
        <main className="dashboard-content"><Outlet /></main>
        <footer className="dashboard-footer"><span>MobiServe Uganda</span><span>Local service marketplace · Kampala</span></footer>
      </div>
    </div>
  )
}
