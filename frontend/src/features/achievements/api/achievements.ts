// achievements.ts — API layer for achievements_unlocked.
import pb from '@/shared/pb'

export interface UnlockedAchievement {
  id: string
  key: string
  unlockedAt: string
}

/**
 * grantAchievement — admin-only: create an unlock row for another user.
 * The collection's createRule requires @request.auth.isAdmin = true, so a
 * non-admin call returns 403. Catches the unique-constraint error so the
 * UI can stay idempotent when re-clicking.
 */
export async function grantAchievement(userId: string, key: string): Promise<void> {
  try {
    await pb.collection('achievements_unlocked').create({
      user: userId,
      key,
      unlockedAt: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    // Already unlocked (unique idx) — treat as success.
    if (status === 400) return
    throw err
  }
}

function mapRecord(r: Record<string, unknown>): UnlockedAchievement {
  return {
    id: r.id as string,
    key: r.key as string,
    unlockedAt: r.unlockedAt as string,
  }
}

/**
 * listUnlockedFor — fetch the unlock rows for a given user (yourself or
 * anybody you can see). Sorted by unlockedAt descending so newest unlocks
 * surface first.
 */
export async function listUnlockedFor(userId: string): Promise<UnlockedAchievement[]> {
  const result = await pb.collection('achievements_unlocked').getList(1, 200, {
    filter: `user = "${userId}"`,
    sort: '-unlockedAt',
    requestKey: `achievements-${userId}`,
  })
  return result.items.map((it) => mapRecord(it as unknown as Record<string, unknown>))
}
