// SubjectBreakdown.tsx — bar list of subjects with their accumulated time.
// Sessions tagged "Sin materia" appear at the bottom in neutral grey.
import { useSubjects } from '@/features/subjects/hooks/useSubjects'

interface SubjectBreakdownProps {
  /** Map<subjectId, secondsTotal>. Empty-string key means "no subject". */
  bySubject: Map<string, number>
}

function formatHM(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function SubjectBreakdown({ bySubject }: SubjectBreakdownProps) {
  const { data: subjects = [] } = useSubjects()

  // Build a list of {id, name, color, emoji, sec} entries, including a
  // synthetic "untagged" entry for sessions without a subject and any
  // unknown ids (deleted subjects whose sessions still reference them).
  const entries: Array<{
    key: string
    name: string
    color: string
    emoji?: string
    sec: number
  }> = []

  for (const [id, sec] of bySubject) {
    if (sec <= 0) continue
    if (id === '') {
      entries.push({ key: '__none__', name: 'Sin materia', color: '#888', sec })
      continue
    }
    const subject = subjects.find((s) => s.id === id)
    if (subject) {
      entries.push({
        key: subject.id,
        name: subject.name,
        color: subject.color,
        emoji: subject.emoji,
        sec,
      })
    } else {
      // Subject was deleted but sessions still reference it
      entries.push({
        key: `__deleted__${id}`,
        name: 'Materia eliminada',
        color: '#666',
        sec,
      })
    }
  }

  entries.sort((a, b) => b.sec - a.sec)

  if (entries.length === 0) {
    return (
      <p className="text-sm opacity-50 text-center py-4">
        Aún no has etiquetado ninguna sesión con materia.
      </p>
    )
  }

  const maxSec = Math.max(...entries.map((e) => e.sec))

  return (
    <div className="flex flex-col gap-3">
      {entries.map((e) => {
        const widthPct = Math.round((e.sec / maxSec) * 100)
        return (
          <div key={e.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                {e.emoji && <span className="shrink-0">{e.emoji}</span>}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: e.color }}
                  aria-hidden="true"
                />
                <span className="truncate font-medium">{e.name}</span>
              </span>
              <span className="opacity-70 tabular-nums shrink-0">{formatHM(e.sec)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-current/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${widthPct}%`, background: e.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
