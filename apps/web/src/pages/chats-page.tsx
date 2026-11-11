import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, CheckCheck, Circle, MoreHorizontal, Paperclip, Search, Send, Smile, Users } from 'lucide-react'
import { Avatar } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'

interface DemoMessage {
  id: number
  sender: string
  body: string
  time: string
  mine?: boolean
}

const demoConversations = [
  { id: 'night-market', name: 'Lanterns & Late Bites', kind: 'Event chat', last: 'Mina: I’ll be by the main entrance!', time: '2m', unread: 2, people: 12, avatar: 'Mina Park' },
  { id: 'clay-club', name: 'Sunday Clay Club', kind: 'Event chat', last: 'You: This is my first time too :)', time: '1h', unread: 0, people: 8, avatar: 'Clay Club' },
  { id: 'mina-dm', name: 'Mina Park', kind: 'Direct message', last: 'That sounds perfect, see you there!', time: 'Yesterday', unread: 0, people: 0, avatar: 'Mina Park' },
  { id: 'high-park-walk', name: 'A Slow Walk Through High Park', kind: 'Event chat', last: 'Alex: Weather looks great for Sunday', time: 'Yesterday', unread: 0, people: 21, avatar: 'Alex Rivera' },
]

const initialMessages: DemoMessage[] = [
  { id: 1, sender: 'Mina Park', body: 'Hey everyone! So happy you’re joining ✨', time: '6:42 PM' },
  { id: 2, sender: 'Alex Rivera', body: 'I’ve been meaning to check this place out for ages.', time: '6:44 PM' },
  { id: 3, sender: 'You', body: 'Same here! Any recommendations on what to try?', time: '6:48 PM', mine: true },
  { id: 4, sender: 'Mina Park', body: 'The dumplings are incredible. I’ll be by the main entrance around 6:20 if anyone wants to meet up first!', time: '6:52 PM' },
]

export function ChatsPage() {
  const [query, setQuery] = useState('')
  const conversations = demoConversations.filter((conversation) => conversation.name.toLowerCase().includes(query.toLowerCase()))

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-rose-700">Your conversations</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Chats</h1><p className="mt-2 text-sm text-stone-500">Make a plan, ask a question, say hello.</p></div>
    <Card className="overflow-hidden">
      <div className="border-b border-stone-100 p-4 sm:p-5"><label className="relative block"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><Input aria-label="Search conversations" placeholder="Search your chats…" className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} /></label></div>
      <div className="divide-y divide-stone-100">{conversations.map((conversation) => <Link to={`/chats/${conversation.id}`} key={conversation.id} className="flex items-center gap-3 px-4 py-4 transition hover:bg-rose-50/60 sm:px-5">
        <div className="relative"><Avatar name={conversation.avatar} className="size-12 text-sm" />{conversation.kind === 'Event chat' && <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-white bg-rose-600 text-white"><Users size={9} /></span>}</div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold text-stone-900">{conversation.name}</p><Badge className="hidden bg-stone-100 text-[9px] text-stone-500 sm:inline-flex">{conversation.kind}</Badge></div><p className="mt-1 truncate text-xs text-stone-500">{conversation.last}</p></div>
        <div className="flex shrink-0 flex-col items-end gap-2"><span className="text-[10px] text-stone-400">{conversation.time}</span>{conversation.unread > 0 && <span className="grid size-5 place-items-center rounded-full bg-rose-600 text-[10px] font-bold text-white">{conversation.unread}</span>}</div>
      </Link>)}</div>
      {conversations.length === 0 && <p className="p-10 text-center text-sm text-stone-500">No conversations found.</p>}
      <div className="border-t border-stone-100 bg-stone-50/70 px-5 py-3 text-center text-[11px] text-stone-400">Demo conversations · Messages are not saved and Socket.IO is not connected yet</div>
    </Card>
  </div>
}

export function ChatPage() {
  const { conversationId = 'night-market' } = useParams()
  const [messages, setMessages] = useState(initialMessages)
  const [body, setBody] = useState('')
  const conversation = demoConversations.find((item) => item.id === conversationId) ?? demoConversations[0]

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!body.trim()) return
    setMessages((current) => [...current, { id: Date.now(), sender: 'You', body: body.trim(), time: new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date()), mine: true }])
    setBody('')
  }

  return <div className="mx-auto max-w-5xl">
    <div className="mb-5 flex items-center justify-between"><Button asChild variant="ghost" size="sm" className="md:hidden"><Link to="/chats"><ArrowLeft size={15} />All chats</Link></Button><span className="hidden text-xs text-stone-400 md:block">Messages / {conversation.name}</span><Badge className="bg-amber-50 text-amber-700"><Circle size={7} fill="currentColor" className="mr-1" />Demo · not live</Badge></div>
    <Card className="grid min-h-[620px] overflow-hidden md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden border-r border-stone-100 md:block"><div className="border-b border-stone-100 p-5"><h2 className="font-bold text-stone-900">Your chats</h2><p className="mt-1 text-xs text-stone-500">Find the conversation</p></div><div className="p-2">{demoConversations.map((item) => <Link key={item.id} to={`/chats/${item.id}`} className={`flex items-center gap-3 rounded-xl p-3 ${item.id === conversation.id ? 'bg-rose-50' : 'hover:bg-stone-50'}`}><Avatar name={item.avatar} className="size-9 text-[10px]" /><div className="min-w-0"><p className="truncate text-xs font-bold text-stone-800">{item.name}</p><p className="mt-1 truncate text-[10px] text-stone-500">{item.last}</p></div></Link>)}</div></aside>
      <section className="flex min-h-[620px] flex-col">
        <header className="flex items-center justify-between border-b border-stone-100 px-4 py-3 sm:px-5"><div className="flex items-center gap-3"><Avatar name={conversation.avatar} /><div><h1 className="text-sm font-bold text-stone-900">{conversation.name}</h1><p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone-500">{conversation.kind === 'Event chat' ? <><Users size={12} />{conversation.people} people · event chat</> : 'Direct message'}</p></div></div><Button variant="ghost" size="icon" aria-label="Conversation options"><MoreHorizontal size={19} /></Button></header>
        <div className="flex-1 space-y-5 overflow-y-auto bg-[#fdfcfb] p-4 sm:p-6"><div className="flex justify-center"><span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-semibold text-stone-500">Sunday, November 15</span></div>{messages.map((message) => <div key={message.id} className={`flex gap-2.5 ${message.mine ? 'justify-end' : 'justify-start'}`}>{!message.mine && <Avatar name={message.sender} className="mt-5 size-7 text-[9px]" />}<div className={`max-w-[82%] sm:max-w-[72%] ${message.mine ? 'items-end' : 'items-start'}`}><p className={`mb-1 text-[10px] text-stone-400 ${message.mine ? 'text-right' : ''}`}>{message.sender} · {message.time}</p><div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.mine ? 'rounded-br-md bg-rose-600 text-white' : 'rounded-bl-md border border-stone-100 bg-white text-stone-700 shadow-sm'}`}>{message.body}</div>{message.mine && <p className="mt-1 flex justify-end text-[10px] text-stone-400"><CheckCheck size={13} /></p>}</div></div>)}</div>
        <form onSubmit={sendMessage} className="border-t border-stone-100 bg-white p-3 sm:p-4"><div className="flex items-center gap-2"><Button type="button" variant="ghost" size="icon" className="hidden text-stone-400 sm:inline-flex" aria-label="Attach file"><Paperclip size={17} /></Button><Input aria-label="Write a message" placeholder="Write a message…" className="h-11 bg-stone-50" value={body} onChange={(e) => setBody(e.target.value)} /><Button type="button" variant="ghost" size="icon" className="hidden text-stone-400 sm:inline-flex" aria-label="Add emoji"><Smile size={17} /></Button><Button type="submit" size="icon" aria-label="Send message" disabled={!body.trim()}><Send size={16} /></Button></div><p className="mt-2 hidden text-center text-[10px] text-stone-400 sm:block">Demo only · chat service and live delivery will be connected later</p></form>
      </section>
    </Card>
  </div>
}
