import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TmdbMovie } from './tmdb'

interface TmdbSearchResponse {
  results: TmdbMovie[]
}

/**
 * Searches TMDB via the `tmdb` edge function (which keeps the API key
 * server-side). Returns up to a dozen matches for the add-movie dialog.
 */
export function useTmdbSearch(): UseMutationResult<TmdbMovie[], Error, string> {
  return useMutation({
    mutationFn: async (query: string): Promise<TmdbMovie[]> => {
      const trimmed = query.trim()
      if (trimmed === '') return []
      const { data, error } = await supabase.functions.invoke<TmdbSearchResponse>('tmdb', {
        body: { action: 'search', query: trimmed },
      })
      if (error) throw error
      return data?.results ?? []
    },
  })
}
