// registry.ts — frontend catalogue of the 25 achievements.
//
// Keys must match the backend predicate keys in
// backend/pb_hooks/achievements.pb.js — that file owns the unlock conditions
// (the SOURCE OF TRUTH for triggers); this file owns the display info.
//
// If you add an entry here without updating the backend, it'll just never
// unlock. If you add a key on the backend without updating this file, the
// frontend renders it with the key as the fallback label.
import {
  Footprints,
  Repeat,
  Medal,
  Clock,
  Trophy,
  Crown,
  Flame,
  Zap,
  Sparkles,
  Eye,
  Timer,
  Mountain,
  Compass,
  BookOpen,
  UserPlus,
  Users,
  Heart,
  StickyNote,
  NotebookPen,
  CalendarCheck,
  Sunrise,
  Sprout,
  Gem,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AchievementTier = 'common' | 'rare' | 'epic' | 'legendary' | 'founder'

export interface AchievementDef {
  key: string
  name: string
  description: string
  icon: LucideIcon
  tier: AchievementTier
}

/** Visual styling per tier. Used by AchievementCard. */
export const TIER_STYLE: Record<AchievementTier, { color: string; label: string }> = {
  common:    { color: '#cd9b5a', label: 'Bronce' },
  rare:      { color: '#b9bfc4', label: 'Plata' },
  epic:      { color: '#e6c34a', label: 'Oro' },
  legendary: { color: '#9b6dff', label: 'Diamante' },
  founder:   { color: '#ff5499', label: 'Founder' },
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Volumen — sesiones
  { key: 'primer-paso',     name: 'Primer paso',     description: 'Tu primera sesión completada', icon: Footprints, tier: 'common' },
  { key: 'consistente',     name: 'Consistente',     description: '10 sesiones completadas',      icon: Repeat,     tier: 'common' },
  { key: 'veterano',        name: 'Veterano',        description: '100 sesiones completadas',     icon: Medal,      tier: 'rare' },

  // Volumen — tiempo
  { key: 'hora-cero',       name: 'Hora cero',       description: '1 hora acumulada',             icon: Clock,      tier: 'common' },
  { key: 'maratonista',     name: 'Maratonista',     description: '50 horas acumuladas',          icon: Trophy,     tier: 'rare' },
  { key: 'inmersion-total', name: 'Inmersión total', description: '250 horas acumuladas',         icon: Crown,      tier: 'epic' },

  // Racha
  { key: 'constante',       name: 'Constante',       description: 'Racha de 3 días',              icon: Flame,      tier: 'common' },
  { key: 'en-llamas',       name: 'En llamas',       description: 'Racha de 7 días',              icon: Flame,      tier: 'rare' },
  { key: 'imparable',       name: 'Imparable',       description: 'Racha de 14 días',             icon: Zap,        tier: 'rare' },
  { key: 'mistico',         name: 'Místico',         description: 'Racha de 30 días',             icon: Sparkles,   tier: 'epic' },
  { key: 'leyenda',         name: 'Leyenda',         description: 'Racha de 100 días',            icon: Crown,      tier: 'legendary' },

  // Sesiones largas
  { key: 'sin-parpadear',   name: 'Sin parpadear',   description: 'Sesión de 45 minutos o más',   icon: Eye,        tier: 'common' },
  { key: 'maraton',         name: 'Maratón',         description: 'Sesión de 2 horas o más',      icon: Timer,      tier: 'rare' },
  { key: 'ultra',           name: 'Ultra',           description: 'Sesión de 3 horas o más',      icon: Mountain,   tier: 'epic' },

  // Variedad
  { key: 'curioso',         name: 'Curioso',         description: 'Usaste los 3 modos del timer', icon: Compass,    tier: 'common' },
  { key: 'polimata',        name: 'Polímata',        description: 'Sesiones con 3 materias distintas', icon: BookOpen, tier: 'rare' },

  // Social
  { key: 'primera-amistad', name: 'Primera amistad', description: 'Tu primer amigo aceptado',     icon: UserPlus,   tier: 'common' },
  { key: 'comunidad',       name: 'Comunidad',       description: '5 amigos aceptados',           icon: Users,      tier: 'rare' },
  { key: 'popular',         name: 'Popular',         description: 'Recibiste tu primera reacción',icon: Heart,      tier: 'common' },

  // Retos
  { key: 'campeon',         name: 'Campeón',         description: 'Ganaste tu primer reto',       icon: Trophy,     tier: 'rare' },

  // Notas
  { key: 'cronista',        name: 'Cronista',        description: 'Tu primera nota escrita',      icon: StickyNote, tier: 'common' },
  { key: 'diarista',        name: 'Diarista',        description: '10 notas escritas',            icon: NotebookPen,tier: 'rare' },

  // Plan
  { key: 'cumplidor',       name: 'Cumplidor',       description: 'Completaste tu primer plan',   icon: CalendarCheck, tier: 'common' },

  // Tiempo del día
  { key: 'madrugador',      name: 'Madrugador',      description: 'Sesión antes de las 7 AM',     icon: Sunrise,    tier: 'common' },

  // Especiales
  { key: 'renacido',        name: 'Renacido',        description: 'Volviste después de 30 días sin estudiar', icon: Sprout, tier: 'rare' },

  // ── Founder — concedido manualmente por el admin ───────────────────
  // No se desbloquea por trigger. Solo el admin lo otorga desde /achievements.
  { key: 'founder',         name: 'Founder',         description: 'Recibiste este logro de la mano del fundador', icon: Gem, tier: 'founder' },
]

/** Map by key for O(1) lookup when rendering an unlocked row. */
export const ACHIEVEMENTS_BY_KEY: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.key, a])
)

/** True when an achievement can be earned by user action. The founder tier
 *  is the only handed-out one today — keep this predicate so progress
 *  counters represent "what people can actually win". */
export function isEarnable(a: AchievementDef): boolean {
  return a.tier !== 'founder'
}

/** Earnable subset of the catalogue. Used by the main grid + counters. */
export const EARNABLE_ACHIEVEMENTS: AchievementDef[] = ACHIEVEMENTS.filter(isEarnable)

/** Total count of EARNABLE achievements — drives the "N/25" labels. */
export const ACHIEVEMENTS_TOTAL = EARNABLE_ACHIEVEMENTS.length
