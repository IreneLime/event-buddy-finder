import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { demoUsers, type DemoUser } from '../data/demo-users'

interface AuthStoreValue {
  user: DemoUser | null
  signIn: (email: string, password: string) => boolean
  signOut: () => void
}

const AuthContext = createContext<AuthStoreValue | null>(null)
const storageKey = 'event-buddy-demo-user'

function readStoredUser() {
  try {
    const userId = window.localStorage.getItem(storageKey)
    return demoUsers.find((user) => user.id === userId) ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(readStoredUser)
  const value = useMemo<AuthStoreValue>(() => ({
    user,
    signIn: (email, password) => {
      const found = demoUsers.find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.demoPassword === password)
      if (!found) return false
      setUser(found)
      window.localStorage.setItem(storageKey, found.id)
      return true
    },
    signOut: () => {
      setUser(null)
      window.localStorage.removeItem(storageKey)
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  return children
}
