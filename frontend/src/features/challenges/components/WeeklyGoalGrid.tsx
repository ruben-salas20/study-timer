// WeeklyGoalGrid.tsx — Per-participant goal achievement grid for weekly_goal challenges
import { computeWeeklyGoalState } from '../lib/aggregators'
import type { Participant, Challenge } from '../lib/aggregators'
import { CheckCircle, Circle } from 'lucide-react'

interface WeeklyGoalGridProps {
  challenge: Challenge
  participants: Participant[]
  getUserName: (userId: string) => string
  myUserId: string
}

export function WeeklyGoalGrid({ challenge, participants, getUserName, myUserId }: WeeklyGoalGridProps) {
  const states = computeWeeklyGoalState(challenge, participants)

  return (
    <div className="flex flex-col gap-3">
      {states.map((state) => {
        const isMe = state.userId === myUserId
        return (
          <div key={state.userId} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className={isMe ? 'font-semibold text-(--color-primary)' : 'opacity-70'}>
                {getUserName(state.userId)} {isMe ? '(tú)' : ''}
              </span>
              <span className="flex items-center gap-1">
                {state.achieved
                  ? <CheckCircle size={14} className="text-green-400" />
                  : <Circle size={14} className="opacity-30" />}
                <span className="opacity-50">{state.progressPct}%</span>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-(--color-primary) transition-all"
                style={{ width: `${state.progressPct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
