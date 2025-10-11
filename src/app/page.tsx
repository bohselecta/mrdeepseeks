'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, Code, Eye, MessageSquare, ChevronDown, Sparkles, Play, Save, FolderOpen } from 'lucide-react';
import SaveModal from '@/components/SaveModal';
import LoadModal from '@/components/LoadModal';
import AuthModal from '@/components/AuthModal';
import { saveProject, deleteProject, Project } from '@/lib/storage';
import { createClient } from '@/lib/supabase';

type Files = {
  html: string;
  css: string;
  js: string;
};

export default function MrDeepseeksEditor() {
  const [view, setView] = useState<'code' | 'preview'>('code');
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [chatOpen, setChatOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  const [files, setFiles] = useState<Files>({
    html: '<!-- Your HTML will appear here -->',
    css: '/* Your CSS will appear here */',
    js: '// Your JavaScript will appear here'
  });

  const [previewHtml, setPreviewHtml] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check auth state on mount
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkSession();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update preview whenever files change
  useEffect(() => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${files.css}</style>
</head>
<body>
  ${files.html}
  <script>${files.js}</script>
</body>
</html>`;
    setPreviewHtml(html);
  }, [files]);

  // Save project handler
  const handleSave = async (name: string, files: Files) => {
    try {
      if (user) {
        // Save to Supabase for authenticated users
        const supabase = createClient();
        const { error } = await supabase.from('projects').insert({
          user_id: user.id,
          name,
          html: files.html,
          css: files.css,
          js: files.js
        });

        if (error) throw error;
        console.log('Project saved to cloud successfully');
      } else {
        // Save to localStorage for guest users
        saveProject(name, files);
        console.log('Project saved locally');
      }

      // TODO: Show success toast
    } catch (error) {
      // TODO: Show error toast
      console.error('Failed to save project:', error);
    }
  };

  // Load project handler
  const handleLoad = (project: Project) => {
    setFiles(project.files);
    setActiveTab('html');
    setLoadModalOpen(false);
  };

  // Delete project handler
  const handleDelete = async (id: string) => {
    try {
      deleteProject(id);
      // TODO: Show success toast
      console.log('Project deleted successfully');
    } catch (error) {
      // TODO: Show error toast
      console.error('Failed to delete project:', error);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // TODO: Show success toast
      console.log('Signed out successfully');
    } catch (error) {
      // TODO: Show error toast
      console.error('Failed to sign out:', error);
    }
  };

  // Show save modal only when there are files to save
  const canSave = files.html.trim() || files.css.trim() || files.js.trim();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S or Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (canSave && !saveModalOpen) {
          setSaveModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSave, saveModalOpen]);

  // Handle generation with streaming
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setFiles({ html: '', css: '', js: '' });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) throw new Error('Generation failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let currentFile: 'html' | 'css' | 'js' = 'html';

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'file_switch') {
                currentFile = data.file;
                setActiveTab(data.file);
              } else if (data.type === 'content') {
                setFiles(prev => ({
                  ...prev,
                  [currentFile]: prev[currentFile] + data.content
                }));
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
      // TODO: Show user-friendly error message
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-white">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#161b22]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold">Mr. Deepseeks</h1>
          <span className="text-sm text-gray-400">I build your apps instantly!</span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm">
              <span>{user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-blue-300 hover:text-blue-200 text-xs"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
            >
              Sign In
            </button>
          )}
          <button
            onClick={() => setSaveModalOpen(true)}
            disabled={!canSave}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save Project"
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLoadModalOpen(true)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title="Load Project"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor/Preview Area */}
        <div className="flex-1 flex flex-col">
          {/* View Toggle */}
          <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-[#161b22]">
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setView('code')}
                className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                  view === 'code' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Code className="w-4 h-4" />
                Code
              </button>
              <button
                onClick={() => setView('preview')}
                className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                  view === 'preview' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            </div>

            {view === 'code' && (
              <div className="flex gap-2">
                {(['html', 'css', 'js'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Code/Preview Content */}
          <div className="flex-1 overflow-hidden">
            {view === 'code' ? (
              <div className="h-full bg-[#0d1117] p-4">
                <pre className="h-full overflow-auto font-mono text-sm text-gray-300 whitespace-pre-wrap">
                  {files[activeTab]}
                  {isGenerating && activeTab === activeTab && (
                    <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                  )}
                </pre>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="w-full h-full bg-white"
                title="Preview"
                sandbox="allow-scripts"
              />
            )}
          </div>
        </div>

        {/* Chat Dock */}
        <div
          className={`border-l border-white/10 bg-[#161b22] transition-all duration-300 ${
            chatOpen ? 'w-96' : 'w-0'
          }`}
        >
          {chatOpen && (
            <div className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="h-12 border-b border-white/10 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span className="font-medium">Chat</span>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1 hover:bg-white/5 rounded transition-colors"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {!isGenerating && files.html === '' && (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">What would you like to build?</p>
                    <div className="space-y-2">
                      {[
                        'A calculator app',
                        'A todo list',
                        'A portfolio page',
                        'A landing page'
                      ].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setPrompt(suggestion)}
                          className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span className="text-sm">Building your app...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    placeholder="Describe your app..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={isGenerating}
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Toggle (when closed) */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="absolute right-4 bottom-4 w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}

        {/* Modals */}
        <SaveModal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          onSave={handleSave}
          files={files}
        />
        <LoadModal
          isOpen={loadModalOpen}
          onClose={() => setLoadModalOpen(false)}
          onLoad={handleLoad}
          onDelete={handleDelete}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    </div>
  );
}
