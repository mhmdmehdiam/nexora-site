'use client'

import { createContext, useContext } from 'react'

export interface AppUser {
  id: string
  name: string
  email: string
  role: string
}

export interface AppContextType {
  user: AppUser | null
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const AppContext = createContext<AppContextType>({
  user: null,
  sidebarOpen: true,
  setSidebarOpen: () => {},
})

export const useApp = () => useContext(AppContext)
