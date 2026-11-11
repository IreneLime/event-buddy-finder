import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Bell, CalendarDays, Compass, Heart, Menu, MessageCircle, Plus, UserRound, X } from 'lucide-react'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

const primaryLinks = [
  { to: '/events', label: 'Explore', icon: Compass },
  { to: '/chats', label: 'Messages', icon: MessageCircle },
  { to: '/profile', label: 'My profile', icon: UserRound },
]

function Logo() {
  return <NavLink to="/events" className="flex items-center gap-2.5" aria-label="Event Buddy Finder home">
    <span className="grid size-9 place-items-center rounded-xl bg-rose-600 text-white shadow-sm"><Heart size={18} fill="currentColor" strokeWidth={2.5} /></span>
    <span className="text-[15px] font-extrabold tracking-tight text-stone-900">event<span className="text-rose-600">buddy</span></span>
  </NavLink>
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  return <div className="min-h-screen bg-[#faf9f7] text-stone-900">
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Logo />
          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {primaryLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/profile'} className={({ isActive }) => cn('flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors', isActive ? 'bg-rose-50 text-rose-700' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900')}>
              <Icon size={16} strokeWidth={2.1} />{label}
            </NavLink>)}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden sm:block">
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
              <Bell size={18} /><span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-rose-500" />
            </Button>
            {notificationsOpen && <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3"><div><p className="text-sm font-bold text-stone-900">Notifications</p><p className="mt-0.5 text-[10px] text-stone-400">A quick catch-up</p></div><span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">2 new</span></div>
              <div className="p-2"><NavLink onClick={() => setNotificationsOpen(false)} to="/events/clay-club" className="flex gap-3 rounded-xl p-3 hover:bg-stone-50"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><CalendarDays size={16} /></span><span><span className="block text-xs font-semibold leading-5 text-stone-800">Sunday Clay Club updated the meetup details.</span><span className="mt-1 block text-[10px] text-stone-400">Mina Park · 24 min ago</span></span></NavLink><NavLink onClick={() => setNotificationsOpen(false)} to="/events/night-market" className="flex gap-3 rounded-xl p-3 hover:bg-stone-50"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700"><MessageCircle size={16} /></span><span><span className="block text-xs font-semibold leading-5 text-stone-800">There are new messages in Lanterns & Late Bites.</span><span className="mt-1 block text-[10px] text-stone-400">Event chat · 1 hour ago</span></span></NavLink></div>
              <div className="border-t border-stone-100 bg-stone-50 px-4 py-2.5 text-center text-[10px] text-stone-400">Demo notifications · saved alerts will connect to the backend later</div>
            </div>}
          </div>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <NavLink to="/events/new"><Plus size={16} />Create event</NavLink>
          </Button>
          <NavLink to="/profile" className="hidden rounded-full ring-offset-2 transition hover:ring-2 hover:ring-rose-200 sm:block"><Avatar name="Cathy Chen" /></NavLink>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>
      {mobileOpen && <nav aria-label="Mobile navigation" className="border-t border-stone-100 px-4 py-3 md:hidden">
        <div className="mx-auto grid max-w-[1320px] gap-1">
          {primaryLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/profile'} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold', isActive ? 'bg-rose-50 text-rose-700' : 'text-stone-600 hover:bg-stone-50')}>
            <Icon size={17} />{label}
          </NavLink>)}
          <NavLink to="/events/new" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rose-700"><Plus size={17} />Create event</NavLink>
        </div>
      </nav>}
    </header>

    <main className="mx-auto min-h-[calc(100vh-72px)] max-w-[1320px] px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-10">
      <Outlet />
    </main>

    <nav aria-label="Mobile tab bar" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-stone-200 bg-white/95 px-2 py-2 backdrop-blur md:hidden">
      {primaryLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/profile'} className={({ isActive }) => cn('flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold', isActive ? 'text-rose-700' : 'text-stone-400')}>
        <Icon size={19} />{label}
      </NavLink>)}
    </nav>
  </div>
}
