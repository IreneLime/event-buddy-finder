import { Fragment, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, CalendarDays, Check, ChevronDown, CornerDownLeft, LoaderCircle, LogOut, MessageCircle, Sparkles, Users, X } from 'lucide-react'
import type { ConversationDetail, ConversationMessage } from '@event-buddy/contracts'
import { Avatar } from '../components/ui/avatar'
import { Button } from '../components/ui/button'
import { ChatConnectionStatus, ChatWorkspace, ConversationAvatar } from '../components/chat/conversation-sidebar'
import { chatError, sendChatMessage } from '../lib/chat-api'
import { cn } from '../lib/utils'
import { useChatStore } from '../state/chat-context'
import { useEventStore } from '../state/event-store'
import { useAuth } from '../state/auth-store'
import { SignInPrompt } from '../components/sign-in-prompt'

function clockTime(value: string) {
  return new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function messageDay(value: string) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric', ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } as const : {}) }).format(date)
}

function mergeMessages(...groups: ConversationMessage[][]) {
  return [...new Map(groups.flat().map((message) => [message.id, message])).values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function ChatsPage() {
  const { user } = useAuth()
  if (!user) return <SignInPrompt title="Sign in to open your chats" description="Event group chats and direct messages are available to signed-in members." />
  return <ChatWorkspace>
    <div className="chat-canvas flex h-full flex-col items-center justify-center px-8 py-10 text-center">
      <div aria-hidden="true" className="relative mb-8 flex h-40 w-52 items-center justify-center">
        <div className="absolute size-40 rounded-full border border-brand-200/60 bg-brand-50/80" />
        <div className="absolute size-52 rounded-full border border-brand-100" />
        <div className="absolute left-1 top-6 flex -rotate-6 items-center gap-2 rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-4 shadow-sm"><span className="grid size-8 place-items-center rounded-full bg-brand-100 text-brand-700"><MessageCircle size={17} /></span><span className="flex gap-1">{[0, 1, 2].map((dot) => <span key={dot} className="size-1.5 rounded-full bg-stone-300" />)}</span></div>
        <div className="absolute bottom-4 right-1 rotate-6 rounded-2xl rounded-br-md bg-brand-700 px-6 py-4 text-white shadow-lg shadow-brand-900/10"><Sparkles size={22} strokeWidth={1.5} /></div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700">Make the first hello</p>
      <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-tight tracking-tight text-stone-900">Good plans start with<br />a little conversation.</h2>
      <p className="mt-4 max-w-xs text-sm leading-7 text-stone-500">Pick a chat to catch up, ask a question, or find your people before the event.</p>
      <Button asChild variant="outline" size="sm" className="mt-7 rounded-full bg-white"><Link to="/events">Find an event<ArrowUpRight size={14} /></Link></Button>
    </div>
  </ChatWorkspace>
}

export function ChatPage() {
  const { conversationId = '' } = useParams()
  const { user } = useAuth()
  if (!user) return <SignInPrompt title="Sign in to see this conversation" description="Messages are private to signed-in users. Sign in to continue." />
  return <ChatWorkspace activeId={conversationId}><ConversationView key={`${user.id}:${conversationId}`} id={conversationId} /></ChatWorkspace>
}

function MessageBubble({ message, mine, compact }: { message: ConversationMessage; mine: boolean; compact: boolean }) {
  return <div className={cn('flex items-end gap-2.5', compact ? 'mt-3' : 'mt-6', mine ? 'justify-end' : 'justify-start')}>
    {!mine && (compact ? <span aria-hidden="true" className="w-8 shrink-0" /> : <Link to={`/profile/${message.senderUserId}`} aria-label={`View ${message.senderDisplayName} profile`} className="mb-0.5 self-end"><Avatar name={message.senderDisplayName} className="size-8 text-[10px] ring-2 ring-white" /></Link>)}
    <article className="min-w-0 max-w-[85%] sm:max-w-[78%] lg:max-w-[72%]">
      <p className={cn('mb-1.5 flex items-center gap-1.5 px-1 text-[10px] leading-4 text-stone-400', mine && 'justify-end')}><time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString()}>{mine ? 'You' : message.senderDisplayName} · {clockTime(message.createdAt)}</time>{mine && <Check size={12} aria-label="Saved" className="text-brand-700" />}</p>
      <div className={cn('whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[13px] leading-[1.8] wrap-anywhere shadow-[0_2px_4px_-3px_rgba(68,47,29,0.3)] sm:px-5', mine ? 'rounded-br-md border border-brand-800/10 bg-brand-700 text-white' : 'rounded-bl-md border border-stone-200/80 bg-white text-stone-700')}>{message.body}</div>
    </article>
  </div>
}

function ConversationView({ id }: { id: string }) {
  const navigate = useNavigate()
  const { userId: currentChatUserId, api: chatApi, socket, connected, revision, refresh } = useChatStore()
  const { getEvent, setParticipation } = useEventStore()
  const linkedEvent = getEvent(id)
  const linkedEventId = linkedEvent?.id
  const directUserId = id.startsWith('dm-') ? id.slice(3) : undefined
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [cursor, setCursor] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [working, setWorking] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [showJump, setShowJump] = useState(false)
  const transcript = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const stickToBottom = useRef(true)
  const previousLastMessage = useRef<string | undefined>(undefined)
  const olderAnchor = useRef<{ height: number; top: number } | null>(null)
  const event = conversation?.eventId ? getEvent(conversation.eventId) : undefined

  useEffect(() => {
    let active = true
    const load = linkedEventId ? chatApi.eventConversation(id) : directUserId ? chatApi.direct(directUserId) : chatApi.GetGroupChat(id)
    load.then((data) => {
      if (!active) return
      if (linkedEventId || directUserId) { navigate(`/chats/${data.id}`, { replace: true }); return }
      setError('')
      setConversation(data)
      setMessages((current) => mergeMessages(data.messages.items, current))
      setCursor(data.messages.nextCursor)
    }).catch((error) => {
      if (active) { setError(chatError(error)); setConversation(null); setMessages([]) }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [chatApi, id, linkedEventId, directUserId, revision, reload, navigate])

  useEffect(() => {
    const receive = (message: ConversationMessage) => {
      if (message.conversationId === id) setMessages((current) => mergeMessages(current, [message]))
    }
    socket.on('message:created', receive)
    return () => { socket.off('message:created', receive) }
  }, [id, socket])

  useLayoutEffect(() => {
    const element = transcript.current
    if (!element) return
    const latest = messages.at(-1)
    const justSent = latest?.id !== previousLastMessage.current && latest?.senderUserId === currentChatUserId
    previousLastMessage.current = latest?.id
    if (olderAnchor.current) {
      element.scrollTop = olderAnchor.current.top + element.scrollHeight - olderAnchor.current.height
      olderAnchor.current = null
    } else if (stickToBottom.current || justSent) {
      element.scrollTop = element.scrollHeight
      setShowJump(false)
    }
  }, [messages, showMembers, currentChatUserId])

  useEffect(() => {
    if (!composer.current) return
    composer.current.style.height = 'auto'
    composer.current.style.height = `${Math.min(Math.max(composer.current.scrollHeight, 46), 144)}px`
  }, [body])

  async function join() {
    setWorking(true)
    try {
      await setParticipation(id, linkedEvent?.viewerParticipation === 'going' ? 'going' : 'interested')
      const data = await chatApi.eventConversation(id)
      await refresh()
      navigate(`/chats/${data.id}`, { replace: true })
    } catch (error) { setError(chatError(error)) }
    finally { setWorking(false) }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!body.trim() || sending || !conversation) return
    setSending(true)
    setError('')
    const text = body.trim()
    try {
      const message = await sendChatMessage(socket, conversation.id, text)
      setMessages((current) => mergeMessages(current, [message]))
      setBody((current) => current.trim() === text ? '' : current)
      stickToBottom.current = true
    } catch (error) { setError(chatError(error)) }
    finally { setSending(false); composer.current?.focus() }
  }

  function composerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault()
      if (connected && body.trim() && !sending) event.currentTarget.form?.requestSubmit()
    }
  }

  async function older() {
    if (!cursor || loadingOlder) return
    setLoadingOlder(true)
    try {
      const page = await chatApi.messages(id, cursor)
      if (transcript.current) olderAnchor.current = { height: transcript.current.scrollHeight, top: transcript.current.scrollTop }
      setMessages((current) => mergeMessages(page.items, current))
      setCursor(page.nextCursor)
    } catch (error) { setError(chatError(error)) }
    finally { setLoadingOlder(false) }
  }

  async function leave() {
    if (!conversation?.eventId) return
    setWorking(true)
    try {
      await setParticipation(conversation.eventId, 'withdrawn')
      await refresh()
      navigate('/chats')
    } catch (error) { setError(chatError(error)) }
    finally { setWorking(false) }
  }

  async function messageMember(userId: string) {
    setWorking(true)
    try { const direct = await chatApi.direct(userId); await refresh(); navigate(`/chats/${direct.id}`) }
    catch (error) { setError(chatError(error)) }
    finally { setWorking(false) }
  }

  if (loading) return <div role="status" className="chat-canvas grid h-full place-items-center"><div className="flex items-center gap-3 text-sm text-stone-500"><LoaderCircle size={18} className="animate-spin text-brand-700" />Loading conversation…</div></div>
  if (!conversation) return <div className="chat-canvas flex h-full flex-col items-center justify-center gap-4 px-6 py-10 text-center"><span className="grid size-16 place-items-center rounded-3xl border border-brand-200 bg-white text-brand-700"><MessageCircle size={27} strokeWidth={1.5} /></span><p role="alert" className="max-w-sm text-sm leading-7 text-stone-600">{error || 'Conversation not found.'}</p><div className="flex flex-wrap justify-center gap-2">{linkedEvent && <Button onClick={join} disabled={working}>{working ? 'Joining…' : 'Join event chat'}</Button>}<Button variant="outline" onClick={() => { setLoading(true); setReload((value) => value + 1) }}>Try again</Button></div><Link to="/chats" className="mt-2 flex items-center gap-2 text-xs font-semibold text-stone-500"><ArrowLeft size={14} />All chats</Link></div>

  return <>
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200/70 bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-center gap-3"><Link to="/chats" aria-label="All chats" className="-ml-1 grid size-8 shrink-0 place-items-center rounded-xl text-stone-500 hover:bg-stone-100 md:hidden"><ArrowLeft size={18} /></Link><ConversationAvatar conversation={conversation} className="hidden size-12 sm:grid" /><div className="min-w-0"><p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-brand-700">{conversation.kind === 'event' ? 'Event group' : 'Direct message'}</p><h1 className="truncate text-base font-bold tracking-tight text-stone-900 sm:text-lg">{conversation.title}</h1><button onClick={() => setShowMembers((value) => !value)} aria-expanded={showMembers} aria-controls="conversation-members" className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-stone-400 hover:text-brand-700"><Users size={12} />{conversation.memberCount} members<ChevronDown size={11} className={cn('transition-transform', showMembers && 'rotate-180')} /></button></div></div>
      <div className="flex shrink-0 flex-col items-end gap-2"><ChatConnectionStatus />{event && <Link to={`/events/${event.id}`} className="hidden items-center gap-1 text-[10px] font-semibold text-stone-500 hover:text-brand-700 sm:flex">View event<ArrowUpRight size={12} /></Link>}</div>
    </header>
    {showMembers && <section id="conversation-members" aria-label="Conversation members" className="chat-scroll max-h-56 shrink-0 overflow-y-auto border-b border-stone-200/70 bg-[#fffcf8] px-4 py-4 sm:px-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold text-stone-700">People in this conversation</h2><button aria-label="Close member list" onClick={() => setShowMembers(false)} className="grid size-6 place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><X size={14} /></button></div><ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{conversation.members.map((member) => <li key={member.userId} className="flex min-w-0 items-center gap-2 rounded-xl border border-stone-200/70 bg-white p-2.5"><Link to={`/profile/${member.userId}`} className="flex min-w-0 flex-1 items-center gap-2"><Avatar name={member.displayName} className="size-7 text-[9px]" /><span className="truncate text-[11px] font-semibold text-stone-700">{member.displayName}</span></Link>{member.userId === currentChatUserId ? <span className="text-[9px] text-stone-400">You</span> : <button aria-label={`Message ${member.displayName}`} title={`Message ${member.displayName}`} disabled={working} onClick={() => void messageMember(member.userId)} className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 transition hover:bg-brand-100 disabled:opacity-40"><MessageCircle size={13} /></button>}</li>)}</ul>{conversation.kind === 'event' && <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-stone-100 pt-3">{confirmLeave ? <><span className="text-[11px] text-stone-500">Leave this event chat?</span><Button size="sm" variant="outline" disabled={working} onClick={() => setConfirmLeave(false)}>Stay</Button><Button size="sm" variant="outline" className="border-rose-200 text-rose-700" disabled={working} onClick={() => void leave()}>Leave chat</Button></> : <button onClick={() => setConfirmLeave(true)} className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 hover:text-rose-700"><LogOut size={12} />Leave group chat</button>}</div>}</section>}
    {error && <div role="alert" className="flex shrink-0 items-start justify-between gap-3 border-b border-rose-100 bg-rose-50 px-5 py-3 text-xs leading-5 text-rose-700"><p>{error}</p><button aria-label="Dismiss chat error" onClick={() => setError('')} className="grid size-5 shrink-0 place-items-center rounded-md hover:bg-rose-100"><X size={13} /></button></div>}
    <div className="relative min-h-0 flex-1">
      <div ref={transcript} role="log" aria-label="Conversation messages" onScroll={(event) => { const element = event.currentTarget; const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 96; stickToBottom.current = nearBottom; setShowJump(!nearBottom) }} className="chat-canvas chat-scroll h-full overflow-y-auto overscroll-contain px-4 pb-7 pt-4 sm:px-7 lg:px-10">
        {cursor && <div className="mb-3 text-center"><Button variant="outline" size="sm" className="rounded-full bg-white text-[10px] shadow-sm" onClick={() => void older()} disabled={loadingOlder}>{loadingOlder && <LoaderCircle size={12} className="animate-spin" />}{loadingOlder ? 'Loading…' : 'Load earlier messages'}</Button></div>}
        {messages.length === 0 && <div className="flex min-h-full flex-col items-center justify-center py-10 text-center"><span className="grid size-14 place-items-center rounded-2xl border border-brand-200/80 bg-white text-brand-700 shadow-sm"><MessageCircle size={23} strokeWidth={1.5} /></span><h2 className="mt-4 text-base font-semibold text-stone-800">Every good plan starts somewhere.</h2><p className="mt-2 max-w-xs text-xs leading-6 text-stone-500">Say hello, introduce yourself, or ask a question about the event.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{['Hi everyone! 👋', 'Where should we meet?'].map((suggestion) => <button key={suggestion} onClick={() => { setBody(suggestion); composer.current?.focus() }} className="rounded-full border border-brand-200 bg-white px-3 py-2 text-[11px] font-medium text-brand-800 transition hover:bg-brand-50">{suggestion}</button>)}</div></div>}
        {messages.map((message, index) => {
          const previous = messages[index - 1]
          const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString()
          const compact = !newDay && previous.senderUserId === message.senderUserId && new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 300_000
          return <Fragment key={message.id}>{newDay && <div role="separator" aria-label={messageDay(message.createdAt)} className="mb-2 mt-4 flex items-center justify-center gap-4"><span className="h-px w-10 bg-stone-200/70" /><span className="rounded-full border border-stone-200/70 bg-white/90 px-3 py-1 text-[9px] font-semibold text-stone-400">{messageDay(message.createdAt)}</span><span className="h-px w-10 bg-stone-200/70" /></div>}<MessageBubble message={message} mine={message.senderUserId === currentChatUserId} compact={compact} /></Fragment>
        })}
      </div>
      {showJump && <button onClick={() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; stickToBottom.current = true; setShowJump(false) }} className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-[11px] font-semibold text-brand-800 shadow-md"><ArrowDown size={13} />Jump to latest</button>}
    </div>
    <form onSubmit={sendMessage} className="shrink-0 border-t border-stone-200/70 bg-white px-3 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-4">
      <div className="flex items-end gap-2 rounded-2xl border border-stone-200 bg-stone-50/60 p-2 transition focus-within:border-brand-300 focus-within:bg-white focus-within:ring-3 focus-within:ring-brand-100/70">
        <textarea ref={composer} aria-label="Write a message" placeholder={connected ? 'Write a message…' : 'Keep writing while we reconnect…'} rows={1} maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={composerKeyDown} disabled={sending} className="chat-scroll max-h-36 min-h-[46px] min-w-0 flex-1 resize-none bg-transparent px-2 py-3 text-[13px] leading-[22px] text-stone-800 outline-none placeholder:text-stone-400 disabled:opacity-60" />
        <button type="submit" aria-label="Send message" disabled={!body.trim() || sending || !connected} className="mb-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 disabled:cursor-default disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none">{sending ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowUp size={19} strokeWidth={2.2} />}</button>
      </div>
      <div className="mt-2 flex min-h-4 items-center justify-between gap-3 px-1 text-[9px] text-stone-400"><span className={cn('inline-flex items-center gap-1.5', !connected && 'text-amber-700')}>{connected ? <><CornerDownLeft size={10} /><span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span><span className="sm:hidden">A little hello goes a long way.</span></> : 'Reconnecting… You can keep writing.'}</span>{body.length > 1600 ? <span aria-label="Message character count">{body.length} / 2000</span> : event ? <Link to={`/events/${event.id}`} className="flex shrink-0 items-center gap-1 hover:text-brand-700"><CalendarDays size={10} />Event details</Link> : <span>Be kind. Make a plan.</span>}</div>
    </form>
  </>
}
