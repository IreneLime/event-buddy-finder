import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, Handshake, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Field } from '../components/ui/field'
import { demoCredentialsHint, demoUsers } from '../data/demo-users'
import { profileApi, ApiError } from '../lib/backend-api'
import { useAuth } from '../state/auth-store'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, register, live, getToken, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [registering, setRegistering] = useState(false)
  const [working, setWorking] = useState(false)
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/events'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setWorking(true)
    try {
      if (registering) {
        await register(email, password)
        navigate('/profile', { replace: true, state: { from: returnTo } })
        return
      }
      await signIn(email, password)
      if (live) {
        const token = await getToken()
        if (!token) throw new Error('Could not restore your session. Please try again.')
        try {
          await profileApi.mine(token)
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) {
            setError('Signed in, but we could not check your profile.')
            return
          }
          navigate('/profile', { replace: true, state: { from: returnTo } })
          return
        }
      }
      navigate(returnTo, { replace: true })
    } catch (error) {
      const code = (error as { code?: string }).code
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'An account already exists for that email. Try signing in.',
        'auth/invalid-credential': 'That email and password did not match.',
        'auth/weak-password': 'Choose a stronger password.',
        'auth/network-request-failed': 'Could not reach sign-in. Check your connection and try again.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/operation-not-allowed': 'Email and password sign-in is disabled for this Firebase project. Enable it in Firebase Authentication settings.',
        'auth/unauthorized-domain': 'This website is not authorized by Firebase. Add localhost to the project’s authorized domains.',
      }
      const authError = code?.startsWith('auth/api-key-not-valid') || code === 'auth/invalid-api-key'
        ? 'Firebase rejected the web API key. Check VITE_FIREBASE_API_KEY in .env against the Firebase project settings, then restart the app.'
        : code && messages[code]
      setError(authError || (live ? 'Could not complete sign-in or registration. Please try again.' : 'That demo email and password do not match.'))
    } finally {
      setWorking(false)
    }
  }

  function fillDemoAccount(userEmail: string) {
    setEmail(userEmail)
    setPassword('123')
    setError('')
  }

  return <div className="grid min-h-screen bg-white lg:grid-cols-2">
    <section className="relative hidden overflow-hidden bg-[#38261d] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
      <div className="hero-glow hero-glow-one" aria-hidden="true" /><div className="hero-glow hero-glow-two" aria-hidden="true" />
      <Link to="/events" className="relative z-10 flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-slate-950"><Handshake size={19} /></span><span className="font-extrabold">event<span className="text-brand-300">buddy</span></span></Link>
      <div className="relative z-10 max-w-lg"><Sparkles className="mb-5 text-brand-300" size={25} /><h1 className="text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">Your next favorite memory is out there.</h1><p className="mt-5 max-w-md text-base leading-7 text-stone-300">Find local events, meet people who are into the same things, and make the first hello a little easier.</p></div>
      <p className="relative z-10 text-xs text-stone-400">{!live && 'Frontend demo · Use a fictional test account below'}</p>
    </section>
    <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16">
      <div className="flex items-center justify-between"><Link to="/events" className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"><ArrowLeft size={14} />Browse events</Link><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 lg:hidden"><Handshake size={18} /></span></div>
      <div className="mx-auto my-auto w-full max-w-[430px] py-10">
        <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Welcome to Event Buddy Finder</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{registering ? 'Create your account' : 'Sign in to join in'}</h2><p className="mt-2 text-sm leading-6 text-stone-500">You can explore events without an account. Sign in to save your plans, chat, or create an event.</p></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email address"><div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" className="pl-10" /></div></Field>
          <Field label="Password"><div className="relative"><LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" minLength={registering ? 6 : undefined} autoComplete={registering ? 'new-password' : 'current-password'} className="pl-10" /></div></Field>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
          <Button className="w-full" size="lg" type="submit" disabled={working}>{working ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}<ArrowRight size={16} /></Button>
        </form>
        {!live && <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/50 p-4"><div className="flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-700" /><div><p className="text-xs font-bold text-stone-800">Demo test accounts</p><p className="mt-1 text-[11px] text-stone-500">{demoCredentialsHint}</p></div></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{demoUsers.map((user) => <button key={user.id} type="button" onClick={() => fillDemoAccount(user.email)} className="rounded-xl border border-white bg-white px-3 py-2 text-left shadow-sm transition hover:border-brand-300"><span className="block text-xs font-semibold text-stone-800">{user.displayName}</span><span className="mt-0.5 block truncate text-[10px] text-stone-500">{user.email}</span></button>)}</div></div>}
        {live && <button type="button" disabled={working} onClick={() => { setRegistering(!registering); setError('') }} className="mt-6 block w-full border-t border-stone-100 pt-5 text-center text-xs font-semibold text-brand-700">{registering ? 'Already registered? Sign in' : 'Need an account? Register'}</button>}
        {live && user && error && <Link to="/profile" className="mt-4 block text-center text-sm font-semibold text-brand-700">Continue to your profile</Link>}
      </div>
    </section>
  </div>
}
