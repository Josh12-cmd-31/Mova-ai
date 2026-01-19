
import React, { useState, useEffect, useRef } from 'react';
import { CreativeMode } from '../types';

interface CreativeCanvasProps {
  content: string;
  mode: CreativeMode;
  onUpdate: (newContent: string) => void;
  onAction: (action: string, selectedText: string) => void;
  isStreaming: boolean;
}

const CreativeCanvas: React.FC<CreativeCanvasProps> = ({ content, mode, onUpdate, onAction, isStreaming }) => {
  const [localContent, setLocalContent] = useState(content);
  const [selection, setSelection] = useState({ start: 0, end: 0, text: '' });
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (content !== localContent) {
      setLocalContent(content);
    }
  }, [content]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalContent(newVal);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onUpdate(newVal);
    }, 500);
  };

  const handleSelection = () => {
    if (editorRef.current) {
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      const text = editorRef.current.value.substring(start, end);
      if (text.length > 3) {
        setSelection({ start, end, text });
      } else {
        setSelection({ start: 0, end: 0, text: '' });
      }
    }
  };

  const isScript = mode === CreativeMode.SCRIPT;

  return (
    <div className="h-full flex flex-col bg-[#0b0f1a] animate-fade-in">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/50 bg-[#0f121d]">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isScript ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
            <i className={`fa-solid ${isScript ? 'fa-film' : 'fa-book'}`}></i>
          </div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
            {isScript ? 'Script Editor' : 'Story Canvas'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {selection.text && (
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-right-2">
              <button 
                onClick={() => onAction('REWRITE', selection.text)}
                className="px-2 py-1 text-[10px] font-bold text-indigo-400 hover:bg-indigo-400/10 rounded transition-all"
              >
                REWRITE
              </button>
              <button 
                onClick={() => onAction('EXPAND', selection.text)}
                className="px-2 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-400/10 rounded transition-all"
              >
                EXPAND
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50 ml-2">
            <button 
              onClick={() => onAction('CRITIQUE', localContent)}
              disabled={!localContent.trim() || isStreaming}
              className="px-4 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
            >
              <i className="fa-solid fa-comment-medical mr-2"></i> CRITIQUE
            </button>
            <button 
              onClick={() => onAction('CONTINUE', localContent)}
              disabled={isStreaming}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-30"
            >
              <i className="fa-solid fa-wand-sparkles mr-2"></i> CONTINUE
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow relative p-8 md:p-12 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto h-full">
          {isStreaming && (
            <div className="absolute top-8 right-12 flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full animate-pulse z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">MOVA is thinking...</span>
            </div>
          )}
          
          <textarea
            ref={editorRef}
            value={localContent}
            onChange={handleTextChange}
            onMouseUp={handleSelection}
            onKeyUp={handleSelection}
            placeholder={isScript ? "INT. STUDIO - DAY\n\nThe AI begins to write..." : "Once upon a time in a digital landscape..."}
            className={`w-full h-full bg-transparent border-none focus:ring-0 text-slate-200 resize-none leading-relaxed text-lg ${
              isScript ? 'font-mono' : 'font-serif italic'
            }`}
            style={{ minHeight: '80vh' }}
          />
        </div>
      </div>
    </div>
  );
};

export default CreativeCanvas;