import { Field } from './ui/field'
import { Input } from './ui/input'

export function PhotoField({ label, file, onChange, disabled }: {
  label: string
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
}) {
  return <Field label={label} hint="JPEG, PNG or WebP, up to 5 MB.">
    <Input aria-label={label} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => {
      const selected = event.target.files?.[0] ?? null
      event.target.setCustomValidity(selected && selected.size > 5 * 1024 * 1024 ? 'Choose an image of 5 MB or smaller.' : '')
      onChange(selected)
    }} />
    {file && <span className="text-xs text-stone-500">{file.name}</span>}
  </Field>
}
