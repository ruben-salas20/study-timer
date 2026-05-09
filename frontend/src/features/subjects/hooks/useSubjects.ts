// useSubjects.ts — TanStack Query hooks for the subjects feature.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSubject,
  deleteSubject,
  listMySubjects,
  updateSubject,
  type SubjectInput,
} from '../api/subjects'

const SUBJECTS_QUERY_KEY = ['subjects', 'list'] as const

export function useSubjects() {
  return useQuery({
    queryKey: SUBJECTS_QUERY_KEY,
    queryFn: listMySubjects,
    staleTime: 60_000,
  })
}

export function useCreateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SubjectInput) => createSubject(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY }),
  })
}

export function useUpdateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SubjectInput }) =>
      updateSubject(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY }),
  })
}

export function useDeleteSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY }),
  })
}
