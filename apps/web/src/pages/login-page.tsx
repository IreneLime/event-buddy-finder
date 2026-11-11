import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, Heart, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Field } from '../components/ui/field'

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const navigate = useNavigate()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate('/events')
  }

  return <div className="grid min-h-screen bg-white lg:grid-cols-2">
    <section className="relative hidden overflow-hidden bg-[#2c3025] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
      <div className="hero-glow hero-glow-one" aria-hidden="true" /><div className="hero-glow hero-glow-two" aria-hidden="true" />
      <Link to="/events" className="relative z-10 flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-rose-600"><Heart size={18} fill="currentColor" /></span><span className="font-extrabold">event<span className="text-rose-300">buddy</span></span></Link>
      <div className="relative z-10 max-w-lg"><Sparkles className="mb-5 text-rose-300" size={25} /><h1 className="text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">Your next favorite memory is out there.</h1><p className="mt-5 max-w-md text-base leading-7 text-stone-300">Find local events, meet people who are into the same things, and make the first hello a little easier.</p><div className="mt-8 flex items-center gap-3"><div className="flex -space-x-2"><span className="grid size-9 place-items-center rounded-full border-2 border-[#2c3025] bg-rose-200 text-xs font-bold text-rose-800">M</span><span className="grid size-9 place-items-center rounded-full border-2 border-[#2c3025] bg-amber-200 text-xs font-bold text-amber-800">A</span><span className="grid size-9 place-items-center rounded-full border-2 border-[#2c3025] bg-sky-200 text-xs font-bold text-sky-800">N</span></div><span className="text-xs text-stone-300">Good plans start with good people.</span></div></div>
      <p className="relative z-10 text-xs text-stone-400">A course project prototype · Greater Toronto Area</p>
    </section>
    <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16">
      <div className="flex items-center justify-between"><Link to="/events" className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"><ArrowLeft size={14} />Browse events</Link><span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-700 lg:hidden"><Heart size={17} fill="currentColor" /></span></div>
      <div className="mx-auto my-auto w-full max-w-[410px] py-10">
        <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.15em] text-rose-700">Welcome to Event Buddy Finder</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{mode === 'login' ? 'Good to see you again' : 'Make room for new plans'}</h2><p className="mt-2 text-sm text-stone-500">{mode === 'login' ? 'Sign in to pick up where you left off.' : 'Create an account and find your people.'}</p></div>
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1"><button onClick={() => setMode('login')} className={`rounded-lg py-2.5 text-sm font-semibold ${mode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>Sign in</button><button onClick={() => setMode('register')} className={`rounded-lg py-2.5 text-sm font-semibold ${mode === 'register' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>Create account</button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && <Field label="Your name"><Input required placeholder="How should we call you?" autoComplete="name" /></Field>}
          <Field label="Email address"><div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input required type="email" placeholder="you@example.com" autoComplete="email" className="pl-10" /></div></Field>
          <Field label="Password"><Input required type="password" minLength={8} placeholder="At least 8 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
          {mode === 'register' && <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-800"><ShieldCheck size={15} className="mt-0.5 shrink-0" />We’ll ask you to verify your email before you create a profile or post an event.</p>}
          {mode === 'login' && <button type="button" className="block text-xs font-semibold text-rose-700 hover:text-rose-800">Forgot password?</button>}
          <Button className="w-full" size="lg" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={16} /></Button>
        </form>
        <p className="mt-5 text-center text-[11px] leading-5 text-stone-400">Prototype screen only. Firebase Authentication will be connected later.</p>
        <div className="mt-8 border-t border-stone-100 pt-5 text-center text-xs text-stone-500"><button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-semibold text-rose-700">{mode === 'login' ? 'New around here? Create an account' : 'Already have an account? Sign in'}</button></div>
      </div>
      <p className="text-center text-[10px] text-stone-400">By continuing, you agree to the community guidelines.</p>
    </section>
  </div>
}
