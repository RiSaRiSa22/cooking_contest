import { create } from 'zustand'
import type { Database, DishPublic } from '../types/database.types'

type Competition = Database['public']['Tables']['competitions']['Row']
type Photo = Database['public']['Tables']['photos']['Row']

// DishPublic has nullable fields (it's a view) — we filter out rows with null id after fetch
export type DishPublicWithPhotos = DishPublic & { photos: Photo[] }

export interface VoteCount {
  dish_id: string
  count: number
}

interface VoterStore {
  competition: Competition | null
  dishes: DishPublicWithPhotos[]
  myVotedDishId: string | null
  myDishId: string | null
  voteCounts: Map<string, number>
  isLoading: boolean
  error: string | null

  setCompetition: (c: Competition) => void
  setDishes: (dishes: DishPublicWithPhotos[]) => void
  setMyVotedDishId: (id: string | null) => void
  setMyDishId: (id: string | null) => void
  setVoteCounts: (counts: VoteCount[]) => void
  updatePhase: (phase: string) => void
  setLoading: (b: boolean) => void
  setError: (e: string | null) => void
  reset: () => void
}

const initialState = {
  competition: null,
  dishes: [],
  myVotedDishId: null,
  myDishId: null,
  voteCounts: new Map<string, number>(),
  isLoading: false,
  error: null,
}

export const useVoterStore = create<VoterStore>()((set) => ({
  ...initialState,

  setCompetition: (competition) => set({ competition }),
  setDishes: (dishes) => set({ dishes }),
  setMyVotedDishId: (myVotedDishId) => set({ myVotedDishId }),
  setMyDishId: (myDishId) => set({ myDishId }),

  setVoteCounts: (counts) => {
    const map = new Map<string, number>()
    for (const { dish_id, count } of counts) {
      map.set(dish_id, count)
    }
    set({ voteCounts: map })
  },

  updatePhase: (phase) =>
    set((s) => ({
      competition: s.competition ? { ...s.competition, phase } : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // CRITICAL: reset to initial state on unmount to prevent stale data flash
  reset: () => set({ ...initialState, voteCounts: new Map() }),
}))
