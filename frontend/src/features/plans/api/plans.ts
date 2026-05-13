// plans.ts — study_plans feature API layer.
// Plans are private (owner-only rules) — every call is implicitly scoped to
// the authenticated user.
import pb from '@/shared/pb'

export type PlanStatus = 'upcoming' | 'done'

export interface PlanRecord {
  id: string
  subjectId: string | null
  plannedAt: string // ISO date
  durationMin: number
  notes: string
  status: PlanStatus
  linkedSessionId: string | null
}

export interface PlanInput {
  subjectId?: string | null
  plannedAt: string // ISO date
  durationMin: number
  notes?: string
}

function mapRecord(r: Record<string, unknown>): PlanRecord {
  return {
    id: r.id as string,
    subjectId: (r.subject as string | undefined) || null,
    plannedAt: r.plannedAt as string,
    durationMin: (r.durationMin as number) ?? 0,
    notes: (r.notes as string | undefined) ?? '',
    status: (r.status as PlanStatus) ?? 'upcoming',
    linkedSessionId: (r.linkedSessionId as string | undefined) || null,
  }
}

/**
 * listPlans — fetch plans within a date window, oldest first so the UI can
 * group naturally by day. Defaults: today (00:00) → +14 days.
 */
export async function listPlans(fromIso?: string, toIso?: string): Promise<PlanRecord[]> {
  const now = new Date()
  const start = fromIso ?? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end = toIso ?? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

  // PB filter wants the space separator for datetime values.
  const startPb = start.replace('T', ' ').substring(0, 19)
  const endPb = end.replace('T', ' ').substring(0, 19)

  const result = await pb.collection('study_plans').getList(1, 200, {
    filter: `plannedAt >= "${startPb}" && plannedAt <= "${endPb}"`,
    sort: 'plannedAt',
    requestKey: 'plans-list',
  })
  return result.items.map((item) => mapRecord(item as unknown as Record<string, unknown>))
}

/** Past plans the user might want to review (e.g. last 14 days). */
export async function listPastPlans(days = 14): Promise<PlanRecord[]> {
  const now = new Date()
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const startPb = start.toISOString().replace('T', ' ').substring(0, 19)
  const nowPb = now.toISOString().replace('T', ' ').substring(0, 19)

  const result = await pb.collection('study_plans').getList(1, 200, {
    filter: `plannedAt >= "${startPb}" && plannedAt < "${nowPb}"`,
    sort: '-plannedAt',
    requestKey: 'plans-past',
  })
  return result.items.map((item) => mapRecord(item as unknown as Record<string, unknown>))
}

export async function createPlan(input: PlanInput): Promise<PlanRecord> {
  const user = pb.authStore.model
  if (!user?.id) throw new Error('Not authenticated')

  const record = await pb.collection('study_plans').create({
    user: user.id,
    subject: input.subjectId || null,
    plannedAt: input.plannedAt,
    durationMin: input.durationMin,
    notes: (input.notes ?? '').slice(0, 200),
    status: 'upcoming',
    notified: false,
  })
  return mapRecord(record as unknown as Record<string, unknown>)
}

export async function updatePlan(
  id: string,
  patch: Partial<PlanInput> & { status?: PlanStatus; linkedSessionId?: string }
): Promise<PlanRecord> {
  const payload: Record<string, unknown> = {}
  if (patch.subjectId !== undefined) payload.subject = patch.subjectId || null
  if (patch.plannedAt !== undefined) payload.plannedAt = patch.plannedAt
  if (patch.durationMin !== undefined) payload.durationMin = patch.durationMin
  if (patch.notes !== undefined) payload.notes = (patch.notes ?? '').slice(0, 200)
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.linkedSessionId !== undefined) payload.linkedSessionId = patch.linkedSessionId
  const record = await pb.collection('study_plans').update(id, payload)
  return mapRecord(record as unknown as Record<string, unknown>)
}

export async function deletePlan(id: string): Promise<void> {
  await pb.collection('study_plans').delete(id)
}

/**
 * stampLinkedSession — record that a session was started from this plan.
 * The on-session-end hook will flip status → done when that session ends.
 */
export async function stampLinkedSession(planId: string, sessionId: string): Promise<void> {
  await pb.collection('study_plans').update(planId, { linkedSessionId: sessionId })
}
