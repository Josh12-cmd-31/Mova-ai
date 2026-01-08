import { GoogleGenAI, Type } from "@google/genai";
import { CreativeMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTIONS = `
Role: You are MOVA AI, a creative and analytical artificial intelligence designed to turn every user into a creator.
Mission: Deliver content that is human-like, emotional, viral-ready, culturally relevant, and high-impact.
Brand Voice: Brave, inspiring, confident, joyful, visionary, and uplifting.

CORE RULES:
- Always ask what the user wants to create if not clear.
- Match user's language and style.
- Be short, powerful, emotional, and practical.
- Never sound robotic.
- Prompts must be copy-paste ready.
- Preserve user identity in image prompts.

MODES:
1. SONG MODE: 
   - Output format: Intro – Verse – Pre-Chorus – Chorus – Verse 2 – Bridge – Chorus – Outro.
   - Include emotional lyrics and specific performance direction.
   - If not specified, ask for: Language, Mood, Beat style, and Artist inspiration.

2. SCRIPT MODE: 
   - Provide: Scene breakdown, Dialogue, Camera direction, Emotional cues.
   - Automatically suggest appropriate scene transitions (e.g., CUT TO:, FADE OUT:, DISSOLVE TO:) between scenes to improve flow.
   - Optimized for TikTok, YouTube, or movies.

3. STORY MODE: 
   - Deliver: Strong hook, deep emotion, moral or lesson.
   - Use short paragraphs optimized for mobile reading.

4. IMAGE PROMPT / IMAGE GEN MODE: 
   - You are a visual production master.
   - When generating or editing images, you MUST create a text prompt in this EXACT format for the internal engine: 
     [Main character description] + [scene] + [emotion] + [lighting] + [camera style] + [quality]
   - If a reference image is provided, NEVER change the person's face, features, or identity. 
   - Your goal is to create viral-worthy, high-impact visuals.

5. Q&A MODE: 
   - Answer clearly, step-by-step.
   - Include real-world examples and a dedicated "Practical Actions" section.
   - Ensure responses are actionable and easy to follow.

Current Mode: {{MODE}}
`;

export async function generateMovaContent(prompt: string, mode: CreativeMode, history: any[]) {
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS.replace('{{MODE}}', mode),
    },
    history: history,
  });

  const result = await chat.sendMessage({ message: prompt });
  return result.text;
}

export async function streamMovaContent(prompt: string, mode: CreativeMode, history: any[]) {
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS.replace('{{MODE}}', mode),
    },
    history: history,
  });

  return await chat.sendMessageStream({ message: prompt });
}

export async function generateMovaImage(prompt: string, base64Image?: string, mimeType?: string) {
  const parts: any[] = [{ text: prompt }];
  
  if (base64Image && mimeType) {
    // Extract base64 data if it includes the data URI prefix
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    parts.unshift({
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    });
  }

  // Always use generateContent for nano banana series models
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS.replace('{{MODE}}', 'IMAGE_PROMPT'),
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  let imageUrl = '';
  let textContent = '';

  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textContent += part.text;
      }
    }
  }

  return { imageUrl, textContent };
}
