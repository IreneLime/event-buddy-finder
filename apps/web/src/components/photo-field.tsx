import { useId } from 'react'
import { FieldLabel } from './ui/field'

export function PhotoField({ label, file, onChange, disabled }: {
  label: string
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
}) {
  const id = useId()
  return <div>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <div className="flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
      <input id={id} className="peer sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled}
        aria-describedby={id + '-filename ' + id + '-hint'} onChange={(event) => {
          const selected = event.target.files?.[0] ?? null
          event.target.setCustomValidity(selected && selected.size > 5 * 1024 * 1024 ? 'Choose an image of 5 MB or smaller.' : '')
          onChange(selected)
        }} />
      <label htmlFor={id} className="flex shrink-0 cursor-pointer items-center rounded-md bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">Choose file</label>
      <span id={id + '-filename'} className="min-w-0 truncate text-sm text-stone-600" title={file?.name} aria-live="polite">{file?.name ?? 'No file chosen'}</span>
    </div>
    <p id={id + '-hint'} className="mt-1.5 text-xs text-stone-500">JPEG, PNG or WebP, up to 5 MB.</p>
  </div>
}
