import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/layout/app-shell'
import { EventStoreProvider } from './state/event-store'
import { ChatStoreProvider } from './state/chat-store'
import { ChatPage, ChatsPage } from './pages/chats-page'
import { EventDetailPage } from './pages/event-detail-page'
import { EventFormPage } from './pages/event-form-page'
import { EventsPage } from './pages/events-page'
import { LoginPage } from './pages/login-page'
import { ProfilePage } from './pages/profile-page'
import { AuthProvider, RequireAuth } from './state/auth-store'
import { ExploreCityProvider } from './state/explore-city'
import { HomePage } from './pages/home-page'
import { NotificationsPage } from './pages/notifications-page'

export default function App() {
  return <AuthProvider><EventStoreProvider><BrowserRouter><ChatStoreProvider><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ExploreCityProvider><AppShell /></ExploreCityProvider>}>
      <Route index element={<HomePage />} />
      <Route path="events" element={<EventsPage />} />
      <Route path="events/new" element={<RequireAuth><EventFormPage /></RequireAuth>} />
      <Route path="events/:eventId/edit" element={<RequireAuth><EventFormPage /></RequireAuth>} />
      <Route path="events/:eventId" element={<EventDetailPage />} />
      <Route path="chats" element={<ChatsPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="chats/:conversationId" element={<ChatPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="profile/edit" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="profile/:userId" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes></ChatStoreProvider></BrowserRouter></EventStoreProvider></AuthProvider>
}
