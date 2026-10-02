import { useEffect, useState, type ReactNode } from 'react'
import { apiRequest } from '../lib/api'
import { AuthContext, type AccountRole, type User } from './auth-context'

const tokenKey = 'mobiserve-access-token'
const userKey = 'mobiserve-user'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenKey))
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(userKey)
      return saved ? (JSON.parse(saved) as User) : null
    } catch {
      return null
    }
  })
  const [ready, setReady] = useState(() => !localStorage.getItem(tokenKey))

  useEffect(() => {
    if (!token) return

    let active = true
    apiRequest<{ user: Omit<User, 'role'>; role: AccountRole }>('/auth/me', {}, token)
      .then((session) => {
        if (!active) return
        const nextUser = { ...session.user, role: session.role }
        setUser(nextUser)
        localStorage.setItem(userKey, JSON.stringify(nextUser))
      })
      .catch(() => {
        if (!active) return
        localStorage.removeItem(tokenKey)
        localStorage.removeItem(userKey)
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (active) setReady(true)
      })

    return () => { active = false }
  }, [token])

  async function completeSignIn(nextToken: string) {
    const session = await apiRequest<{ user: Omit<User, 'role'>; role: AccountRole }>(
      '/auth/me',
      {},
      nextToken,
    )
    const nextUser = { ...session.user, role: session.role }
    localStorage.setItem(tokenKey, nextToken)
    localStorage.setItem(userKey, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
    setReady(true)
  }

  async function signIn(email: string, password: string) {
    const response = await apiRequest<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    await completeSignIn(response.token)
  }

  async function register(values: Record<string, string>) {
    const response = await apiRequest<{ token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(values),
    })
    await completeSignIn(response.token)
  }

  function signOut() {
    localStorage.removeItem(tokenKey)
    localStorage.removeItem(userKey)
    setToken(null)
    setUser(null)
    setReady(true)
  }

  return (
    <AuthContext.Provider value={{ token, user, ready, signIn, register, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
