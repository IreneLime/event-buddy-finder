import { useCallback, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { CalendarDays, MessageCircle, Search, Users, X } from 'lucide-react'
import type { ConversationSummary } from '@event-buddy/contracts'
import { useAuth } from '../../state/auth-store'
import { useChatStore } from '../../state/chat-context'
import { profileApi } from '../../lib/backend-api'
import { useApiResource } from '../../lib/use-api-resource'
import { cn } from '../../lib/utils'
import { ApiImage } from '../api-image'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'

function conversationTime(value: string) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(date)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(date)
}

export function ConversationAvatar({ conversation, className }: { conversation: Pick<ConversationSummary, 'kind' | 'title'>; className?: string }) {
  if (conversation.kind === 'direct') return <Avatar name={conversation.title} className={cn('size-11 rounded-2xl text-sm ring-1 ring-black/5', className)} />
  return <span aria-label={conversation.title} className={cn('relative grid size-11 shrink-0 place-items-center rounded-2xl border border-brand-200/70 bg-brand-50 text-brand-700', className)}>
    <CalendarDays size={20} strokeWidth={1.7} />
    <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border-2 border-white bg-brand-700 text-white"><Users size={8} /></span>
  </span>
}

function ConversationSidebar({ activeId }: { activeId?: string }) {
  const { conversations, userId, loading, error, refresh } = useChatStore()
  const { user, live } = useAuth()
  const profileId = user?.id
  const loadProfile = useCallback((signal: AbortSignal) => {
    if (!profileId) return Promise.resolve(undefined)
    return profileApi.get(profileId, signal)
  }, [profileId])
  const profile = useApiResource(live && profileId ? loadProfile : null)
  const displayName = profile.data?.displayName ?? user?.displayName ?? 'Member'
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'event' | 'direct'>('all')
  const visible = conversations.filter((item) => (filter === 'all' || item.kind === filter) && item.title.toLowerCase().includes(query.trim().toLowerCase()))
  const Heading = activeId ? 'h2' : 'h1'

  return <aside aria-label="Your conversations" className={cn('min-h-0 flex-col border-stone-200/80 bg-white md:border-r', activeId ? 'hidden md:flex' : 'flex')}>
    <div className="shrink-0 px-5 pb-4 pt-6">
      <div className="flex items-center justify-between"><Heading className="text-2xl font-bold tracking-tight text-stone-900">Chats<span className="ml-2 align-middle text-sm font-medium text-stone-400">{conversations.length}</span></Heading><span className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-700"><MessageCircle size={17} /></span></div>
      <p className="mt-1.5 text-xs text-stone-500">A place to make a plan.</p>
      <div className="relative mt-5"><Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input aria-label="Search conversations" placeholder="Find a conversation…" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-stone-200/80 bg-stone-50 pl-9 pr-9 text-xs outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100" />{query && <button aria-label="Clear conversation search" onClick={() => setQuery('')} className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-stone-400 hover:bg-stone-200 hover:text-stone-800"><X size={13} /></button>}</div>
      <div role="group" aria-label="Filter conversations" className="mt-3 flex gap-1 rounded-xl bg-stone-100/75 p-1">
        {([{ value: 'all', label: 'All chats' }, { value: 'event', label: 'Groups' }, { value: 'direct', label: 'Direct' }] as const).map((item) => <button key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={cn('min-w-0 flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition', filter === item.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800')}>{item.label}</button>)}
      </div>
    </div>
    <div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
      <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">Recent conversations</p>
      {error && <div role="alert" className="m-2 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}<Button variant="ghost" size="sm" onClick={() => void refresh()}>Retry</Button></div>}
      {loading && <p role="status" className="px-3 py-8 text-center text-xs text-stone-400">Loading conversations…</p>}
      <nav aria-label="Conversation list" className="space-y-1">{visible.map((conversation) => {
        const active = conversation.id === activeId
        const message = conversation.lastMessage
        const time = message?.createdAt ?? conversation.createdAt
        return <Link key={conversation.id} to={`/chats/${conversation.id}`} aria-current={active ? 'page' : undefined} className={cn('group relative flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300', active ? 'bg-brand-50 ring-1 ring-inset ring-brand-200/70' : 'hover:bg-stone-50')}>
          {active && <span aria-hidden="true" className="absolute inset-y-6 left-0 w-[3px] rounded-full bg-brand-600" />}
          <ConversationAvatar conversation={conversation} />
          <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><span title={conversation.title} className={cn('truncate text-sm font-bold', active ? 'text-brand-900' : 'text-stone-800')}>{conversation.title}</span><time dateTime={time} title={new Date(time).toLocaleString()} className="shrink-0 text-[11px] font-medium text-stone-400">{conversationTime(time)}</time></span><span className="mt-1 block truncate text-xs leading-5 text-stone-500">{message ? `${message.senderUserId === userId ? 'You' : message.senderDisplayName}: ${message.body}` : 'No messages yet. Say hello!'}</span><span className="mt-1 block text-[11px] font-medium text-stone-400">{conversation.kind === 'event' ? 'Event chat' : 'Direct message'}</span></span>
        </Link>
      })}</nav>
      {!loading && !error && !visible.length && <div className="px-5 py-10 text-center"><MessageCircle size={24} strokeWidth={1.5} className="mx-auto mb-3 text-stone-300" /><p className="text-xs leading-6 text-stone-500">{query ? 'No conversations found.' : filter !== 'all' ? 'No conversations in this category yet.' : 'Join an event chat to start a conversation.'}</p>{query && <button onClick={() => setQuery('')} className="mt-2 text-xs font-semibold text-brand-700">Clear search</button>}</div>}
    </div>
    <div className="shrink-0 border-t border-stone-100 bg-stone-50/50 px-5 py-3">
      <Link to="/profile" className="flex min-w-0 items-center gap-3">
        <ApiImage kind="profile" id={live ? user?.id : undefined} className="size-12 shrink-0 rounded-full object-cover" fallback={<Avatar name={displayName} className="size-12 text-base" />} />
        <span className="min-w-0"><span className="block text-xs text-stone-500">Signed in as</span><span className="block truncate text-sm font-semibold text-stone-800">{displayName}</span></span>
      </Link>
    </div>
  </aside>
}

export function ChatWorkspace({ activeId, children }: { activeId?: string; children: ReactNode }) {
  return <div className="grid h-full min-h-0 overflow-hidden rounded-[24px] border border-stone-200/80 bg-white shadow-[0_12px_48px_-24px_rgba(68,47,29,0.22)] md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
    <ConversationSidebar activeId={activeId} />
    <div className={cn('relative min-h-0 min-w-0 flex-col', activeId ? 'flex' : 'hidden md:flex')}>{children}</div>
  </div>
}
