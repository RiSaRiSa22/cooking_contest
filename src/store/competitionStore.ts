import { create } from 'zustand'
import type { Database } from '../types/database.types'

type Competition = Database['public']['Tables']['competitions']['Row']
type Dish = Database['public']['Tables']['dishes']['Row']
type Photo = Database['public']['Tables']['photos']['Row']
type Participant = Database['public']['Tables']['participants']['Row']

export type DishWithPhotos = Dish & { photos: Photo[] }

export interface DishScore {
  avg: number
  count: number
}

interface CompetitionStore {
  competition: Competition | null
  dishes: DishWithPhotos[]
  participants: Participant[]
  dishScores: Map<string, DishScore> // dish_id → { avg, count }
  isLoading: boolean
  error: string | null
  setCompetition: (c: Competition) => void
  setDishes: (dishes: DishWithPhotos[]) => void
  setParticipants: (participants: Participant[]) => void
  setDishScores: (scores: Map<string, DishScore>) => void
  updatePhase: (phase: string) => void
  addDish: (dish: DishWithPhotos) => void
  updateDish: (dish: DishWithPhotos) => void
  removeDish: (dishId: string) => void
  addParticipant: (p: Participant) => void
  setLoading: (b: boolean) => void
  setError: (e: string | null) => void
  reset: () => void
}

const initialState = {
  competition: null,
  dishes: [],
  participants: [],
  dishScores: new Map<string, DishScore>(),
  isLoading: false,
  error: null,
}

export const useCompetitionStore = create<CompetitionStore>()((set) => ({
  ...initialState,

  setCompetition: (competition) => set({ competition }),
  setDishes: (dishes) => set({ dishes }),
  setParticipants: (participants) => set({ participants }),
  setDishScores: (dishScores) => set({ dishScores }),

  updatePhase: (phase) =>
    set((s) => ({
      competition: s.competition ? { ...s.competition, phase } : null,
    })),

  addDish: (dish) => set((s) => ({ dishes: [...s.dishes, dish] })),

  updateDish: (dish) =>
    set((s) => ({
      dishes: s.dishes.map((d) => (d.id === dish.id ? dish : d)),
    })),

  removeDish: (dishId) =>
    set((s) => ({ dishes: s.dishes.filter((d) => d.id !== dishId) })),

  addParticipant: (p) =>
    set((s) => ({ participants: [...s.participants, p] })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // CRITICAL: reset to initial state on unmount to prevent stale data flash
  // when navigating between competitions
  reset: () => set(initialState),
}))
