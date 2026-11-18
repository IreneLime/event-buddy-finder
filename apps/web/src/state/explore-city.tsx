import { createContext, useContext, useState, type ReactNode } from 'react'

interface ExploreCityValue {
  city: string
  setCity: (city: string) => void
}

const ExploreCityContext = createContext<ExploreCityValue | null>(null)

export function ExploreCityProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState('Toronto')
  return <ExploreCityContext.Provider value={{ city, setCity }}>{children}</ExploreCityContext.Provider>
}

export function useExploreCity() {
  const value = useContext(ExploreCityContext)
  if (!value) throw new Error('useExploreCity must be used inside ExploreCityProvider')
  return value
}
