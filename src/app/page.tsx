'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, Code, Eye, MessageSquare, ChevronDown, Sparkles, Play, Save, FolderOpen } from 'lucide-react';
import Image from 'next/image';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function MrDeepseeksEditor() {
  const [view, setView] = useState('code');
  const [activeTab, setActiveTab] = useState<keyof typeof files>('html');
  const [chatOpen, setChatOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

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

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    if (!prompt.trim() || isGenerating) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);

    setIsGenerating(true);
    setCompleteHtml('');
    setActiveTab('html'); // Start on HTML tab
    const currentPrompt = prompt;
    setPrompt('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt })
      });

      const reader = response.body!.getReader();
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
                    <div className="text-sm">{msg.content}</div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Image
                      src="/building-app-icon.svg"
                      alt="Building"
                      width={16}
                      height={16}
                      className="animate-pulse"
                    />
                    <span className="text-sm">Building your app...</span>
                  </div>
                )}

                <div ref={chatEndRef} />
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

      </div>
    </div>
  );
}
