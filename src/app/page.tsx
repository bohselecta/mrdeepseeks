'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, Code, Eye, MessageSquare, ChevronDown, Play, Save, FolderOpen, Plus, X } from 'lucide-react';
import Image from 'next/image';

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
  const [user] = useState<{ id: string; email?: string } | null>({ id: 'demo-user', email: 'demo@example.com' });

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
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Save className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <FolderOpen className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Toggle (when closed) - Desktop */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="hidden lg:block absolute right-4 top-4 w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
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
    </div>
  );
}
