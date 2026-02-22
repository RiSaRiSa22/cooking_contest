import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useVoterStore, type DishPublicWithPhotos } from '../store/voterStore'
import type { Database } from '../types/database.types'

type Photo = Database['public']['Tables']['photos']['Row']

export function useVoterData(competitionId: string, participantId: string) {
  const {
    setCompetition,
    setDishes,
    setMyVotedDishId,
    setMyDishId,
    setVoteCounts,
    setLoading,
    setError,
    reset,
  } = useVoterStore()

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function load() {
      setLoading(true)
      setError(null)

      // Parallel: competition + dishes_public (with photos if possible)
      const [compRes, dishesRes] = await Promise.all([
        supabase.from('competitions').select('*').eq('id', competitionId).single(),
        supabase
          .from('dishes_public')
          .select('*, photos(*)')
          .eq('competition_id', competitionId),
      ])

      if (compRes.error) {
        setError(compRes.error.message)
        setLoading(false)
        return
      }

      setCompetition(compRes.data)

      let dishesWithPhotos: DishPublicWithPhotos[]

      if (dishesRes.error) {
        // Plan B: PostgREST may not resolve FK on view — fetch photos separately
        const { data: dishesOnly } = await supabase
          .from('dishes_public')
          .select('*')
          .eq('competition_id', competitionId)

        const validDishes = (dishesOnly ?? []).filter((d) => d.id !== null)

        if (validDishes.length > 0) {
          const dishIds = validDishes.map((d) => d.id as string)
          const { data: photos } = await supabase
            .from('photos')
            .select('*')
            .in('dish_id', dishIds)

          const photosByDish = new Map<string, Photo[]>()
          for (const photo of photos ?? []) {
            const existing = photosByDish.get(photo.dish_id) ?? []
            photosByDish.set(photo.dish_id, [...existing, photo])
          }

          dishesWithPhotos = validDishes.map((d) => ({
            ...d,
            photos: photosByDish.get(d.id as string) ?? [],
          })) as DishPublicWithPhotos[]
        } else {
          dishesWithPhotos = []
        }
      } else {
        // Plan A worked: filter out rows with null id (view can have nulls)
        dishesWithPhotos = (dishesRes.data ?? [])
          .filter((d) => d.id !== null)
          .map((d) => ({
            ...d,
            photos: (d.photos as Photo[]) ?? [],
          })) as DishPublicWithPhotos[]
      }

      setDishes(dishesWithPhotos)

      // Load vote state from vote-read EF
      const { data: voteReadData, error: voteReadError } = await supabase.functions.invoke(
        'vote-read',
        { body: { competitionId, participantId } }
      )

      if (!voteReadError && voteReadData) {
        setMyVotedDishId(voteReadData.myVotedDishId ?? null)
        setMyDishId(voteReadData.myDishId ?? null)
        setVoteCounts(voteReadData.voteCounts ?? [])
      }

      setLoading(false)
    }

    load()

    // Realtime: subscribe to phase changes on this competition
    channel = supabase
      .channel(`voter-competition-${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'competitions',
          filter: `id=eq.${competitionId}`,
        },
        (payload) => {
          useVoterStore.getState().updatePhase((payload.new as { phase: string }).phase)
        }
      )
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
      reset()
    }
  }, [competitionId, participantId]) // eslint-disable-line react-hooks/exhaustive-deps
}
