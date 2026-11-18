import { useEffect, useState, type ReactNode } from 'react'
import { imageApi, imagePath } from '../lib/backend-api'

function SignedImage({ path, className, fallback, revision }: { path: string; className?: string; fallback?: ReactNode; revision: number }) {
  const [url, setUrl] = useState<string>()
  const [retried, setRetried] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void imageApi.get(path, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setUrl(data.imageUrl) },
      () => { if (!controller.signal.aborted) setUrl(undefined) },
    )
    return () => controller.abort()
  }, [path, retried, revision])

  if (!url) return fallback
  return <img className={className} src={url} alt="" loading="lazy" onError={() => {
    setUrl(undefined)
    if (!retried) setRetried(true)
  }} />
}

export function ApiImage({ kind, id, className, fallback, revision = 0 }: {
  kind: 'profile' | 'event'
  id?: string
  className?: string
  fallback?: ReactNode
  revision?: number
}) {
  if (!id) return fallback
  const path = imagePath(kind, id)
  return <SignedImage key={`${path}:${revision}`} path={path} className={className} fallback={fallback} revision={revision} />
}
