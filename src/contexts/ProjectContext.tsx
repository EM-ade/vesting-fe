'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

interface Project {
  id: string;
  name: string;
  symbol: string;
  mint_address?: string;
  logo_url?: string;
  is_active: boolean;
}

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  switchProject: (projectId: string) => void;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await apiClient.get<Project[]>('/projects');
        setProjects(response || []);
        
        // Restore last selected project if available
        const savedProjectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
        if (savedProjectId && response) {
          const project = response.find(p => p.id === savedProjectId);
          if (project) {
            setCurrentProject(project);
          } else if (response.length > 0) {
             // Default to first
             setCurrentProject(response[0]);
             if (typeof window !== 'undefined') localStorage.setItem('selectedProjectId', response[0].id);
          }
        } else if (response && response.length > 0) {
           setCurrentProject(response[0]);
           if (typeof window !== 'undefined') localStorage.setItem('selectedProjectId', response[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjects();
  }, []);

  const switchProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      if (typeof window !== 'undefined') localStorage.setItem('selectedProjectId', projectId);
      // Force a reload to clear any stale state in other components if necessary
      // window.location.reload(); 
      // Better to let React Context handle updates, but API calls need to pick up new ID.
    }
  };

  return (
    <ProjectContext.Provider value={{ 
      currentProject, 
      projects, 
      switchProject, 
      isLoading 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
