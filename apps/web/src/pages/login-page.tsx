import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, Handshake, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Field } from '../components/ui/field'
import { demoCredentialsHint, demoUsers } from '../data/demo-users'
import { useAuth } from '../state/auth-store'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/events'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!signIn(email, password)) {
      setError('That demo email and password do not match. Use a test account listed below.')
      return
    }
    navigate(returnTo, { replace: true })
  }

  function useDemoAccount(userEmail: string) {
    setEmail(userEmail)
    setPassword('demo1234')
    setError('')
  }

  return <div className="grid min-h-screen bg-white lg:grid-cols-2">
    <section className="relative hidden overflow-hidden bg-[#38261d] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
      <div className="hero-glow hero-glow-one" aria-hidden="true" /><div className="hero-glow hero-glow-two" aria-hidden="true" />
      <Link to="/events" className="relative z-10 flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-slate-950"><Handshake size={19} /></span><span className="font-extrabold">event<span className="text-brand-300">buddy</span></span></Link>
      <div className="relative z-10 max-w-lg"><Sparkles className="mb-5 text-brand-300" size={25} /><h1 className="text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">Your next favorite memory is out there.</h1><p className="mt-5 max-w-md text-base leading-7 text-stone-300">Find local events, meet people who are into the same things, and make the first hello a little easier.</p></div>
      <p className="relative z-10 text-xs text-stone-400">Frontend demo · Use a fictional test account below</p>
    </section>
    <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16">
      <div className="flex items-center justify-between"><Link to="/events" className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"><ArrowLeft size={14} />Browse events</Link><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 lg:hidden"><Handshake size={18} /></span></div>
      <div className="mx-auto my-auto w-full max-w-[430px] py-10">
        <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Welcome to Event Buddy Finder</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Sign in to join in</h2><p className="mt-2 text-sm leading-6 text-stone-500">You can explore events without an account. Sign in to save your plans, chat, or create an event.</p></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email address"><div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.test" autoComplete="email" className="pl-10" /></div></Field>
          <Field label="Password"><div className="relative"><LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Demo account password" autoComplete="current-password" className="pl-10" /></div></Field>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
          {notice && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">{notice}</p>}
          <Button className="w-full" size="lg" type="submit">Sign in<ArrowRight size={16} /></Button>
        </form>
        <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/50 p-4"><div className="flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-700" /><div><p className="text-xs font-bold text-stone-800">Demo test accounts</p><p className="mt-1 text-[11px] text-stone-500">{demoCredentialsHint}</p></div></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{demoUsers.map((user) => <button key={user.id} type="button" onClick={() => useDemoAccount(user.email)} className="rounded-xl border border-white bg-white px-3 py-2 text-left shadow-sm transition hover:border-brand-300"><span className="block text-xs font-semibold text-stone-800">{user.displayName}</span><span className="mt-0.5 block truncate text-[10px] text-stone-500">{user.email}</span></button>)}</div></div>
        <p className="mt-5 text-center text-[11px] leading-5 text-stone-400">This is a local prototype sign-in, not real authentication. Firebase verification and account registration will be connected with the backend.</p>
        <button type="button" onClick={() => setNotice('Registration will be enabled when Firebase Authentication is connected. You can still browse all public events.')} className="mt-6 block w-full border-t border-stone-100 pt-5 text-center text-xs font-semibold text-brand-700">Need an account? Registration comes with backend integration.</button>
      </div>
    </section>
  </div>
}
