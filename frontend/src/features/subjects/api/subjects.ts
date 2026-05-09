// subjects.ts — Subjects feature API layer.
// Subjects are user-owned tags applied (optionally) to study sessions.
import pb from '@/shared/pb'

export interface SubjectRecord {
  id: string
  user: string
  name: string
  color: string
  emoji?: string
  created: string
  updated: string
}

export interface SubjectInput {
  name: string
  color: string
  emoji?: string
}

function currentUserId(): string {
  return pb.authStore.model?.id as string
}

function map(record: Record<string, unknown>): SubjectRecord {
  return {
    id: record.id as string,
    user: record.user as string,
    name: record.name as string,
    color: record.color as string,
    emoji: (record.emoji as string | undefined) || undefined,
    created: record.created as string,
    updated: record.updated as string,
  }
}

export async function listMySubjects(): Promise<SubjectRecord[]> {
  const result = await pb.collection('subjects').getList(1, 200, {
    sort: 'name',
    requestKey: 'subjects-list',
  })
  return (result.items as unknown as Record<string, unknown>[]).map(map)
}

export async function createSubject(input: SubjectInput): Promise<SubjectRecord> {
  const record = (await pb.collection('subjects').create({
    user: currentUserId(),
    name: input.name.trim(),
    color: input.color,
    emoji: input.emoji?.trim() || '',
  })) as Record<string, unknown>
  return map(record)
}

export async function updateSubject(id: string, input: SubjectInput): Promise<SubjectRecord> {
  const record = (await pb.collection('subjects').update(id, {
    name: input.name.trim(),
    color: input.color,
    emoji: input.emoji?.trim() || '',
  })) as Record<string, unknown>
  return map(record)
}

export async function deleteSubject(id: string): Promise<void> {
  await pb.collection('subjects').delete(id)
}
