// GroupStreakCalendar.tsx — Streak calendar for group_streak challenges
// Shows the last 14 UTC days as dots: filled if ALL participants studied that day.
//
// The streak COUNT is the server-computed `streakDays` stored on every
// challenge_participants record (see on-session-end.pb.js). The backend counts
// the longest consecutive run, inside the challenge window, of days where all
// participants logged a completed session — and it is what decides the win.
// The UI must show that same number; it does not recompute the streak here.
import type { Participant } from '../lib/aggregators'

interface GroupStreakCalendarProps {
  participants: Participant[]
  /** Session days per userId, UTC "YYYY-MM-DD" strings — used for the dot grid. */
  sessionsByUser: Record<string, string[]>
}

function getLast14Days(): string[] {
  const days: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export function GroupStreakCalendar({ participants, sessionsByUser }: GroupStreakCalendarProps) {
  // All participants share the same streakDays — the backend writes an identical
  // value to every participant record. Read the first one defensively.
  const currentStreakDays = participants[0]?.streakDays ?? 0
  const days = getLast14Days()
  const userIds = participants.map((p) => p.userId)

  function isDayComplete(day: string): boolean {
    if (userIds.length === 0) return false
    return userIds.every((uid) => (sessionsByUser[uid] ?? []).includes(day))
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayComplete = isDayComplete(todayStr)
  const participantsToday = userIds.filter((uid) =>
    (sessionsByUser[uid] ?? []).includes(todayStr)
  ).length

  return (
    <div className="flex flex-col gap-4">
      {/* Streak count */}
      <div className="text-center">
        <span className="text-4xl font-bold">{currentStreakDays}</span>
        <span className="text-sm opacity-50 ml-2">días de racha</span>
      </div>

      {/* Today status */}
      <div className={[
        'rounded-xl px-4 py-2 text-sm text-center',
        todayComplete
          ? 'bg-green-500/20 text-green-400'
          : 'bg-white/5 text-foreground opacity-60',
      ].join(' ')}>
        Hoy: {participantsToday} / {userIds.length} participantes
        {todayComplete ? ' ✓' : ''}
      </div>

      {/* Calendar dots */}
      <div className="flex gap-1 justify-center flex-wrap">
        {days.map((day) => {
          const complete = isDayComplete(day)
          const isToday = day === todayStr
          return (
            <div
              key={day}
              title={day}
              className={[
                'w-5 h-5 rounded-full border transition-colors',
                complete
                  ? 'bg-(--color-primary) border-(--color-primary)'
                  : 'bg-transparent border-white/20',
                isToday ? 'ring-2 ring-(--color-primary)/50' : '',
              ].join(' ')}
            />
          )
        })}
      </div>

      <p className="text-xs opacity-30 text-center">Últimos 14 días (UTC)</p>
    </div>
  )
}
