import { createContext } from 'react'

export type AccountRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN'
export type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  phone?: string | null
  role: AccountRole
}

export type AuthContextValue = {
  token: string | null
  user: User | null
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (values: Record<string, string>) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)