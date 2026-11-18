import { LockKeyhole } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Button } from './ui/button'

export function SignInPrompt({ title, description }: { title: string; description: string }) {
  const location = useLocation()
  const from = `${location.pathname}${location.search}`
  return <div className="mx-auto grid min-h-[48vh] max-w-xl place-items-center py-10 text-center"><div className="w-full rounded-3xl border border-brand-100 bg-white p-8 shadow-sm sm:p-12"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><LockKeyhole size={23} /></span><h1 className="mt-5 text-2xl font-bold tracking-tight text-stone-900">{title}</h1><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">{description}</p><Button asChild className="mt-6"><Link to="/login" state={{ from }}>Sign in or choose a demo account</Link></Button><p className="mt-4 text-xs text-stone-400">You can browse public event listings without signing in.</p></div></div>
}
