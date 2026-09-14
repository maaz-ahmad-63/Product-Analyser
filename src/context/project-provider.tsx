'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

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
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  currentProjectId: null,
  currentProjectMeta: null,
  currentProjectData: null,
  setCurrentProjectId: () => {},
  isLoading: true,
  refreshProjects: async () => {},
})

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null)
  const [currentProjectMeta, setCurrentProjectMeta] = useState<any | null>(null)
  const [currentProjectData, setCurrentProjectData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const setCurrentProjectId = useCallback((id: string) => {
    setCurrentProjectIdState(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sga_active_project_id', id)
    }
  }, [])

  const fetchProjectDetails = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/analyses/${id}`)
      if (!res.ok) return
      const json = await res.json()
      setCurrentProjectMeta(json.analysis || null)
      setCurrentProjectData(json.data || null)
    } catch (err) {
      console.error(`Failed to load project details for ${id}:`, err)
    }
  }, [])

  const refreshProjects = useCallback(async () => {
    try {
      setIsLoading(true)
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
    }
  }, [fetchProjectDetails])

  // Initial load
  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  // Fetch full details whenever currentProjectId changes
  useEffect(() => {
    if (!currentProjectId) {
      setCurrentProjectMeta(null)
      setCurrentProjectData(null)
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
