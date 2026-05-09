// SubjectPicker.tsx — horizontal chip selector for picking a subject before
// starting a session. Selecting the currently-selected chip clears it.
// Renders nothing when there are no subjects and showEmpty is false.
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useSubjects } from '../hooks/useSubjects'
import type { SubjectRecord } from '../api/subjects'

interface SubjectPickerProps {
  value: string | null
  onChange: (subjectId: string | null) => void
  /** When true, render an "Add subject" button if the user has no subjects. */
  showEmpty?: boolean
  className?: string
}

export function SubjectPicker({
  value,
  onChange,
  showEmpty = true,
  className = '',
}: SubjectPickerProps) {
  const navigate = useNavigate()
  const { data: subjects = [], isLoading } = useSubjects()

  if (isLoading) return null

  if (subjects.length === 0) {
    if (!showEmpty) return null
    return (
      <button
        type="button"
        onClick={() => navigate('/subjects')}
        className={[
          'inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/20 px-3 py-1.5 text-xs opacity-70 hover:opacity-100',
          className,
        ].join(' ')}
      >
        <Plus size={12} /> Añadir materia
      </button>
    )
  }

  return (
    <div className={['flex flex-col gap-2', className].join(' ')}>
      <span className="text-xs uppercase tracking-widest opacity-50">Materia</span>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        <Chip
          label="Sin materia"
          color="#888"
          selected={value == null}
          onSelect={() => onChange(null)}
        />
        {subjects.map((s) => (
          <Chip
            key={s.id}
            label={s.name}
            color={s.color}
            emoji={s.emoji}
            selected={value === s.id}
            onSelect={() => onChange(s.id)}
          />
        ))}
        <button
          type="button"
          onClick={() => navigate('/subjects')}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/20 px-3 py-1.5 text-xs whitespace-nowrap opacity-70"
          aria-label="Gestionar materias"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}

function Chip({
  label,
  color,
  emoji,
  selected,
  onSelect,
}: {
  label: string
  color: string
  emoji?: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all border"
      style={{
        background: selected
          ? `color-mix(in oklch, ${color} 22%, transparent)`
          : 'rgba(255,255,255,0.04)',
        borderColor: selected ? color : 'rgba(255,255,255,0.10)',
        color: selected ? color : undefined,
      }}
    >
      {emoji && <span>{emoji}</span>}
      <span>{label}</span>
    </button>
  )
}

export type { SubjectRecord }
