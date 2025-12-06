'use client';

import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { ChevronDown, Plus, Check } from 'lucide-react';
import Image from 'next/image';
import { CreateProjectModal } from './admin/CreateProjectModal';

const ProjectSelector: React.FC = () => {
  const { currentProject, projects, switchProject, isLoading } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-10 w-full bg-slate-900/50 rounded-xl animate-pulse border border-white/5" />
    );
  }

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelect = (projectId: string) => {
    switchProject(projectId);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={toggleDropdown}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 border border-white/10 rounded-xl hover:border-purple-500/30 hover:bg-slate-800/50 transition-all group"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {currentProject?.logo_url ? (
              <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                <Image 
                  src={currentProject.logo_url} 
                  alt={currentProject.name} 
                  fill 
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white border border-white/10 flex-shrink-0">
                {currentProject?.name?.substring(0, 2).toUpperCase() || "NP"}
              </div>
            )}
            <div className="text-left truncate">
              <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                {currentProject?.name || "Select Project"}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate">
                {currentProject?.symbol || "---"}
              </div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden flex flex-col max-h-64">
              <div className="p-2 text-[10px] font-medium text-slate-500 uppercase tracking-wider border-b border-white/5">
                Your Projects
              </div>
              
              <div className="overflow-y-auto flex-1 p-1 space-y-0.5">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelect(project.id)}
                    className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                      currentProject?.id === project.id 
                        ? "bg-purple-500/10 text-white" 
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {project.logo_url ? (
                      <div className="relative w-5 h-5 rounded overflow-hidden border border-white/10 flex-shrink-0">
                        <Image 
                          src={project.logo_url} 
                          alt={project.name} 
                          fill 
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400 border border-white/5 flex-shrink-0">
                        {project.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs truncate flex-1 text-left">{project.name}</span>
                    {currentProject?.id === project.id && (
                      <Check className="w-3 h-3 text-purple-400" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-2 border-t border-white/5 bg-slate-950/50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsCreateModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/10 text-xs font-medium text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
                >
                  <Plus className="w-3 h-3" /> Create Project
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateProjectModal 
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
};

export default ProjectSelector;
