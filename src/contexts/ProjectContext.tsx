'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import { useWallet } from '@solana/wallet-adapter-react';

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
  refreshProjects: () => Promise<void>;
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
  const { publicKey } = useWallet();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      // Only fetch if wallet is connected
      if (!publicKey) {
        setProjects([]);
        setCurrentProject(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedProjectId');
        }
        return;
      }

      const walletAddress = publicKey.toBase58();
      const response = await apiClient.get<Project[]>(`/projects?wallet=${walletAddress}`);
      setProjects(response || []);
      
      // If no projects available, clear saved selection
      if (!response || response.length === 0) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedProjectId');
        }
        setCurrentProject(null);
        return;
      }
      
      // Restore last selected project if available
      const savedProjectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
      if (savedProjectId && response) {
        const project = response.find(p => p.id === savedProjectId);
        if (project) {
          setCurrentProject(project);
        } else {
           // Saved project not found, default to first
           setCurrentProject(response[0]);
           if (typeof window !== 'undefined') localStorage.setItem('selectedProjectId', response[0].id);
        }
      } else {
         // No saved project, default to first
         setCurrentProject(response[0]);
         if (typeof window !== 'undefined') localStorage.setItem('selectedProjectId', response[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, [publicKey]);

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      await fetchProjects();
      setIsLoading(false);
    };
    
    loadProjects();
  }, [fetchProjects, publicKey]);

  const refreshProjects = async () => {
    setIsLoading(true);
    await fetchProjects();
    setIsLoading(false);
  };

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
      refreshProjects, 
      isLoading 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
