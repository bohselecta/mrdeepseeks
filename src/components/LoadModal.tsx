'use client';

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Project } from '@/lib/storage';

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (project: Project) => void;
  onDelete: (id: string) => void;
}

export default function LoadModal({ isOpen, onClose, onLoad, onDelete }: LoadModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      // Check if user is authenticated (this would be passed as prop in real implementation)
      // For now, we'll load from localStorage as default
      const stored = localStorage.getItem('mrdeepseeks_projects');
      const loadedProjects = stored ? JSON.parse(stored) : [];
      setProjects(loadedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      onDelete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-white/10 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Load Project</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/5 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-400">Loading projects...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <div className="text-lg mb-2">No projects found</div>
              <div className="text-sm">Start building something awesome!</div>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                  onClick={() => onLoad(project)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">
                      {project.name}
                    </div>
                    <div className="text-sm text-gray-400">
                      Created {formatDate(project.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
