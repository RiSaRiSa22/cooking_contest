import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useCompetitionStore } from '../store/competitionStore'
import type { DishWithPhotos } from '../store/competitionStore'

export function useCompetition(competitionId: string) {
  const { setCompetition, setDishes, setParticipants, setLoading, setError, reset } =
    useCompetitionStore()

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function load() {
      setLoading(true)
      setError(null)

      // Admin reads from `dishes` table directly (not dishes_public view)
      // to see chef_name and participant_id in all phases.
      // The anon_read_dishes RLS policy allows this.
      const [compRes, dishesRes, participantsRes] = await Promise.all([
        supabase.from('competitions').select('*').eq('id', competitionId).single(),
        supabase
          .from('dishes')
          .select('*, photos(*)')
          .eq('competition_id', competitionId),
        supabase.from('participants').select('*').eq('competition_id', competitionId),
      ])

      if (compRes.error) {
        setError(compRes.error.message)
        setLoading(false)
        return
      }

      setCompetition(compRes.data)
      setDishes((dishesRes.data ?? []) as DishWithPhotos[])
      setParticipants(participantsRes.data ?? [])
      setLoading(false)
    }

    load()

    // Realtime: subscribe to phase changes on this competition
    channel = supabase
      .channel(`competition-${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'competitions',
          filter: `id=eq.${competitionId}`,
        },
        (payload) => {
          useCompetitionStore
            .getState()
            .updatePhase((payload.new as { phase: string }).phase)
        }
      )
      .subscribe()

    return () => {
      // Remove Realtime channel and reset store on unmount
      // to prevent stale data flash when navigating between competitions
      if (channel) supabase.removeChannel(channel)
      reset()
    }
  }, [competitionId]) // eslint-disable-line react-hooks/exhaustive-deps
}
