
export enum CreativeMode {
  GENERAL = 'GENERAL',
  SONG = 'SONG',
  SCRIPT = 'SCRIPT',
  STORY = 'STORY',
  IMAGE_PROMPT = 'IMAGE_PROMPT',
  QA = 'QA'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: CreativeMode;
  timestamp: Date;
  imageUrl?: string;
  attachmentUrl?: string; // For user uploaded images
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  currentMode: CreativeMode;
}
