// achievements.ts — API layer for achievements_unlocked.
import pb from '@/shared/pb'

export interface UnlockedAchievement {
  id: string
  key: string
  unlockedAt: string
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
