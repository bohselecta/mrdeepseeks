type Files = {
  html: string;
  css: string;
  js: string;
};

export type Project = {
  id: string;
  name: string;
  files: Files;
  createdAt: string;
};

const STORAGE_KEY = 'mrdeepseeks_projects';

export function saveProject(name: string, files: Files): void {
  try {
    const projects = loadProjects();
    const id = Date.now().toString();
    const project: Project = {
      id,
      name,
      files,
      createdAt: new Date().toISOString()
    };

    projects.push(project);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Failed to save project:', error);
    throw new Error('Failed to save project');
  }
}

export function loadProjects(): Project[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load projects:', error);
    return [];
  }
}

export function deleteProject(id: string): void {
  try {
    const projects = loadProjects().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Failed to delete project:', error);
    throw new Error('Failed to delete project');
  }
}

export function getProject(id: string): Project | null {
  try {
    const projects = loadProjects();
    return projects.find(p => p.id === id) || null;
  } catch (error) {
    console.error('Failed to get project:', error);
    return null;
  }
}
