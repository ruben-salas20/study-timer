// PocketBase client singleton — shared/pb.ts
// Single instance used throughout the frontend (TanStack Query + realtime subscriptions)
// URL is injected at build time via VITE_PB_URL environment variable
// See .env.example for required variables
//
// T10: implements full singleton; pb.test.ts (T09) is GREEN against this implementation
import PocketBase from 'pocketbase'

/**
 * Base URL for the PocketBase backend.
 * Must be set in .env as VITE_PB_URL (see .env.example).
 * Falls back to localhost:8090 for local dev without a .env file.
 */
const PB_URL: string =
  (import.meta.env.VITE_PB_URL as string | undefined) ?? 'http://localhost:8090'

/**
 * Singleton PocketBase client.
 * Import this wherever you need to interact with the PocketBase API:
 *   import pb from '@/shared/pb'
 *
 * The client handles:
 * - Authentication state (pb.authStore)
 * - Realtime subscriptions (pb.collection().subscribe())
 * - CRUD operations (pb.collection().getList(), .create(), .update(), .delete())
 */
const pb = new PocketBase(PB_URL)

export default pb
