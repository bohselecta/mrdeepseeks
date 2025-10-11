'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { loadProjects, deleteProject, type Project } from '@/lib/projects';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [user] = useState<{ id: string; email?: string } | null>({ id: 'demo-user', email: 'demo@example.com' });

  useEffect(() => {
    // Load projects using the projects service
    loadProjectsFromService();
  }, []);

  const loadProjectsFromService = async () => {
    setLoading(true);
    try {
      if (user) {
        // Load from Supabase for authenticated users
        const projects = await loadProjects(user.id);
        setProjects(projects);
      } else {
        // Load from localStorage for guests
        const projects = await loadProjects();
        setProjects(projects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteProject(projectId, user?.id);
      // Refresh projects list
      await loadProjectsFromService();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const generateShareUrl = (projectId: string) => {
    // TODO: Generate unique public URL
    return `/shared/${projectId}`;
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#161b22]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">My Projects</h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="p-6 border-b border-white/10">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-400">Loading projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {searchTerm ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Create your first project to get started'
              }
            </p>
            {!searchTerm && (
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className="bg-[#161b22] border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors"
              >
                {/* Project Preview */}
                <div className="aspect-video bg-white/5 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  {project.html && project.html.includes('<') ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                      HTML Preview
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                      No Preview
                    </div>
                  )}
                </div>

                {/* Project Info */}
                <div className="space-y-2">
                  <h3 className="font-medium text-white truncate" title={project.name}>
                    {project.name}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Created {formatDate(project.createdAt)}</span>
                    {project.updatedAt !== project.createdAt && (
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    )}
                  </div>

                  {/* Project Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1">
                      <button className="p-1 hover:bg-white/5 rounded transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 hover:bg-white/5 rounded transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 hover:bg-white/5 rounded transition-colors text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {project.isPublic && project.shareUrl && (
                      <Link
                        href={project.shareUrl}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Share
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
