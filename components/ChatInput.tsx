import React, { useState, useRef, useEffect } from 'react';
import { CreativeMode } from '../types';

interface ChatInputProps {
  onSendMessage: (text: string, attachment?: { data: string, type: string }) => void;
  isLoading: boolean;
  currentMode: CreativeMode;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, currentMode }) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{ data: string, type: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((text.trim() || attachment) && !isLoading) {
      onSendMessage(text.trim(), attachment || undefined);
      setText('');
      setAttachment(null);
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
        setAttachment({
          data: event.target?.result as string,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const getPlaceholder = () => {
    switch (currentMode) {
      case CreativeMode.SONG: return "Write a soulful afrobeat song about...";
      case CreativeMode.SCRIPT: return "Create a viral TikTok script for...";
      case CreativeMode.STORY: return "Tell a gripping mystery story set in...";
      case CreativeMode.IMAGE_PROMPT: return "Describe the image you want to generate...";
      case CreativeMode.QA: return "Ask a complex business or tech question...";
      default: return "Type your creative spark here...";
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full relative group">
      {attachment && (
        <div className="absolute bottom-full mb-4 left-0 animate-in slide-in-from-bottom-2 duration-300">
          <div className="relative inline-block">
            <img 
              src={attachment.data} 
              alt="Preview" 
              className="w-24 h-24 object-cover rounded-2xl border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20" 
            />
            <button 
              onClick={() => setAttachment(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-red-600 transition-colors"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}
      
      <div className="glass-panel rounded-[2rem] p-2 flex items-end gap-2 shadow-2xl border-slate-700/50 focus-within:border-indigo-500/50 transition-all">
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
          disabled={(!text.trim() && !attachment) || isLoading}
          className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full transition-all mb-0.5 ${
            (text.trim() || attachment) && !isLoading
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
      
      <div className="flex justify-center mt-3 gap-4">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          MOVA AI Pro Engine
        </p>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          Powered by Gemini 3
        </p>
      </div>
    </div>
  );
};

export default ChatInput;