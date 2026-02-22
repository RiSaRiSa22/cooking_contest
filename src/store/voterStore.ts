import { create } from 'zustand'
import type { Database, DishPublic } from '../types/database.types'

type Competition = Database['public']['Tables']['competitions']['Row']
type Photo = Database['public']['Tables']['photos']['Row']

// DishPublic has nullable fields (it's a view) — we filter out rows with null id after fetch
export type DishPublicWithPhotos = DishPublic & { photos: Photo[] }

export interface DishScore {
  avg: number
  count: number
}

interface VoterStore {
  competition: Competition | null
  dishes: DishPublicWithPhotos[]
  myRatings: Map<string, number> // dish_id → score (1-10)
  myDishId: string | null
  dishScores: Map<string, DishScore> // dish_id → { avg, count }
  isLoading: boolean
  error: string | null

  setCompetition: (c: Competition) => void
  setDishes: (dishes: DishPublicWithPhotos[]) => void
  setMyRatings: (ratings: Array<{ dish_id: string; score: number }>) => void
  setMyRating: (dishId: string, score: number) => void
  setMyDishId: (id: string | null) => void
  setDishScores: (scores: Array<{ dish_id: string; avg: number; count: number }>) => void
  updatePhase: (phase: string) => void
  setLoading: (b: boolean) => void
  setError: (e: string | null) => void
  reset: () => void
}

const initialState = {
  competition: null,
  dishes: [],
  myRatings: new Map<string, number>(),
  myDishId: null,
  dishScores: new Map<string, DishScore>(),
  isLoading: false,
  error: null,
}

export const useVoterStore = create<VoterStore>()((set) => ({
  ...initialState,

  setCompetition: (competition) => set({ competition }),
  setDishes: (dishes) => set({ dishes }),

  setMyRatings: (ratings) => {
    const map = new Map<string, number>()
    for (const { dish_id, score } of ratings) {
      map.set(dish_id, score)
    }
    set({ myRatings: map })
  },

  setMyRating: (dishId, score) =>
    set((s) => {
      const map = new Map(s.myRatings)
      map.set(dishId, score)
      return { myRatings: map }
    }),

  setMyDishId: (myDishId) => set({ myDishId }),

  setDishScores: (scores) => {
    const map = new Map<string, DishScore>()
    for (const { dish_id, avg, count } of scores) {
      map.set(dish_id, { avg, count })
    }
    set({ dishScores: map })
  },

  updatePhase: (phase) =>
    set((s) => ({
      competition: s.competition ? { ...s.competition, phase } : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // CRITICAL: reset to initial state on unmount to prevent stale data flash
  reset: () => set({ ...initialState, myRatings: new Map(), dishScores: new Map() }),
}))
