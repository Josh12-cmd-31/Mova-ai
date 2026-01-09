
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
  attachmentUrl?: string;
  isDocumentUpdate?: boolean; // Flag to indicate if this message updated the canvas
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  currentMode: CreativeMode;
  canvasContent: string; // The shared document state
}
