import { createClient } from './supabase';

export type Project = {
  id: string;
  name: string;
  html: string;
  css: string;
  js: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  isPublic?: boolean;
  shareUrl?: string;
};

// For guest users (localStorage)
const LOCAL_STORAGE_KEY = 'mrdeepseeks_projects';

export const loadProjects = async (userId?: string): Promise<Project[]> => {
  if (userId) {
    // Load from Supabase for authenticated users
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase load error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to load projects from Supabase:', error);
      return [];
    }
  } else {
    // Load from localStorage for guests
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
};

export const saveProject = async (name: string, files: { html: string; css: string; js: string }, userId?: string): Promise<Project> => {
  const newProject: Project = {
    id: crypto.randomUUID(),
    name,
    html: files.html,
    css: files.css,
    js: files.js,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId,
    isPublic: false,
  };

  if (userId) {
    // Save to Supabase for authenticated users
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .insert({
          id: newProject.id,
          user_id: userId,
          name: newProject.name,
          html: newProject.html,
          css: newProject.css,
          js: newProject.js,
          created_at: newProject.createdAt,
          updated_at: newProject.updatedAt,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase save error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to save project to Supabase:', error);
      throw error;
    }
  } else {
    // Save to localStorage for guests
    if (typeof window === 'undefined') throw new Error('localStorage is not available');
    const projects = await loadProjects();
    projects.push(newProject);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
    return newProject;
  }
};

export const deleteProject = async (id: string, userId?: string): Promise<void> => {
  if (userId) {
    // Delete from Supabase for authenticated users
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete project from Supabase:', error);
      throw error;
    }
  } else {
    // Delete from localStorage for guests
    if (typeof window === 'undefined') throw new Error('localStorage is not available');
    let projects = await loadProjects();
    projects = projects.filter(project => project.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  }
};

export const getProject = async (id: string, userId?: string): Promise<Project | undefined> => {
  const projects = await loadProjects(userId);
  return projects.find(project => project.id === id);
};
