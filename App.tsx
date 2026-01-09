
import React, { useState, useEffect, useRef } from 'react';
import { CreativeMode, Message, ChatSession } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import CreativeCanvas from './components/CreativeCanvas';
import { streamMovaContent, generateMovaImage } from './services/geminiService';
import { v4 as uuidv4 } from 'uuid';

const MOVA_WELCOME_GREETING = "Hello, I'm MOVA.";
const MOVA_SUB_GREETING = "How may I help you?";

const App: React.FC = () => {
  const [session, setSession] = useState<ChatSession>({
    id: uuidv4(),
    title: 'New Creative Session',
    messages: [],
    currentMode: CreativeMode.GENERAL,
    canvasContent: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'canvas' | 'gallery'>('chat');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [pendingRefinement, setPendingRefinement] = useState<{ data: string, type: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.messages]);

  const handleSendMessage = async (text: string, attachment?: { data: string, type: string }) => {
    const isDocMode = session.currentMode === CreativeMode.SCRIPT || session.currentMode === CreativeMode.STORY;
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: text || (attachment ? "Refine this image..." : ""),
      mode: session.currentMode,
      timestamp: new Date(),
      attachmentUrl: attachment?.data
    };

    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }));
    setIsLoading(true);
    setPendingRefinement(null);

    try {
      if (session.currentMode === CreativeMode.IMAGE_PROMPT || attachment) {
        const result = await generateMovaImage(
          text || "Enhance visual.", 
          attachment?.data, 
          attachment?.type || 'image/png'
        );
        
        setSession(prev => ({
          ...prev,
          messages: [...prev.messages, {
            id: uuidv4(),
            role: 'assistant',
            content: result.textContent || "Refinement complete.",
            imageUrl: result.imageUrl,
            mode: session.currentMode,
            timestamp: new Date()
          }]
        }));
      } else {
        // Prepare context for Gemini
        const history = session.messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        // If in document mode, provide the current canvas as context
        const prompt = isDocMode 
          ? `CURRENT DOCUMENT CONTENT:\n${session.canvasContent}\n\nUSER REQUEST: ${text}`
          : text;

        const stream = await streamMovaContent(prompt, session.currentMode, history);
        
        const assistantId = uuidv4();
        let assistantContent = '';

        setSession(prev => ({
          ...prev,
          messages: [...prev.messages, {
            id: assistantId,
            role: 'assistant',
            content: '',
            mode: session.currentMode,
            timestamp: new Date()
          }]
        }));

        for await (const chunk of stream) {
          const c = chunk as any;
          assistantContent += c.text;
          
          setSession(prev => {
            const updatedMessages = prev.messages.map(m => 
              m.id === assistantId ? { ...m, content: assistantContent } : m
            );
            
            // Auto-update canvas if in document mode
            let updatedCanvas = prev.canvasContent;
            if (isDocMode) {
                // Heuristic: If it looks like a large text generation, update canvas
                if (assistantContent.length > 50) {
                    updatedCanvas = assistantContent;
                }
            }

            return {
              ...prev,
              messages: updatedMessages,
              canvasContent: updatedCanvas
            };
          });
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      setSession(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: uuidv4(),
          role: 'assistant',
          content: `Error: ${error.message}`,
          mode: session.currentMode,
          timestamp: new Date()
        }]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCanvasAction = (action: string, context: string) => {
    let prompt = "";
    switch(action) {
        case 'REWRITE': prompt = `Rewrite this specific section to be more dramatic: "${context}"`; break;
        case 'EXPAND': prompt = `Add more detail and sensory description to this section: "${context}"`; break;
        case 'CONTINUE': prompt = `Continue the story/script from where it left off.`; break;
    }
    handleSendMessage(prompt);
  };

  const handleRefineAction = (imageUrl: string) => {
    setPendingRefinement({ data: imageUrl, type: 'image/png' });
    setViewMode('chat');
  };

  const switchMode = (mode: CreativeMode) => {
    setSession(prev => ({ ...prev, currentMode: mode }));
    setIsSidebarOpen(false);
    
    // Automatically switch to canvas for collaborative modes
    if (mode === CreativeMode.SCRIPT || mode === CreativeMode.STORY) {
        setViewMode('canvas');
    } else {
        setViewMode('chat');
    }
  };

  const resetSession = () => {
    setSession({ id: uuidv4(), title: 'New Creative Session', messages: [], currentMode: CreativeMode.GENERAL, canvasContent: '' });
    setIsSidebarOpen(false);
    setViewMode('chat');
    setIsProfileMenuOpen(false);
    setPendingRefinement(null);
  };

  const ModeButton = ({ mode, icon, label, description }: { mode: CreativeMode, icon: string, label: string, description: string }) => (
    <button
      onClick={() => switchMode(mode)}
      className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all border ${
        session.currentMode === mode 
          ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg' 
          : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        session.currentMode === mode ? 'creative-gradient text-white' : 'bg-slate-700/50'
      }`}>
        <i className={`fa-solid ${icon} text-sm`}></i>
      </div>
      <div className="text-left">
        <h3 className="font-bold text-xs uppercase tracking-wider">{label}</h3>
        <p className="text-[10px] opacity-60 leading-tight">{description}</p>
      </div>
    </button>
  );

  const hasHistory = session.messages.length > 0;
  const isCollaborationActive = session.currentMode === CreativeMode.SCRIPT || session.currentMode === CreativeMode.STORY;

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-200 overflow-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:relative z-50 h-full w-[300px] bg-[#0f121d] border-r border-slate-800/50 transition-transform duration-300 lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full p-5">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl creative-gradient flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="font-black text-xl text-white">M</span>
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-white">MOVA AI</h1>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Studio Pro</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 flex-grow overflow-y-auto pr-1 custom-scrollbar">
            <h2 className="px-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Workspace</h2>
            <ModeButton mode={CreativeMode.GENERAL} icon="fa-compass" label="Brainstorm" description="Quick ideas & research" />
            <ModeButton mode={CreativeMode.IMAGE_PROMPT} icon="fa-wand-magic-sparkles" label="Visuals" description="AI Image generation" />
            <ModeButton mode={CreativeMode.SCRIPT} icon="fa-film" label="Scriptwriter" description="Collaborative screenplay" />
            <ModeButton mode={CreativeMode.STORY} icon="fa-book-open" label="Novelist" description="Long-form storytelling" />
            <ModeButton mode={CreativeMode.SONG} icon="fa-music" label="Songwriter" description="Lyrics & composition" />
            <ModeButton mode={CreativeMode.QA} icon="fa-lightbulb" label="Analytic" description="Logic & business data" />
          </div>

          <div className="mt-auto pt-6 border-t border-slate-800/50">
            <button onClick={resetSession} className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all mb-4 border border-slate-700/50">
              <i className="fa-solid fa-plus mr-2 text-indigo-400"></i> New Project
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-grow flex flex-col relative h-full">
        <header className="h-14 flex items-center justify-between px-6 z-30 border-b border-slate-800/20 bg-[#070b14]/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-9 h-9 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-300">
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            {hasHistory && (
              <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
                 <button onClick={() => setViewMode('chat')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${viewMode === 'chat' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                    CHAT
                 </button>
                 {isCollaborationActive && (
                    <button onClick={() => setViewMode('canvas')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${viewMode === 'canvas' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                        CANVAS
                    </button>
                 )}
                 <button onClick={() => setViewMode('gallery')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${viewMode === 'gallery' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                    GALLERY
                 </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{session.currentMode}</span>
             </div>
             <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:border-indigo-500/50 transition-all">
                <i className="fa-solid fa-user-astronaut"></i>
             </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-grow overflow-hidden relative">
          {!hasHistory ? (
            <div className="h-full flex flex-col items-center justify-center px-4 -mt-10">
              <div className="text-center animate-fade-in">
                <div className="mb-8 w-24 h-24 rounded-[2rem] creative-gradient flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto transform rotate-6 hover:rotate-0 transition-transform duration-500">
                   <i className="fa-solid fa-wand-sparkles text-4xl text-white"></i>
                </div>
                <h2 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter">
                  <span className="text-gradient">MOVA STUDIO</span>
                </h2>
                <p className="text-slate-500 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
                  The world's most advanced AI creative partner for scripts, stories, and visuals.
                </p>
                <div className="mt-12 flex flex-wrap justify-center gap-4">
                    <button onClick={() => switchMode(CreativeMode.SCRIPT)} className="px-6 py-3 bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center gap-3">
                        <i className="fa-solid fa-clapperboard text-orange-400"></i>
                        <span className="font-bold text-sm">Start a Script</span>
                    </button>
                    <button onClick={() => switchMode(CreativeMode.STORY)} className="px-6 py-3 bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center gap-3">
                        <i className="fa-solid fa-feather text-blue-400"></i>
                        <span className="font-bold text-sm">Draft a Story</span>
                    </button>
                </div>
              </div>
            </div>
          ) : viewMode === 'canvas' && isCollaborationActive ? (
            <CreativeCanvas 
                content={session.canvasContent} 
                mode={session.currentMode} 
                onUpdate={(content) => setSession(s => ({ ...s, canvasContent: content }))}
                onAction={handleCanvasAction}
                isStreaming={isLoading}
            />
          ) : viewMode === 'gallery' ? (
            <div className="p-8 max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {session.messages.filter(m => m.imageUrl).map((asset) => (
                        <div key={asset.id} className="group relative aspect-square bg-[#0a0d17] rounded-3xl overflow-hidden border border-slate-800/50 shadow-2xl transition-all duration-500">
                            <img src={asset.imageUrl} alt="Generated Asset" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                                <button onClick={() => handleRefineAction(asset.imageUrl!)} className="w-full py-3 bg-white text-black rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-indigo-500 hover:text-white transition-all">
                                    REFINE ASSET
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 max-w-4xl mx-auto pb-40">
              {session.messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} onRefine={handleRefineAction} />
              ))}
              {isLoading && (
                <div className="flex gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700/50">
                    <i className="fa-solid fa-circle-notch fa-spin text-indigo-400 text-xs"></i>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#070b14] via-[#070b14] to-transparent pt-12 pb-6 px-4 z-40">
           <div className="max-w-4xl mx-auto">
             <ChatInput 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading} 
              currentMode={session.currentMode} 
              externalAttachment={pendingRefinement}
              onClearAttachment={() => setPendingRefinement(null)}
            />
           </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
