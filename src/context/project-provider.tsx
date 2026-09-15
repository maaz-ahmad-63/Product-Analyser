'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

export interface ProjectSummary {
  id: string
  name: string
  platform: string
  ownProduct: {
    url: string
    name: string | null
  }
  competitors: Array<{
    url: string
    name: string | null
  }>
  status: string
  createdAt: string
  updatedAt: string
}

export interface ProjectContextType {
  projects: ProjectSummary[]
  currentProjectId: string | null
  currentProjectMeta: any | null
  currentProjectData: any | null
  setCurrentProjectId: (id: string) => void
  isLoading: boolean
  isSwitching: boolean
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  currentProjectId: null,
  currentProjectMeta: null,
  currentProjectData: null,
  setCurrentProjectId: () => {},
  isLoading: true,
  isSwitching: false,
  refreshProjects: async () => {},
})

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null)
  const [currentProjectMeta, setCurrentProjectMeta] = useState<any | null>(null)
  const [currentProjectData, setCurrentProjectData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSwitching, setIsSwitching] = useState<boolean>(false)

  // In-memory cache for fetched project data
  const projectCacheRef = useRef<Map<string, { meta: any; data: any }>>(new Map())

  const fetchProjectDetails = useCallback(async (id: string) => {
    // Return cached data immediately if available
    if (projectCacheRef.current.has(id)) {
      const cached = projectCacheRef.current.get(id)!
      setCurrentProjectMeta(cached.meta)
      setCurrentProjectData(cached.data)
      setIsSwitching(false)
      setIsLoading(false)
      return
    }

    try {
      setIsSwitching(true)
      const res = await fetch(`/api/analyses/${id}`)
      if (!res.ok) return
      const json = await res.json()
      const meta = json.analysis || null
      const data = json.data || null

      // Save to cache
      projectCacheRef.current.set(id, { meta, data })
      setCurrentProjectMeta(meta)
      setCurrentProjectData(data)
    } catch (err) {
      console.error(`Failed to load project details for ${id}:`, err)
    } finally {
      setIsSwitching(false)
      setIsLoading(false)
    }
  }, [])

  const setCurrentProjectId = useCallback((id: string) => {
    if (id === currentProjectId) return

    if (typeof window !== 'undefined') {
      localStorage.setItem('sga_active_project_id', id)
    }

    // Instant switch if already cached
    if (projectCacheRef.current.has(id)) {
      const cached = projectCacheRef.current.get(id)!
      setCurrentProjectIdState(id)
      setCurrentProjectMeta(cached.meta)
      setCurrentProjectData(cached.data)
      setIsSwitching(false)
      return
    }

    // Show buffering immediately while fetching
    setIsSwitching(true)
    setCurrentProjectIdState(id)
  }, [currentProjectId])

  const refreshProjects = useCallback(async () => {
    try {
      setIsLoading(true)
      // Clear cache on explicit full refresh
      projectCacheRef.current.clear()

      const res = await fetch('/api/analyses')
      if (!res.ok) return
      const json = await res.json()
      const list: ProjectSummary[] = json.analyses || []
      setProjects(list)

      if (list.length > 0) {
        let activeId: string | null = null
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('sga_active_project_id')
          if (stored && list.some((p) => p.id === stored)) {
            activeId = stored
          }
        }
        if (!activeId) {
          activeId = list[0].id
        }
        setCurrentProjectIdState(activeId)
        await fetchProjectDetails(activeId)
      } else {
        setCurrentProjectIdState(null)
        setCurrentProjectMeta(null)
        setCurrentProjectData(null)
      }
    } catch (err) {
      console.error('Failed to load projects list:', err)
    } finally {
      setIsLoading(false)
      setIsSwitching(false)
    }
  }, [fetchProjectDetails])

  // Initial load
  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  // Fetch details whenever currentProjectId changes
  useEffect(() => {
    if (!currentProjectId) {
      setCurrentProjectMeta(null)
      setCurrentProjectData(null)
      setIsSwitching(false)
      return
    }

    // If already in cache and already set, do nothing
    if (projectCacheRef.current.has(currentProjectId)) {
      const cached = projectCacheRef.current.get(currentProjectId)!
      setCurrentProjectMeta(cached.meta)
      setCurrentProjectData(cached.data)
      setIsSwitching(false)
      return
    }

    fetchProjectDetails(currentProjectId)
  }, [currentProjectId, fetchProjectDetails])

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProjectId,
        currentProjectMeta,
        currentProjectData,
        setCurrentProjectId,
        isLoading,
        isSwitching,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}

