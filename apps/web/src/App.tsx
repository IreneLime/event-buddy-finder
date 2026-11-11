import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/layout/app-shell'
import { EventStoreProvider } from './state/event-store'
import { ChatPage, ChatsPage } from './pages/chats-page'
import { EventDetailPage } from './pages/event-detail-page'
import { EventFormPage } from './pages/event-form-page'
import { EventsPage } from './pages/events-page'
import { LoginPage } from './pages/login-page'
import { ProfilePage } from './pages/profile-page'

export default function App() {
  return <EventStoreProvider><BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<AppShell />}>
      <Route index element={<Navigate to="/events" replace />} />
      <Route path="events" element={<EventsPage />} />
      <Route path="events/new" element={<EventFormPage />} />
      <Route path="events/:eventId/edit" element={<EventFormPage />} />
      <Route path="events/:eventId" element={<EventDetailPage />} />
      <Route path="chats" element={<ChatsPage />} />
      <Route path="chats/:conversationId" element={<ChatPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="profile/edit" element={<ProfilePage />} />
      <Route path="profile/:userId" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/events" replace />} />
    </Route>
  </Routes></BrowserRouter></EventStoreProvider>
}
