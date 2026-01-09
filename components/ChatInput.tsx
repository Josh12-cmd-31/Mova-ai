
import React, { useState, useRef, useEffect } from 'react';
import { CreativeMode } from '../types';

interface ChatInputProps {
  onSendMessage: (text: string, attachment?: { data: string, type: string }, quality?: number) => void;
  isLoading: boolean;
  currentMode: CreativeMode;
  externalAttachment?: { data: string, type: string } | null;
  onClearAttachment?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  currentMode, 
  externalAttachment,
  onClearAttachment
}) => {
  const [text, setText] = useState('');
  const [quality, setQuality] = useState(2);
  const [internalAttachment, setInternalAttachment] = useState<{ data: string, type: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal state with external prop
  useEffect(() => {
    if (externalAttachment) {
      setInternalAttachment(externalAttachment);
      textareaRef.current?.focus();
    }
  }, [externalAttachment]);

  const handleSend = () => {
    if ((text.trim() || internalAttachment) && !isLoading) {
      onSendMessage(text.trim(), internalAttachment || undefined, quality);
      setText('');
      setInternalAttachment(null);
      onClearAttachment?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInternalAttachment({
          data: event.target?.result as string,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const clearAttachment = () => {
    setInternalAttachment(null);
    onClearAttachment?.();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const getPlaceholder = () => {
    if (internalAttachment) return "Describe the changes you want to make to this image...";
    switch (currentMode) {
      case CreativeMode.SONG: return "Write a soulful afrobeat song about...";
      case CreativeMode.SCRIPT: return "Create a viral TikTok script for...";
      case CreativeMode.STORY: return "Tell a gripping mystery story set in...";
      case CreativeMode.IMAGE_PROMPT: return "Describe the image you want to generate...";
      case CreativeMode.QA: return "Ask a complex business or tech question...";
      default: return "Type your creative spark here...";
    }
  };

  const getQualityLabel = (val: number) => {
    switch(val) {
      case 1: return 'Draft';
      case 2: return 'Standard';
      case 3: return 'Pro HD';
      case 4: return 'Ultra 4K';
      default: return 'Standard';
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full relative group">
      {internalAttachment && (
        <div className="absolute bottom-full mb-4 left-0 animate-in slide-in-from-bottom-2 duration-300">
          <div className="relative inline-block">
            <img 
              src={internalAttachment.data} 
              alt="Preview" 
              className="w-24 h-24 object-cover rounded-2xl border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20" 
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-[8px] font-black text-white px-2 py-0.5 rounded-full whitespace-nowrap uppercase tracking-widest shadow-lg">
              Editing Mode
            </div>
            <button 
              onClick={clearAttachment}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-red-600 transition-colors"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}
      
      <div className="glass-panel rounded-[2rem] p-2 flex flex-col shadow-2xl border-slate-700/50 focus-within:border-indigo-500/50 transition-all">
        {currentMode === CreativeMode.IMAGE_PROMPT && (
          <div className="px-4 py-2 flex items-center gap-4 border-b border-slate-800/30 mb-1">
             <div className="flex items-center gap-2">
               <i className="fa-solid fa-sliders text-[10px] text-slate-500"></i>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detail Fidelity</span>
             </div>
             <div className="flex-grow flex items-center gap-3">
               <input 
                 type="range" 
                 min="1" 
                 max="4" 
                 step="1" 
                 value={quality} 
                 onChange={(e) => setQuality(parseInt(e.target.value))}
                 className="flex-grow h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
               />
               <span className="min-w-[70px] text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] text-right">
                 {getQualityLabel(quality)}
               </span>
             </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all mb-0.5"
            title="Attach image for reference"
          >
            <i className="fa-solid fa-paperclip text-lg"></i>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            rows={1}
            className="flex-grow bg-transparent border-none focus:ring-0 text-slate-200 placeholder:text-slate-500 py-3.5 resize-none text-[15px] font-medium leading-relaxed"
          />
          
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !internalAttachment) || isLoading}
            className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full transition-all mb-0.5 ${
              (text.trim() || internalAttachment) && !isLoading
                ? 'creative-gradient text-white shadow-lg shadow-indigo-500/40 hover:scale-105 active:scale-95'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fa-solid fa-arrow-up text-lg"></i>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
