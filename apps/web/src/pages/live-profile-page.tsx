import { useCallback, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Edit3 } from 'lucide-react'
import type { AgeRange, CurrentUserProfile, UserProfile } from '@event-buddy/contracts'
import { ApiImage } from '../components/api-image'
import { EventCard } from '../components/event-card'
import { PhotoField } from '../components/photo-field'
import { SignInPrompt } from '../components/sign-in-prompt'
import { Avatar } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { ApiError, errorMessage, eventApi, eventsApiUrl, imageApi, profileApi } from '../lib/backend-api'
import { useApiResource } from '../lib/use-api-resource'
import { useAuth } from '../state/auth-store'

const ageRanges: Record<AgeRange, string> = { under_18: 'Under 18', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_plus': '45+' }

export function LiveProfilePage() {
  const { userId } = useParams()
  const { user, loading } = useAuth()
  const isPrivate = userId === undefined
  if (isPrivate && loading) return <p role="status" className="p-8">Checking your session…</p>
  if (isPrivate && !user) return <SignInPrompt title="Sign in to view your profile" description="Sign in to create or edit your profile." />
  return <ProfileView key={isPrivate ? `own:${user?.id}` : `public:${userId}`} id={userId ?? user!.id} isPrivate={isPrivate} />
}

function ProfileView({ id, isPrivate }: { id: string; isPrivate: boolean }) {
  const { getToken, user } = useAuth()
  const location = useLocation()
  const [saved, setSaved] = useState<CurrentUserProfile>()
  const [retryPhoto, setRetryPhoto] = useState(false)
  const load = useCallback(async (signal: AbortSignal) => {
    if (!isPrivate) return profileApi.get(id, signal)
    const token = await getToken()
    if (!token) throw new Error('Please sign in to continue.')
    try { return await profileApi.mine(token, signal) }
    catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  }, [id, isPrivate, getToken])
  const resource = useApiResource(load)
  const profile = saved ?? resource.data
  const isEditing = isPrivate && (profile === null || retryPhoto || location.pathname.endsWith('/edit'))

  if (resource.loading && !saved) return <p role="status" className="p-8">Loading profile…</p>
  if (resource.error && !saved) return <Card className="p-8"><p role="alert">{resource.error}</p><Button className="mt-3" onClick={resource.retry}>Try again</Button></Card>
  if (isEditing && user && !user.emailVerified) return <VerifyEmail />
  if (isEditing) return <ProfileEditor profile={profile as CurrentUserProfile | null} onSaved={(updated, photoFailed) => { setSaved(updated); setRetryPhoto(photoFailed) }} onCancel={() => setRetryPhoto(false)} />
  if (!profile) return null
  return <ProfileDetails profile={profile} isPrivate={isPrivate} />
}

function VerifyEmail() {
  const { refreshVerification, sendVerification } = useAuth()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function verify(resend: boolean) {
    setBusy(true)
    try {
      if (resend) {
        await sendVerification()
        setMessage('Verification email sent.')
      } else if (!(await refreshVerification())) {
        setMessage('Your email is still unverified. Open the link in your inbox and try again.')
      }
    } catch (error) { setMessage(errorMessage(error)) }
    finally { setBusy(false) }
  }

  return <Card className="mx-auto max-w-lg space-y-4 p-8">
    <h1 className="text-2xl font-bold">Verify your email</h1>
    <p>Open the link in your verification email, then come back to finish your profile.</p>
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy} onClick={() => void verify(false)}>I’ve verified my email</Button>
      <Button variant="outline" disabled={busy} onClick={() => void verify(true)}>Resend email</Button>
    </div>
    {message && <p role="status">{message}</p>}
  </Card>
}

function ProfileEditor({ profile, onSaved, onCancel }: {
  profile: CurrentUserProfile | null
  onSaved: (profile: CurrentUserProfile, photoFailed: boolean) => void
  onCancel: () => void
}) {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [affiliation, setAffiliation] = useState(profile?.affiliation ?? '')
  const [ageRange, setAgeRange] = useState<AgeRange | ''>(profile?.ageRange ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [interests, setInterests] = useState(profile?.preferredCategories.join(', ') ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [photoSaved, setPhotoSaved] = useState(0)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    let savedProfile: CurrentUserProfile | undefined
    try {
      const token = await getToken()
      if (!token) throw new Error('Please sign in again.')
      savedProfile = await profileApi.save(token, {
        displayName: displayName.trim(),
        affiliation: affiliation.trim() || null,
        ageRange: ageRange || null,
        bio: bio.trim() || null,
        preferredCategories: interests.split(',').map((item) => item.trim()).filter(Boolean),
      }, !profile)
      if (file) {
        try {
          await imageApi.upload('/me/profile/image', file, token)
        } catch (error) {
          onSaved(savedProfile, true)
          setError(`Profile saved. Photo upload failed: ${errorMessage(error)}`)
          return
        }
      }
      onSaved(savedProfile, false)
      navigate('/profile', { replace: true })
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  async function removePhoto() {
    setBusy(true)
    setError('')
    try {
      const token = await getToken()
      if (!token) throw new Error('Please sign in again.')
      await imageApi.remove('/me/profile/image', token)
      setPhotoSaved((value) => value + 1)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  return <div className="mx-auto max-w-3xl space-y-5">
    <h1 className="text-3xl font-bold">{profile ? 'Edit your details' : 'Finish setting up your profile'}</h1>
    <form onSubmit={save}><Card className="space-y-5 p-6">
      <ApiImage kind="profile" id={profile?.id} revision={photoSaved} className="size-16 rounded-full object-cover" fallback={<Avatar name={displayName || 'Member'} className="size-16" />} />
      <PhotoField label="Profile photo" file={file} onChange={setFile} disabled={busy} />
      {profile && <Button type="button" variant="outline" disabled={busy} onClick={() => void removePhoto()}>Remove photo</Button>}
      <Field label="Display name"><Input aria-label="Display name" required maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Age range (private)"><select aria-label="Age range" className="h-10 w-full rounded-xl border border-stone-200 px-3" value={ageRange} onChange={(event) => setAgeRange(event.target.value as AgeRange | '')}>
          <option value="">Prefer not to say</option>
          {Object.entries(ageRanges).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></Field>
        <Field label="Affiliation (private)"><Input aria-label="Affiliation" maxLength={200} value={affiliation} onChange={(event) => setAffiliation(event.target.value)} /></Field>
      </div>
      <Field label="Public bio"><textarea aria-label="Public bio" className="w-full rounded-xl border border-stone-200 p-3" rows={4} maxLength={500} value={bio} onChange={(event) => setBio(event.target.value)} /></Field>
      <Field label="Public interests" hint="Separate categories with commas."><Input aria-label="Public interests" placeholder="Arts, Food, Music" value={interests} onChange={(event) => setInterests(event.target.value)} /></Field>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        {profile && <Button asChild variant="outline"><Link to="/profile" onClick={onCancel}>Cancel</Link></Button>}
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : profile ? 'Save profile' : 'Create profile'}</Button>
      </div>
    </Card></form>
  </div>
}

function ProfileDetails({ profile, isPrivate }: { profile: UserProfile; isPrivate: boolean }) {
  const { getToken, user } = useAuth()
  const [page, setPage] = useState(1)
  const loadHistory = useCallback((signal: AbortSignal) => profileApi.history(profile.id, page, signal), [profile.id, page])
  const loadHosted = useCallback(async (signal: AbortSignal) => {
    const token = await getToken()
    if (!token) throw new Error('Please sign in again.')
    return eventApi.hosted(token, signal)
  }, [getToken])
  const history = useApiResource(loadHistory)
  const hosted = useApiResource(isPrivate && eventsApiUrl ? loadHosted : null)
  const own = isPrivate ? profile as CurrentUserProfile : undefined

  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold">{own ? 'My profile' : profile.displayName}</h1>
      {own && <Button asChild variant="outline"><Link to="/profile/edit"><Edit3 size={15} />Edit profile</Link></Button>}
      {user?.id === profile.id && !own && <Button asChild variant="outline"><Link to="/profile">My profile</Link></Button>}
    </header>
    <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="space-y-3 overflow-hidden pb-5">
        <div className="profile-cover h-28" />
        <div className="space-y-3 px-5">
          <ApiImage kind="profile" id={profile.id} className="relative -mt-10 size-[68px] rounded-full border-4 border-white object-cover" fallback={<Avatar name={profile.displayName} className="relative -mt-10 size-[68px] border-4 border-white text-lg" />} />
          <h2 className="text-xl font-bold">{profile.displayName}</h2>
          {profile.bio && <p className="whitespace-pre-line text-sm text-stone-600">{profile.bio}</p>}
          <div className="flex flex-wrap gap-2">{profile.preferredCategories.map((category) => <Badge key={category}>{category}</Badge>)}</div>
          {own && <div className="space-y-1 border-t border-stone-100 pt-3 text-xs text-stone-600">
            <p className="font-semibold">Private profile details</p><p>Email: {own.email}</p>
            {own.ageRange && <p>Age range: {ageRanges[own.ageRange]}</p>}{own.affiliation && <p>Affiliation: {own.affiliation}</p>}
          </div>}
        </div>
      </Card>
      <div className="space-y-5">
        <Card className="space-y-4 p-5">
          <h2 className="font-bold">Past events{history.data ? ` (${history.data.total})` : ''}</h2>
          {history.loading && <p role="status">Loading past events…</p>}
          {history.error && <div role="alert">{history.error} <Button size="sm" variant="outline" onClick={history.retry}>Retry</Button></div>}
          {history.data && <><div className="grid gap-4 xl:grid-cols-2">{history.data.items.map((event) => <EventCard key={event.id} event={event} readOnly={!eventsApiUrl} showCount={false} />)}</div>
            {!history.data.total && <p className="text-sm text-stone-500">No past events to show.</p>}
            <div className="flex gap-2">{page > 1 && <Button variant="outline" onClick={() => setPage(page - 1)}>Previous</Button>}
              {page * history.data.limit < history.data.total && <Button variant="outline" onClick={() => setPage(page + 1)}>Next</Button>}</div></>}
        </Card>
        {isPrivate && eventsApiUrl && <Card className="space-y-4 p-5">
          <h2 className="font-bold">Events you host</h2>
          {hosted.loading && <p role="status">Loading hosted events…</p>}
          {hosted.error && <div role="alert">{hosted.error} <Button size="sm" variant="outline" onClick={hosted.retry}>Retry</Button></div>}
          {hosted.data?.length === 0 && <p className="text-sm text-stone-500">No hosted events yet.</p>}
          <div className="grid gap-4 xl:grid-cols-2">{hosted.data?.map((event) => <EventCard key={event.id} event={event} />)}</div>
        </Card>}
      </div>
    </div>
  </div>
}
