// usePlans.ts — TanStack Query hooks for study_plans.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPlan,
  deletePlan,
  listPastPlans,
  listPlans,
  updatePlan,
  type PlanInput,
  type PlanStatus,
} from '../api/plans'

const PLANS_KEYS = {
  all: ['plans'] as const,
  upcoming: ['plans', 'upcoming'] as const,
  past: ['plans', 'past'] as const,
}

export function usePlans() {
  return useQuery({
    queryKey: PLANS_KEYS.upcoming,
    queryFn: () => listPlans(),
    staleTime: 30_000,
  })
}

export function usePastPlans() {
  return useQuery({
    queryKey: PLANS_KEYS.past,
    queryFn: () => listPastPlans(),
    staleTime: 60_000,
  })
}

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PlanInput) => createPlan(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEYS.all }),
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      patch: Partial<PlanInput> & { status?: PlanStatus; linkedSessionId?: string }
    }) => updatePlan(args.id, args.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEYS.all }),
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEYS.all }),
  })
}
