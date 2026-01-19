import React, { useState, useEffect, useRef } from 'react';
import { CreativeMode, Message, ChatSession } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import CreativeCanvas from './components/CreativeCanvas';
import Login from './components/Login';
import { streamMovaContent, generateMovaImage } from './services/geminiService';
import { auth, db, logout as firebaseLogout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, collection, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { GenerateContentResponse } from "@google/genai";

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    Canva: any;
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [session, setSession] = useState<ChatSession>({
    id: uuidv4(),
    title: 'New Creative Session',
    messages: [],
    currentMode: CreativeMode.GENERAL,
    canvasContent: ''
  });
  const [savedSessions, setSavedSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'canvas' | 'gallery'>('chat');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [pendingRefinement, setPendingRefinement] = useState<{ data: string, type: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('idle');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvaApiRef = useRef<any>(null);
  const skipNextSyncRef = useRef(false);

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Collaboration Listener
  useEffect(() => {
    if (!user || !session.id) return;

    const sessionDocRef = doc(db, 'sessions', session.id);
    
    const unsubscribe = onSnapshot(sessionDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as any;
        
        // Convert timestamp strings back to Dates if necessary
        const remoteMessages = (data.messages || []).map((m: any) => ({
          ...m,
          timestamp: m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp)
        }));

        setSession(prev => {
          // Check if we should ignore this update (if we just pushed it)
          if (skipNextSyncRef.current) {
            skipNextSyncRef.current = false;
            return prev;
          }
          
          return {
            ...prev,
            title: data.title || prev.title,
            currentMode: data.currentMode || prev.currentMode,
            canvasContent: data.canvasContent ?? prev.canvasContent,
            messages: remoteMessages
          };
        });
        setSyncStatus('synced');
      } else {
        // If doc doesn't exist yet, we initialize it
        setDoc(sessionDocRef, {
          id: session.id,
          title: session.title,
          currentMode: session.currentMode,
          canvasContent: session.canvasContent,
          messages: [],
          createdAt: new Date(),
          ownerId: user.uid
        });
      }
    });

    return () => unsubscribe();
  }, [session.id, user]);

  // Push Canvas Updates to Firestore (Shared)
  const syncCanvasToCloud = async (newContent: string) => {
    if (!user || !session.id) return;
    setSyncStatus('syncing');
    try {
      const sessionDocRef = doc(db, 'sessions', session.id);
      skipNextSyncRef.current = true;
      await updateDoc(sessionDocRef, {
        canvasContent: newContent,
        lastModified: new Date()
      });
      setSyncStatus('synced');
    } catch (err) {
      console.error("Cloud Sync Error:", err);
      setSyncStatus('idle');
    }
  };

  // Check URL for shared session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('session');
    if (sharedId && user) {
      setSession(prev => ({ ...prev, id: sharedId }));
    }
  }, [user]);

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?session=${session.id}`;
    navigator.clipboard.writeText(url);
    alert("Collaboration link copied to clipboard! Share this with your team.");
  };

  const handleSendMessage = async (text: string, attachment?: { data: string, type: string }, quality: number = 2) => {
    if (!user) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: text || (attachment ? "Refine this image..." : ""),
      mode: session.currentMode,
      timestamp: new Date(),
      attachmentUrl: attachment?.data
    };
    
    // Optimistic local update
    const updatedMessages = [...session.messages, userMessage];
    setSession(prev => ({ ...prev, messages: updatedMessages }));
    
    // Sync user message to cloud
    const sessionDocRef = doc(db, 'sessions', session.id);
    await updateDoc(sessionDocRef, { messages: updatedMessages });

    setIsLoading(true);
    setPendingRefinement(null);

    try {
      if (session.currentMode === CreativeMode.IMAGE_PROMPT || attachment) {
        const result = await generateMovaImage(text || "Enhance visual.", attachment?.data, attachment?.type || 'image/png', quality);
        const assistantMsg: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: result.textContent || "Refinement complete.",
          imageUrl: result.imageUrl,
          mode: session.currentMode,
          timestamp: new Date()
        };
        const finalMessages = [...updatedMessages, assistantMsg];
        await updateDoc(sessionDocRef, { messages: finalMessages });
      } else {
        const history = updatedMessages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        
        const stream = await streamMovaContent(text, session.currentMode, history);
        const assistantId = uuidv4();
        let assistantContent = '';
        
        // Placeholder for streaming
        const streamingMessages = [...updatedMessages, {
          id: assistantId,
          role: 'assistant' as const,
          content: '',
          mode: session.currentMode,
          timestamp: new Date()
        }];
        setSession(prev => ({ ...prev, messages: streamingMessages }));

        for await (const chunk of stream) {
          const c = chunk as GenerateContentResponse;
          assistantContent += c.text;
          
          setSession(prev => {
            const newMsgs = prev.messages.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m);
            return { ...prev, messages: newMsgs };
          });
        }
        
        // Final sync of the complete assistant message
        const finalAssistantMsg: Message = {
          id: assistantId,
          role: 'assistant',
          content: assistantContent,
          mode: session.currentMode,
          timestamp: new Date()
        };
        await updateDoc(sessionDocRef, { messages: [...updatedMessages, finalAssistantMsg] });
      }
    } catch (error: any) {
      console.error('Error:', error);
      const errorMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        mode: session.currentMode,
        timestamp: new Date()
      };
      await updateDoc(sessionDocRef, { messages: [...updatedMessages, errorMsg] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCanvasAction = (action: string, context: string) => {
    let prompt = "";
    switch(action) {
        case 'REWRITE': prompt = `Rewrite this section dramatically: "${context}"`; break;
        case 'EXPAND': prompt = `Expand with more detail: "${context}"`; break;
        case 'CONTINUE': prompt = `Continue the composition.`; break;
    }
    handleSendMessage(prompt);
  };

  const handleRefineAction = (imageUrl: string) => {
    setPendingRefinement({ data: imageUrl, type: 'image/png' });
    setViewMode('chat');
  };

  const switchMode = async (mode: CreativeMode) => {
    setSession(prev => ({ ...prev, currentMode: mode }));
    setIsSidebarOpen(false);
    if (user) {
      await updateDoc(doc(db, 'sessions', session.id), { currentMode: mode });
    }
    if (mode === CreativeMode.SCRIPT || mode === CreativeMode.STORY) {
        setViewMode('canvas');
    } else {
        setViewMode('chat');
    }
  };

  const resetSession = () => {
    const newId = uuidv4();
    window.history.pushState({}, '', window.location.pathname);
    setSession({ id: newId, title: 'New Creative Session', messages: [], currentMode: CreativeMode.GENERAL, canvasContent: '' });
    setIsSidebarOpen(false);
    setViewMode('chat');
    setIsProfileMenuOpen(false);
    setPendingRefinement(null);
  };

  // Fix: Implemented handleLogout to resolve the error "Cannot find name handleLogout"
  const handleLogout = async () => {
    try {
      await firebaseLogout();
      resetSession();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#070b14]">
        <div className="mb-6 w-16 h-16 rounded-2xl creative-gradient flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-bounce">
          <i className="fa-solid fa-bolt-lightning text-2xl text-white"></i>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Initializing Mova Engine</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onGuestLogin={setUser} />;
  }

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
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Collab Studio</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 flex-grow overflow-y-auto pr-1 custom-scrollbar">
            <h2 className="px-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Workspace</h2>
            {[
              { m: CreativeMode.GENERAL, i: 'fa-compass', l: 'Brainstorm', d: 'Quick ideas' },
              { m: CreativeMode.IMAGE_PROMPT, i: 'fa-wand-magic-sparkles', l: 'Visuals', d: 'AI Images' },
              { m: CreativeMode.SCRIPT, i: 'fa-film', l: 'Scriptwriter', d: 'Collaborative' },
              { m: CreativeMode.STORY, i: 'fa-book-open', l: 'Novelist', d: 'Long-form' },
              { m: CreativeMode.SONG, i: 'fa-music', l: 'Songwriter', d: 'Lyrics' },
              { m: CreativeMode.QA, i: 'fa-lightbulb', l: 'Analytic', d: 'Logic' }
            ].map(({ m, i, l, d }) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all border ${
                  session.currentMode === m 
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-white' 
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${session.currentMode === m ? 'creative-gradient text-white' : 'bg-slate-700/50'}`}>
                  <i className={`fa-solid ${i} text-sm`}></i>
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-xs uppercase tracking-wider">{l}</h3>
                  <p className="text-[10px] opacity-60">{d}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-slate-800/50 space-y-3">
            <button 
              onClick={handleCopyShareLink}
              className="w-full py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-[10px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20"
            >
              <i className="fa-solid fa-share-nodes text-sm"></i> Share Session
            </button>
            <button onClick={resetSession} className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-[10px] tracking-[0.2em] uppercase transition-all border border-slate-700/50 flex items-center justify-center gap-3">
              <i className="fa-solid fa-plus text-sm text-indigo-400"></i> New Project
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
            <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
               <button onClick={() => setViewMode('chat')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${viewMode === 'chat' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>CHAT</button>
               {isCollaborationActive && <button onClick={() => setViewMode('canvas')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${viewMode === 'canvas' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>CANVAS</button>}
               <button onClick={() => setViewMode('gallery')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${viewMode === 'gallery' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>GALLERY</button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 relative">
             {syncStatus !== 'idle' && (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
                  <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{syncStatus === 'synced' ? 'Synced' : 'Saving...'}</span>
               </div>
             )}
             <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <i className="fa-solid fa-user-astronaut"></i>}
             </button>

             {isProfileMenuOpen && (
               <div className="absolute top-12 right-0 w-72 glass-panel border border-slate-800/50 rounded-2xl p-5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="mb-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Authenticated As</p>
                    <p className="text-sm font-bold text-white truncate">{user.displayName || 'Creator'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <div className="h-px bg-slate-800/50 mb-4"></div>
                  <button onClick={handleLogout} className="w-full py-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                    <i className="fa-solid fa-right-from-bracket"></i> Sign Out
                  </button>
               </div>
             )}
          </div>
        </header>

        <div ref={scrollRef} className="flex-grow overflow-hidden relative">
          {session.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4 -mt-10">
              <div className="text-center animate-fade-in">
                <div className="mb-8 w-24 h-24 rounded-[2rem] creative-gradient flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto transform rotate-6">
                   <i className="fa-solid fa-wand-sparkles text-4xl text-white"></i>
                </div>
                <h2 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter"><span className="text-gradient">MOVA STUDIO</span></h2>
                <p className="text-slate-500 text-lg font-medium">Start a real-time collaborative creative session.</p>
              </div>
            </div>
          ) : viewMode === 'canvas' && isCollaborationActive ? (
            <CreativeCanvas 
                content={session.canvasContent} 
                mode={session.currentMode} 
                onUpdate={syncCanvasToCloud}
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
                                <button onClick={() => handleRefineAction(asset.imageUrl!)} className="w-full py-3 bg-white text-black rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-indigo-500 hover:text-white transition-all">REFINE ASSET</button>
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
    </div>
  );
};

export default App;