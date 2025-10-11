'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, Code, Eye, MessageSquare, ChevronDown, Play, Save, FolderOpen, Plus, X, Image as ImageIcon, Video, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import AuthModal from '@/components/AuthModal';
import { saveProject, loadProjects, deleteProject, type Project } from '@/lib/projects';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
};

export default function MrDeepseeksEditor() {
  const [view, setView] = useState('code');
  const [activeTab, setActiveTab] = useState<keyof typeof files>('html');
  const [chatOpen, setChatOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUsage, setVideoUsage] = useState<{ count: number; month: string }>({ count: 0, month: '' });

  // Store the COMPLETE HTML
  const [completeHtml, setCompleteHtml] = useState('');

  // Parsed sections for display in tabs
  const [files, setFiles] = useState({
    html: '<!-- Your HTML will appear here -->',
    css: '/* Your CSS will appear here */',
    js: '// Your JavaScript will appear here'
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check authentication state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = (await import('@/lib/supabase')).createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
  }, []);

  // Load video usage on mount and when user changes
  useEffect(() => {
    if (user) {
      loadVideoUsage();
    }
  }, [user]);

  // Load video usage from localStorage
  const loadVideoUsage = () => {
    if (typeof window === 'undefined') return;

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const stored = localStorage.getItem(`video_usage_${user?.id || 'guest'}`);

    if (stored) {
      const usage = JSON.parse(stored);
      if (usage.month === currentMonth) {
        setVideoUsage(usage);
      } else {
        // Reset for new month
        setVideoUsage({ count: 0, month: currentMonth });
      }
    } else {
      setVideoUsage({ count: 0, month: currentMonth });
    }
  };

  // Save video usage to localStorage
  const saveVideoUsage = (newUsage: { count: number; month: string }) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`video_usage_${user?.id || 'guest'}`, JSON.stringify(newUsage));
    setVideoUsage(newUsage);
  };

  // Auto-resize chat input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setPrompt(textarea.value);

    // Reset height to minimum to get accurate scrollHeight
    textarea.style.height = '40px';

    // Calculate new height (scrollHeight includes padding but not border)
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 200; // ~10 lines

    if (scrollHeight <= maxHeight) {
      textarea.style.height = scrollHeight + 'px';
    } else {
      textarea.style.height = maxHeight + 'px';
      textarea.style.overflowY = 'auto';
    }
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit to 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle save project
  const handleSaveProject = async (projectName: string) => {
    if (!projectName.trim()) return;

    try {
      await saveProject(projectName, {
        html: files.html,
        css: files.css,
        js: files.js
      }, user?.id);

      setSaveModalOpen(false);
      // Optionally refresh projects list
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project. Please try again.');
    }
  };

  // Handle load projects list
  const handleLoadProjects = async () => {
    try {
      const projects = await loadProjects(user?.id);
      setAvailableProjects(projects);
      setLoadModalOpen(true);
    } catch (error) {
      console.error('Failed to load projects:', error);
      alert('Failed to load projects. Please try again.');
    }
  };

  // Handle load specific project
  const handleLoadProject = async (project: Project) => {
    setFiles({
      html: project.html,
      css: project.css,
      js: project.js
    });
    setCompleteHtml(''); // Clear the complete HTML so it gets regenerated
    setLoadModalOpen(false);
  };

  // Handle delete project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteProject(projectId, user?.id);
      // Refresh projects list
      const projects = await loadProjects(user?.id);
      setAvailableProjects(projects);
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  // Handle generate image
  const handleGenerateImage = async () => {
    if (!prompt.trim() || isGeneratingImage) return;

    setIsGeneratingImage(true);
    setGeneratedImage(null);

    try {
      const response = await fetch('https://api.deepinfra.com/v1/openai/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DEEPINFRA_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size: "1024x1024",
          model: "black-forest-labs/FLUX-1-dev",
          n: 1
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Image generation API error:', error);
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.data && data.data[0] && data.data[0].b64_json) {
        setGeneratedImage(`data:image/jpeg;base64,${data.data[0].b64_json}`);
      } else {
        throw new Error('Invalid response format from image API');
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handle generate video
  const handleGenerateVideo = async () => {
    if (!prompt.trim() || isGeneratingVideo || videoUsage.count >= 10) return;

    setIsGeneratingVideo(true);
    setGeneratedVideo(null);

    try {
      const response = await fetch('https://api.deepinfra.com/v1/inference/Wan-AI/Wan2.1-T2V-1.3B', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DEEPINFRA_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim()
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Video generation API error:', error);
        throw new Error(`Video generation failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.video_url) {
        setGeneratedVideo(data.video_url);
        // Update usage count
        const newUsage = { count: videoUsage.count + 1, month: videoUsage.month };
        saveVideoUsage(newUsage);
      } else {
        throw new Error('Invalid response format from video API');
      }
    } catch (error) {
      console.error('Failed to generate video:', error);
      alert('Failed to generate video. Please try again.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Parse complete HTML into sections for tabs
  const parseHtmlSections = (html: string) => {
    // Extract CSS from <style> tags
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const css = styleMatch ? styleMatch[1].trim() : '';

    // Extract JS from <script> tags
    const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const js = scriptMatch ? scriptMatch[1].trim() : '';

    // Extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1].trim() : '';

    // Remove script tags from body content
    bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim();

    return { html: bodyContent, css, js };
  };

  // Update parsed sections when complete HTML changes
  useEffect(() => {
    if (completeHtml && !isGenerating) {
      const parsed = parseHtmlSections(completeHtml);
      setFiles(parsed);
    }
  }, [completeHtml, isGenerating]);

  // Auto-switch tabs during generation based on what's being written
  useEffect(() => {
    if (isGenerating && completeHtml) {
      if (completeHtml.includes('<style') && !completeHtml.includes('</style>')) {
        setActiveTab('css');
      } else if (completeHtml.includes('<script') && !completeHtml.includes('</script>')) {
        setActiveTab('js');
      } else if (completeHtml.includes('<body') && completeHtml.includes('</head>')) {
        setActiveTab('html');
      }
    }
  }, [completeHtml, isGenerating]);


  // Handle generation with streaming
  const handleGenerate = async () => {
    if ((!prompt.trim() && !uploadedImage) || isGenerating) return;

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: prompt,
      image: uploadedImage || undefined
    }]);

    setIsGenerating(true);
    setCompleteHtml('');
    setActiveTab('html'); // Start on HTML tab
    const currentPrompt = prompt;
    const currentImage = imageFile;

    // Clear prompt and reset textarea height
    setPrompt('');
    setUploadedImage(null);
    setImageFile(null);
    if (chatInputRef.current) {
      chatInputRef.current.style.height = '40px';
      chatInputRef.current.style.overflowY = 'hidden';
    }

    try {
      // Use FormData for image upload
      const formData = new FormData();
      formData.append('message', currentPrompt);
      if (currentImage) {
        formData.append('image', currentImage);
        console.log('Sending image to API:', currentImage.name, currentImage.size, 'bytes');
      }

      console.log('Making API request to /api/chat');

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API request failed:', response.status, errorData);
        throw new Error(`API request failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('API response received:', data);

      // For image analysis, just add the response as a message
      if (currentImage) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.content || 'Unable to analyze image'
        }]);
      } else {
        // For text-only, generate HTML using the existing streaming logic
        const htmlResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentPrompt })
        });

        if (htmlResponse.ok) {
          const reader = htmlResponse.body!.getReader();
          const decoder = new TextDecoder();
          let accumulatedHtml = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'content') {
                    accumulatedHtml += data.content;
                    setCompleteHtml(accumulatedHtml);

                    // Auto-switch tabs based on what's being written
                    if (accumulatedHtml.includes('<style') && !accumulatedHtml.includes('</style>')) {
                      setActiveTab('css');
                    } else if (accumulatedHtml.includes('<script') && !accumulatedHtml.includes('</script>')) {
                      setActiveTab('js');
                    } else if (accumulatedHtml.includes('<body')) {
                      setActiveTab('html');
                    }
                  } else if (data.type === 'done') {
                    setMessages(prev => [...prev, {
                      role: 'assistant',
                      content: '✅ App generated successfully!'
                    }]);
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Generation failed. Please try again.'
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-white">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#161b22]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <Image
              src="/graphic-mark-logo.svg"
              alt="MrDeepseeks Logo"
              width={32}
              height={32}
            />
          </div>
          <h1 className="text-lg font-bold">Mr. Deepseeks</h1>
          <span className="text-sm text-gray-400">Look at me! I build your apps for free!</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaveModalOpen(true)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title="Save Project"
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={handleLoadProjects}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title="Load Project"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <button
            onClick={() => setHamburgerOpen(!hamburgerOpen)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors relative"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Hamburger Menu Dropdown */}
      {hamburgerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:z-40" onClick={() => setHamburgerOpen(false)}>
          <div
            className="absolute top-14 left-4 bg-[#161b22] border border-white/10 rounded-lg shadow-xl w-64 py-2 z-50"
            onClick={e => e.stopPropagation()}
          >
            {/* User Info Section */}
            <div className="px-4 py-3 border-b border-white/10">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.email || 'User'}
                    </p>
                    <p className="text-xs text-gray-400">Logged in</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">?</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Not logged in</p>
                    <p className="text-xs text-gray-400">Guest mode</p>
                  </div>
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {!user && (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full text-left px-4 py-2 hover:bg-white/5 text-white flex items-center gap-3 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">Sign In</span>
                </button>
              )}

              <Link href="/dashboard" className="block">
                <button className="w-full text-left px-4 py-2 hover:bg-white/5 text-white flex items-center gap-3 transition-colors">
                  <Save className="w-4 h-4" />
                  <span className="text-sm">My Projects</span>
                </button>
              </Link>

              <button className="w-full text-left px-4 py-2 hover:bg-white/5 text-white flex items-center gap-3 transition-colors">
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm">Load Project</span>
              </button>

              {user && (
                <button className="w-full text-left px-4 py-2 hover:bg-white/5 text-red-400 flex items-center gap-3 transition-colors">
                  <span className="text-sm">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Editor/Preview Area */}
        <div className="flex-1 flex flex-col min-h-0">
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
                <span className="hidden sm:inline">Code</span>
              </button>
              <button
                onClick={() => setView('preview')}
                className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                  view === 'preview' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Preview</span>
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
                    <span className="hidden sm:inline">{tab.toUpperCase()}</span>
                    <span className="sm:hidden">{tab.charAt(0).toUpperCase()}</span>
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
                  {isGenerating ? (
                    // Show raw streaming HTML while generating
                    <>
                      {completeHtml}
                      <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                    </>
                  ) : (
                    // Show parsed sections when done
                    files[activeTab]
                  )}
                </pre>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                srcDoc={completeHtml}
                className="w-full h-full bg-white"
                title="Preview"
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                style={{ border: 'none' }}
              />
            )}
          </div>
        </div>

        {/* Desktop Sidebar Chat */}
        <div className="hidden lg:block lg:w-96">
          {/* Chat Dock - Desktop Sidebar */}
          <div
            className={`h-full border-l border-white/10 bg-[#161b22] transition-all duration-300 ${
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

                {/* Chat Messages */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="space-y-3">
                      <p className="text-gray-400 text-sm">What would you like to build?</p>
                      <div className="space-y-2">
                        {[
                          'A button that says hello',
                          'A calculator app',
                          'A todo list',
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

                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-500/20 text-blue-100'
                          : 'bg-white/5 text-gray-300'
                      }`}
                    >
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {msg.role === 'user' ? 'You' : 'Mr. Deepseeks'}
                      </div>
                      {msg.image && (
                        <Image src={msg.image} alt="uploaded" width={400} height={300} className="max-w-full rounded mb-2" />
                      )}
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))}

                  {isGenerating && (
                    <div className="flex items-center gap-2 text-blue-400">
                      <Image
                        src="/building-app-icon.svg"
                        alt="Working"
                        width={24}
                        height={24}
                        className="animate-pulse"
                      />
                      <span className="text-sm">Working...</span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-white/10">
                  {/* Image Preview */}
                  {uploadedImage && (
                    <div className="mb-3 relative inline-block">
                      <Image
                        src={uploadedImage}
                        alt="Preview"
                        width={200}
                        height={128}
                        className="max-h-32 rounded-lg border-2 border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedImage(null);
                          setImageFile(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Text Input - Full Width */}
                  <div className="mb-3">
                    <textarea
                      ref={chatInputRef}
                      value={prompt}
                      onChange={handleInputChange}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                      placeholder={user ? "Ask about an image or chat..." : "Describe your app..."}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden"
                      disabled={isGenerating}
                      rows={1}
                      style={{
                        minHeight: '40px',
                        maxHeight: '200px' // ~10 lines at ~20px per line
                      }}
                    />
                  </div>

                  {/* Action Buttons - Below Input */}
                  <div className="flex gap-2">
                    {/* Image Upload Button - Only for logged in users */}
                    {user && (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload-desktop"
                        />
                        <label
                          htmlFor="image-upload-desktop"
                          className="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="font-medium">Image</span>
                        </label>
                      </>
                    )}

                    {/* Send Button */}
                    <button
                      onClick={handleGenerate}
                      disabled={(!prompt.trim() && !uploadedImage) || isGenerating}
                      className="ml-auto px-3 py-1.5 bg-[#3EADF5] hover:bg-[#2E9CF5] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3" />
                      <span>Send</span>
                    </button>
                  </div>

                  {/* Generation Buttons */}
                  <div className="flex justify-center gap-3 pt-3">
                    {/* Image Generation Button */}
                    <button
                      onClick={handleGenerateImage}
                      disabled={!prompt.trim() || isGeneratingImage || isGeneratingVideo}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="font-medium">
                        {isGeneratingImage ? 'Generating...' : 'Make Image'}
                      </span>
                    </button>

                    {/* Video Generation Button */}
                    <button
                      onClick={handleGenerateVideo}
                      disabled={!prompt.trim() || isGeneratingVideo || isGeneratingImage || videoUsage.count >= 10}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                      title={videoUsage.count >= 10 ? `Video limit reached (${videoUsage.count}/10 this month)` : 'Generate video (10¢ each, 10 free per month)'}
                    >
                      <Video className="w-4 h-4" />
                      <span className="font-medium">
                        {isGeneratingVideo ? 'Generating...' : `Make Video${videoUsage.count >= 10 ? ' (Limit)' : ''}`}
                      </span>
                    </button>
                  </div>

                  {/* Generated Image Display */}
                  {generatedImage && (
                    <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Generated Image</h4>
                        <button
                          onClick={() => setGeneratedImage(null)}
                          className="p-1 hover:bg-white/5 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <Image
                        src={generatedImage}
                        alt="Generated"
                        width={512}
                        height={512}
                        className="w-full max-w-md rounded-lg"
                      />
                    </div>
                  )}

                  {/* Generated Video Display */}
                  {generatedVideo && (
                    <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Generated Video</h4>
                        <div className="flex gap-2">
                          <a
                            href={generatedVideo}
                            download={`generated-video-${Date.now()}.mp4`}
                            className="p-1 hover:bg-white/5 rounded transition-colors"
                            title="Download video"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setGeneratedVideo(null)}
                            className="p-1 hover:bg-white/5 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <video
                        src={generatedVideo}
                        controls
                        className="w-full max-w-md rounded-lg"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                      <p className="text-xs text-gray-400 mt-2">
                        Video {videoUsage.count}/10 this month • 10¢ each
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Bottom Chat */}
        <div className="lg:hidden">
          {/* Mobile Chat Overlay */}
          {chatOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setChatOpen(false)}>
              <div
                className="absolute bottom-0 left-0 right-0 bg-[#161b22] border-t border-white/10 max-h-[70vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
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

                {/* Chat Messages */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="space-y-3">
                      <p className="text-gray-400 text-sm">What would you like to build?</p>
                      <div className="space-y-2">
                        {[
                          'A button that says hello',
                          'A calculator app',
                          'A todo list',
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

                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-500/20 text-blue-100'
                          : 'bg-white/5 text-gray-300'
                      }`}
                    >
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {msg.role === 'user' ? 'You' : 'Mr. Deepseeks'}
                      </div>
                      {msg.image && (
                        <Image src={msg.image} alt="uploaded" width={400} height={300} className="max-w-full rounded mb-2" />
                      )}
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))}

                  {isGenerating && (
                    <div className="flex items-center gap-2 text-blue-400">
                      <Image
                        src="/building-app-icon.svg"
                        alt="Working"
                        width={24}
                        height={24}
                        className="animate-pulse"
                      />
                      <span className="text-sm">Working...</span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-white/10">
                  {/* Image Preview */}
                  {uploadedImage && (
                    <div className="mb-3 relative inline-block">
                      <Image
                        src={uploadedImage}
                        alt="Preview"
                        width={200}
                        height={128}
                        className="max-h-32 rounded-lg border-2 border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedImage(null);
                          setImageFile(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Text Input - Full Width */}
                  <div className="mb-3">
                    <textarea
                      ref={chatInputRef}
                      value={prompt}
                      onChange={handleInputChange}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                      placeholder={user ? "Ask about an image or chat..." : "Describe your app..."}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden"
                      disabled={isGenerating}
                      rows={1}
                      style={{
                        minHeight: '40px',
                        maxHeight: '200px' // ~10 lines at ~20px per line
                      }}
                    />
                  </div>

                  {/* Action Buttons - Below Input */}
                  <div className="flex gap-2">
                    {/* Image Upload Button - Only for logged in users */}
                    {user && (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload-mobile"
                        />
                        <label
                          htmlFor="image-upload-mobile"
                          className="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="font-medium">Image</span>
                        </label>
                      </>
                    )}

                    {/* Send Button */}
                    <button
                      onClick={handleGenerate}
                      disabled={(!prompt.trim() && !uploadedImage) || isGenerating}
                      className="ml-auto px-3 py-1.5 bg-[#3EADF5] hover:bg-[#2E9CF5] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3" />
                      <span>Send</span>
                    </button>
                  </div>

                  {/* Generation Buttons */}
                  <div className="flex justify-center gap-3 pt-3">
                    {/* Image Generation Button */}
                    <button
                      onClick={handleGenerateImage}
                      disabled={!prompt.trim() || isGeneratingImage || isGeneratingVideo}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="font-medium">
                        {isGeneratingImage ? 'Generating...' : 'Make Image'}
                      </span>
                    </button>

                    {/* Video Generation Button */}
                    <button
                      onClick={handleGenerateVideo}
                      disabled={!prompt.trim() || isGeneratingVideo || isGeneratingImage || videoUsage.count >= 10}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                      title={videoUsage.count >= 10 ? `Video limit reached (${videoUsage.count}/10 this month)` : 'Generate video (10¢ each, 10 free per month)'}
                    >
                      <Video className="w-4 h-4" />
                      <span className="font-medium">
                        {isGeneratingVideo ? 'Generating...' : `Make Video${videoUsage.count >= 10 ? ' (Limit)' : ''}`}
                      </span>
                    </button>
                  </div>

                  {/* Generated Image Display */}
                  {generatedImage && (
                    <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Generated Image</h4>
                        <button
                          onClick={() => setGeneratedImage(null)}
                          className="p-1 hover:bg-white/5 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <Image
                        src={generatedImage}
                        alt="Generated"
                        width={512}
                        height={512}
                        className="w-full max-w-md rounded-lg"
                      />
                    </div>
                  )}

                  {/* Generated Video Display */}
                  {generatedVideo && (
                    <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Generated Video</h4>
                        <div className="flex gap-2">
                          <a
                            href={generatedVideo}
                            download={`generated-video-${Date.now()}.mp4`}
                            className="p-1 hover:bg-white/5 rounded transition-colors"
                            title="Download video"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setGeneratedVideo(null)}
                            className="p-1 hover:bg-white/5 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <video
                        src={generatedVideo}
                        controls
                        className="w-full max-w-md rounded-lg"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                      <p className="text-xs text-gray-400 mt-2">
                        Video {videoUsage.count}/10 this month • 10¢ each
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Toggle (when closed) - Desktop */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="hidden lg:block fixed right-4 bottom-4 w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-40"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}

        {/* Chat Toggle (when closed) - Mobile */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="lg:hidden fixed right-4 bottom-4 w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-40"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}

      </div>

      {/* Save Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-white/10 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/graphic-mark-logo.svg"
                  alt="MrDeepseeks Logo"
                  width={24}
                  height={24}
                />
                <h2 className="text-lg font-semibold text-white">Save Project</h2>
              </div>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="p-1 hover:bg-white/5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const projectName = formData.get('projectName') as string;
              handleSaveProject(projectName);
            }} className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  id="projectName"
                  name="projectName"
                  type="text"
                  placeholder="Enter project name..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {loadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-white/10 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/graphic-mark-logo.svg"
                  alt="MrDeepseeks Logo"
                  width={24}
                  height={24}
                />
                <h2 className="text-lg font-semibold text-white">Load Project</h2>
              </div>
              <button
                onClick={() => setLoadModalOpen(false)}
                className="p-1 hover:bg-white/5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {availableProjects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No projects found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableProjects.map(project => (
                    <div
                      key={project.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-white">{project.name}</h3>
                          <p className="text-sm text-gray-400">
                            Created: {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleLoadProject(project)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
