import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useCompetitionStore } from '../store/competitionStore'
import type { DishWithPhotos } from '../store/competitionStore'

export function useCompetition(competitionId: string, participantId?: string) {
  const { setCompetition, setDishes, setParticipants, setVoteCounts, setLoading, setError, reset } =
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

      // Load vote counts via vote-read EF (requires participantId)
      if (participantId) {
        try {
          const { data } = await supabase.functions.invoke('vote-read', {
            body: { competitionId, participantId },
          })
          if (data?.voteCounts) {
            const map = new Map<string, number>()
            for (const { dish_id, count } of data.voteCounts as Array<{ dish_id: string; count: number }>) {
              map.set(dish_id, count)
            }
            setVoteCounts(map)
          }
        } catch {
          // Non-fatal: vote counts unavailable, default to empty Map
        }
      }

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
