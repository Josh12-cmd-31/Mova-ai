import React, { useState, useEffect, useRef } from 'react';
import { CreativeMode, Message, ChatSession } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Login from './components/Login';
import { streamMovaContent, generateMovaImage } from './services/geminiService';
import { auth, logout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

const MOVA_WELCOME_GREETING = "Hello, I'm MOVA.";
const MOVA_SUB_GREETING = "How may I help you?";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<ChatSession>({
    id: uuidv4(),
    title: 'New Creative Session',
    messages: [],
    currentMode: CreativeMode.GENERAL
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'canvas'>('chat');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.messages]);

  const handleSendMessage = async (text: string, attachment?: { data: string, type: string }) => {
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: text,
      mode: session.currentMode,
      timestamp: new Date(),
      attachmentUrl: attachment?.data
    };

    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }));
    setIsLoading(true);

    try {
      if (session.currentMode === CreativeMode.IMAGE_PROMPT || attachment) {
        const result = await generateMovaImage(text || "Create a stunning visual masterpiece based on the current context.", attachment?.data, attachment?.type);
        
        setSession(prev => ({
          ...prev,
          messages: [...prev.messages, {
            id: uuidv4(),
            role: 'assistant',
            content: result.textContent || "Your creative vision has been realized.",
            imageUrl: result.imageUrl,
            mode: session.currentMode,
            timestamp: new Date()
          }]
        }));
      } else {
        const history = session.messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const stream = await streamMovaContent(text, session.currentMode, history);
        
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
          setSession(prev => ({
            ...prev,
            messages: prev.messages.map(m => 
              m.id === assistantId ? { ...m, content: assistantContent } : m
            )
          }));
        }
      }
    } catch (error: any) {
      console.error('Error calling Gemini:', error);
      setSession(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: uuidv4(),
          role: 'assistant',
          content: `I hit a snag: ${error.message || 'Please try again.'}`,
          mode: session.currentMode,
          timestamp: new Date()
        }]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (mode: CreativeMode) => {
    setSession(prev => ({ ...prev, currentMode: mode }));
    setIsSidebarOpen(false);
    setViewMode('chat');
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

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#070b14]">
        <div className="w-12 h-12 rounded-xl creative-gradient animate-spin flex items-center justify-center">
          <div className="w-8 h-8 bg-[#070b14] rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const hasHistory = session.messages.length > 0;
  const generatedAssets = session.messages.filter(m => m.imageUrl);

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-200 overflow-hidden">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
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
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Creative Studio</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 flex-grow overflow-y-auto pr-1">
            <h2 className="px-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Capabilities</h2>
            <ModeButton mode={CreativeMode.GENERAL} icon="fa-compass" label="Explore" description="Universal creative assistant" />
            <ModeButton mode={CreativeMode.IMAGE_PROMPT} icon="fa-wand-magic-sparkles" label="Image Studio" description="High-impact text-to-image" />
            <ModeButton mode={CreativeMode.SONG} icon="fa-music" label="Songwriting" description="Lyrics & performance cues" />
            <ModeButton mode={CreativeMode.SCRIPT} icon="fa-film" label="Script Mode" description="TikTok, Reels & Cinema" />
            <ModeButton mode={CreativeMode.STORY} icon="fa-book-open" label="Storyteller" description="Deep emotional narratives" />
            <ModeButton mode={CreativeMode.QA} icon="fa-lightbulb" label="Analytical" description="Business & Education logic" />
          </div>

          <div className="mt-auto pt-6 border-t border-slate-800/50">
            <button 
              onClick={() => {
                setSession({ id: uuidv4(), title: 'New Creative Session', messages: [], currentMode: CreativeMode.GENERAL });
                setIsSidebarOpen(false);
                setViewMode('chat');
              }}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all mb-4 border border-slate-700/50"
            >
              <i className="fa-solid fa-plus mr-2 text-indigo-400"></i> Reset Session
            </button>
            <div className="p-3 rounded-2xl bg-indigo-600/5 border border-indigo-500/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Engine Online</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-grow flex flex-col relative h-full">
        <header className="h-14 flex items-center justify-between px-6 z-30 border-b border-slate-800/20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-300 hover:bg-slate-800 transition-all"
            >
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            {hasHistory && (
              <div className="flex items-center gap-2">
                 <button 
                  onClick={() => setViewMode('chat')}
                  className={`text-xs font-bold uppercase tracking-tighter px-3 py-1.5 rounded-lg transition-all ${viewMode === 'chat' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                    Chat
                 </button>
                 <button 
                  onClick={() => setViewMode('canvas')}
                  className={`text-xs font-bold uppercase tracking-tighter px-3 py-1.5 rounded-lg transition-all ${viewMode === 'canvas' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                    Gallery
                 </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 relative">
             <div className="hidden sm:flex px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{session.currentMode}</span>
             </div>
             <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/50 overflow-hidden hover:border-indigo-500/50 transition-all"
             >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <i className="fa-solid fa-user text-xs text-slate-400"></i>
                )}
             </button>

             {isProfileMenuOpen && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                 <div className="absolute top-12 right-0 w-48 glass-panel border border-slate-800/50 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-slate-800/50 mb-1">
                      <p className="text-xs font-bold text-white truncate">{user.displayName || 'Creator'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                    </div>
                    <button 
                      onClick={() => logout()}
                      className="w-full p-3 rounded-xl flex items-center gap-3 text-red-400 hover:bg-red-400/10 transition-all text-xs font-bold uppercase tracking-widest"
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                    </button>
                 </div>
               </>
             )}
          </div>
        </header>

        <div 
          ref={scrollRef}
          className="flex-grow overflow-y-auto"
        >
          {!hasHistory ? (
            <div className="h-full flex flex-col items-center justify-center px-4 md:px-8 max-w-4xl mx-auto -mt-10 animate-in fade-in duration-1000">
              <div className="text-center">
                <div className="mb-8 w-20 h-20 rounded-3xl creative-gradient flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto transform rotate-12">
                   <i className="fa-solid fa-bolt-lightning text-3xl text-white"></i>
                </div>
                <h2 className="text-4xl md:text-6xl font-bold mb-3 tracking-tight">
                  <span className="text-gradient drop-shadow-sm">{MOVA_WELCOME_GREETING}</span>
                </h2>
                <h3 className="text-2xl md:text-4xl font-medium text-slate-500/80 tracking-tight">
                  {MOVA_SUB_GREETING}
                </h3>
                <p className="mt-8 text-slate-500 text-sm max-w-md mx-auto leading-relaxed font-medium">
                  Select a mode from the sidebar to start generating songs, scripts, stories, or stunning AI imagery.
                </p>
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                   <button onClick={() => switchMode(CreativeMode.IMAGE_PROMPT)} className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-800 transition-all text-left">
                      <i className="fa-solid fa-image text-indigo-400 mb-2"></i>
                      <div className="font-bold text-sm">Generate Images</div>
                      <div className="text-[10px] text-slate-500 uppercase">Text to visual masterpiece</div>
                   </button>
                   <button onClick={() => switchMode(CreativeMode.SONG)} className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-800 transition-all text-left">
                      <i className="fa-solid fa-music text-purple-400 mb-2"></i>
                      <div className="font-bold text-sm">Write a Song</div>
                      <div className="text-[10px] text-slate-500 uppercase">Lyrics, mood & style</div>
                   </button>
                </div>
              </div>
            </div>
          ) : viewMode === 'canvas' ? (
            <div className="p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">Creative Gallery</h2>
                  <p className="text-slate-500 text-sm">All assets generated in this session</p>
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
                  {generatedAssets.length} Productions
                </div>
              </div>

              {generatedAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-6">
                    <i className="fa-solid fa-wand-sparkles text-2xl text-slate-600"></i>
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No visual assets detected</p>
                  <button onClick={() => switchMode(CreativeMode.IMAGE_PROMPT)} className="mt-4 px-6 py-2 bg-indigo-600/20 text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/20 hover:bg-indigo-600/30 transition-all">
                    Start Image Studio
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {generatedAssets.map((asset) => (
                    <div key={asset.id} className="group relative aspect-square bg-[#0a0d17] rounded-3xl overflow-hidden border border-slate-800/50 shadow-2xl hover:scale-[1.03] transition-all duration-500">
                      <img src={asset.imageUrl} alt="Generated Content" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                        <p className="text-xs text-slate-300 font-medium line-clamp-2 mb-4 drop-shadow-lg">{asset.content}</p>
                        <div className="flex gap-2">
                          <a href={asset.imageUrl} download={`mova-gen-${asset.id}.png`} className="flex-grow py-2.5 bg-white text-black rounded-xl flex items-center justify-center font-bold text-xs hover:bg-indigo-500 hover:text-white transition-all">
                            <i className="fa-solid fa-download mr-2"></i> Save
                          </a>
                          <button onClick={() => { setViewMode('chat'); handleSendMessage(`Refine this visual: ${asset.content}`, { data: asset.imageUrl!, type: 'image/png' }); }} className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl flex items-center justify-center text-white hover:bg-indigo-600 transition-all">
                            <i className="fa-solid fa-wand-magic-sparkles text-sm"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-40">
              {session.messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && session.messages[session.messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4 animate-pulse mb-10">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700/50">
                    <i className="fa-solid fa-circle-notch fa-spin text-indigo-400 text-xs"></i>
                  </div>
                  <div className="flex-grow max-w-[180px] bg-slate-800/30 h-12 rounded-2xl rounded-tl-none border border-slate-800/50 flex items-center px-4">
                     <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce delay-150"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce delay-300"></div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#070b14] via-[#070b14] to-transparent pt-12 pb-2 px-4 pointer-events-none">
           <div className="pointer-events-auto">
             <ChatInput 
              onSendMessage={(text, att) => handleSendMessage(text, att)} 
              isLoading={isLoading} 
              currentMode={session.currentMode} 
            />
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;