import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Bell, CalendarDays, Compass, Handshake, MapPin, Menu, MessageCircle, Plus, UserRound, X } from 'lucide-react'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { buttonVariants } from '../ui/button'
import { cn } from '../../lib/utils'
import { eventsApiUrl } from '../../lib/backend-api'
import { useAuth } from '../../state/auth-store'
import { useExploreCity } from '../../state/explore-city'

const primaryLinks = [
  { to: '/', label: 'Home', icon: Handshake },
  { to: '/events', label: 'Explore', icon: Compass },
  { to: '/chats', label: 'Chats', icon: MessageCircle },
]
const exploreCities = ['Toronto', 'Mississauga', 'Brampton', 'Markham', 'Vaughan', 'Richmond Hill', 'Oakville']

function Logo() {
  return <NavLink to="/" className="flex items-center gap-2.5" aria-label="Event Buddy Finder home">
    <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-slate-950 shadow-sm"><Handshake size={19} strokeWidth={2.2} /></span>
    <span className="text-[15px] font-extrabold tracking-tight text-stone-900">event<span className="text-brand-600">buddy</span></span>
  </NavLink>
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { pathname } = useLocation()
  const isHomePage = pathname === '/'
  const { user, live, signOut } = useAuth()
  const [signOutError, setSignOutError] = useState('')

  async function handleSignOut() {
    setSignOutError('')
    try { await signOut(); setMobileOpen(false); setNotificationsOpen(false) }
    catch { setSignOutError('Could not sign out. Please try again.') }
  }
  const { city, setCity } = useExploreCity()

  return <div className="min-h-screen bg-[#faf9f7] text-stone-900">
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-[#fffaf6]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Logo />
          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {primaryLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/' || to === '/profile'} className={({ isActive }) => cn('flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors', isActive ? 'bg-brand-100 text-brand-900 shadow-sm' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900')}>
              <Icon size={16} strokeWidth={2.1} />{label}
            </NavLink>)}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="hidden items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-bold text-stone-700 shadow-sm sm:flex"><MapPin size={17} className="text-brand-700" /><span className="hidden lg:inline">Explore</span><select aria-label="Choose city to explore" value={city} onChange={(event) => setCity(event.target.value)} className="max-w-36 cursor-pointer bg-transparent text-sm font-bold text-stone-900 outline-none">{exploreCities.map((name) => <option key={name}>{name}</option>)}</select></label>
          {user && !live && !eventsApiUrl && <div className="relative hidden sm:block">
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
              <Bell size={18} /><span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-brand-500" />
            </Button>
            {notificationsOpen && <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3"><div><p className="text-sm font-bold text-stone-900">Notifications</p><p className="mt-0.5 text-[10px] text-stone-400">A quick catch-up</p></div><span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-700">2 new</span></div>
              <div className="p-2"><NavLink onClick={() => setNotificationsOpen(false)} to="/events/clay-club" className="flex gap-3 rounded-xl p-3 hover:bg-stone-50"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><CalendarDays size={16} /></span><span><span className="block text-xs font-semibold leading-5 text-stone-800">Sunday Clay Club updated the meetup details.</span><span className="mt-1 block text-[10px] text-stone-400">Mina Park · 24 min ago</span></span></NavLink><NavLink onClick={() => setNotificationsOpen(false)} to="/events/night-market" className="flex gap-3 rounded-xl p-3 hover:bg-stone-50"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><MessageCircle size={16} /></span><span><span className="block text-xs font-semibold leading-5 text-stone-800">There are new messages in Lanterns & Late Bites.</span><span className="mt-1 block text-[10px] text-stone-400">Event chat · 1 hour ago</span></span></NavLink></div>
              <div className="border-t border-stone-100 bg-stone-50 px-4 py-2.5 text-center text-[10px] text-stone-400">Demo notifications · saved alerts will connect to the backend later</div>
            </div>}
          </div>}
          {user ? <NavLink to="/events/new" className={`${buttonVariants({ size: 'sm' })} hidden sm:inline-flex`}><Plus size={16} />Create event</NavLink> : <NavLink to="/login" className={`${buttonVariants({ size: 'sm' })} hidden sm:inline-flex`}>Sign in</NavLink>}
          {user && <NavLink to="/profile" aria-label={`${user.displayName} profile`} className="hidden rounded-full ring-offset-2 transition hover:ring-2 hover:ring-brand-200 sm:block"><Avatar name={user.displayName} /></NavLink>}
          {user && <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => void handleSignOut()}>Sign out</Button>}
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>
      {mobileOpen && <nav aria-label="Mobile navigation" className="border-t border-stone-100 px-4 py-3 md:hidden">
        <div className="mx-auto grid max-w-[1320px] gap-1">
          <label className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-stone-600"><MapPin size={17} className="text-brand-700" /><span>Explore city</span><select aria-label="Choose city to explore" value={city} onChange={(event) => setCity(event.target.value)} className="ml-auto max-w-40 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800">{exploreCities.map((name) => <option key={name}>{name}</option>)}</select></label>
          {primaryLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/' || to === '/profile'} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold', isActive ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-50')}>
            <Icon size={17} />{label}
          </NavLink>)}
          {user ? <><NavLink to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-stone-700"><UserRound size={17} />My profile</NavLink><NavLink to="/events/new" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-brand-700"><Plus size={17} />Create event</NavLink><button type="button" onClick={() => void handleSignOut()} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-stone-600">Sign out</button></> : <NavLink to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-brand-700">Sign in</NavLink>}
        </div>
      </nav>}
    </header>

    {signOutError && <p role="alert" className="mx-auto max-w-[1320px] px-4 pt-3 text-sm text-rose-700">{signOutError}</p>}
    <main className={cn('min-h-[calc(100vh-72px)] pb-24', isHomePage ? 'w-full pt-0' : 'mx-auto max-w-[1320px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-10')}>
      <Outlet />
    </main>

    <nav aria-label="Mobile tab bar" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-brand-100 bg-[#fffaf6]/95 px-2 py-2 backdrop-blur md:hidden">
      {primaryLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/' || to === '/profile'} className={({ isActive }) => cn('flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold', isActive ? 'text-brand-700' : 'text-stone-400')}>
        <Icon size={19} />{label}
      </NavLink>)}
    </nav>
  </div>
}
