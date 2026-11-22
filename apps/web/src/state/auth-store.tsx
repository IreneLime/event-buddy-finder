import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { createUserWithEmailAndPassword, onIdTokenChanged, reload, sendEmailVerification, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { demoUsers } from '../data/demo-users'
import { firebaseAuth } from '../lib/firebase'

interface Account {
  id: string
  displayName: string
  emailVerified: boolean
}

interface AuthStoreValue {
  user: Account | null
  loading: boolean
  live: boolean
  getToken: () => Promise<string | undefined>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  register: (email: string, password: string) => Promise<void>
  sendVerification: () => Promise<void>
  refreshVerification: () => Promise<boolean>
}

const AuthContext = createContext<AuthStoreValue | null>(null)
const storageKey = 'event-buddy-demo-user'

function account(user: User | null): Account | null {
  return user && { id: user.uid, displayName: user.displayName || user.email?.split('@')[0] || 'Member', emailVerified: user.emailVerified }
}

function readStoredUser(): Account | null {
  if (firebaseAuth) return null
  try {
    const user = demoUsers.find(({ id }) => id === window.localStorage.getItem(storageKey))
    return user ? { id: user.id, displayName: user.displayName, emailVerified: true } : null
  } catch {
    return null
  }
}

async function getToken() {
  return firebaseAuth?.currentUser?.getIdToken()
}

function currentFirebaseUser() {
  const user = firebaseAuth?.currentUser
  if (!user) throw new Error('Please sign in to continue.')
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(readStoredUser)
  const [loading, setLoading] = useState(Boolean(firebaseAuth))

  useEffect(() => {
    if (!firebaseAuth) return
    return onIdTokenChanged(firebaseAuth, (current) => {
      setUser(account(current))
      setLoading(false)
    })
  }, [])

  const value: AuthStoreValue = {
    user, loading, live: Boolean(firebaseAuth), getToken,
    signIn: async (email, password) => {
      if (firebaseAuth) {
        const { user } = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
        setUser(account(user))
        return
      }
      const found = demoUsers.find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.demoPassword === password)
      if (!found) throw new Error('That demo email and password do not match.')
      window.localStorage.setItem(storageKey, found.id)
      setUser({ id: found.id, displayName: found.displayName, emailVerified: true })
    },
    signOut: async () => {
      if (firebaseAuth) await firebaseSignOut(firebaseAuth)
      else window.localStorage.removeItem(storageKey)
      setUser(null)
    },
    register: async (email, password) => {
      if (!firebaseAuth) throw new Error('Firebase is not configured.')
      const { user } = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password)
      setUser(account(user))
      await sendEmailVerification(user)
    },
    sendVerification: () => sendEmailVerification(currentFirebaseUser()),
    refreshVerification: async () => {
      const current = currentFirebaseUser()
      await reload(current)
      await current.getIdToken(true)
      setUser(account(current))
      return current.emailVerified
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <p role="status" className="p-8">Checking your session…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  return children
}
