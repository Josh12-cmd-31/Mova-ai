import React from 'react';
import { Message, CreativeMode } from '../types';

interface ChatMessageProps {
  message: Message;
  onRefine?: (imageUrl: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRefine }) => {
  const isAI = message.role === 'assistant';

  const formatContent = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('* ') || /^\d+\.\s/.test(line.trim());
      
      return (
        <div key={i} className={`${isListItem ? 'ml-4' : 'mb-2'} last:mb-0`}>
          {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-bold text-indigo-300">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </div>
      );
    });
  };

  const getIcon = () => {
    switch (message.mode) {
      case CreativeMode.SONG: return 'fa-music';
      case CreativeMode.SCRIPT: return 'fa-film';
      case CreativeMode.STORY: return 'fa-book-open';
      case CreativeMode.IMAGE_PROMPT: return 'fa-wand-magic-sparkles';
      case CreativeMode.QA: return 'fa-lightbulb';
      default: return 'fa-robot';
    }
  };

  return (
    <div className={`flex w-full mb-8 ${isAI ? 'justify-start' : 'justify-end animate-in slide-in-from-right-4'}`}>
      <div className={`max-w-[85%] md:max-w-[75%] flex gap-4 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border ${
          isAI ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-slate-800 border-slate-700'
        }`}>
          <i className={`fa-solid ${isAI ? getIcon() : 'fa-user'} ${isAI ? 'text-indigo-400' : 'text-slate-400'} text-xs`}></i>
        </div>
        
        <div className={`flex flex-col ${isAI ? 'items-start' : 'items-end'} w-full`}>
          {message.attachmentUrl && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-slate-800 shadow-xl max-w-sm group relative">
              <img src={message.attachmentUrl} alt="Attached" className="w-full h-auto block" />
              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-widest">Source Asset</div>
            </div>
          )}

          <div className={`w-full p-4 rounded-3xl leading-relaxed ${
            isAI 
              ? 'text-slate-200 bg-[#161b2c] border border-slate-800/50' 
              : 'bg-slate-900/50 border border-slate-800 text-slate-300 rounded-tr-none'
          }`}>
            {message.imageUrl && (
              <div className="mb-4 bg-slate-950 p-2 rounded-2xl border border-slate-800/50 shadow-inner group relative">
                <img src={message.imageUrl} alt="Generated AI content" className="w-full h-auto rounded-xl shadow-2xl block" />
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={message.imageUrl} download="mova-creative.png" className="w-10 h-10 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-indigo-600 transition-all">
                    <i className="fa-solid fa-download"></i>
                  </a>
                  <button 
                    onClick={() => onRefine?.(message.imageUrl!)}
                    className="w-10 h-10 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-indigo-500 transition-all"
                    title="Edit/Refine Image"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              {formatContent(message.content)}
            </div>
          </div>
          <span className="text-[10px] text-slate-600 mt-2 uppercase font-bold tracking-widest px-2">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;