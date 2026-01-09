
import { GoogleGenAI, Type } from "@google/genai";
import { CreativeMode } from "../types";

const SYSTEM_INSTRUCTIONS = `
Role: You are MOVA AI, a creative and analytical intelligence designed to turn every user into a creator.
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

2. SCRIPT MODE: 
   - Provide: Scene breakdown, Dialogue, Camera direction, Emotional cues.

3. STORY MODE: 
   - Deliver: Strong hook, deep emotion, moral or lesson.

4. IMAGE PROMPT / IMAGE GEN MODE: 
   - You are a visual production master.
   - If a reference image is provided, you are in EDITING MODE. 
   - Your goal is to apply the user's requested modifications while STRICTLY maintaining the composition, character identity, and core features of the original image.
   - If no image is provided, you are in CREATION MODE. Generate a new visual based on the prompt.
   - Format: [Main character/subject] + [action/scene] + [modified elements] + [lighting/style] + [high quality tags].

5. Q&A MODE: 
   - Answer clearly, step-by-step with practical actions.

Current Mode: {{MODE}}
`;

export async function generateMovaContent(prompt: string, mode: CreativeMode, history: any[]) {
  // Create a fresh instance right before making an API call to ensure latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    // Fix: Pass history to maintain conversation context
    history: history,
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS.replace('{{MODE}}', mode),
    },
  });

  const result = await chat.sendMessage({ message: prompt });
  return result.text;
}

export async function streamMovaContent(prompt: string, mode: CreativeMode, history: any[]) {
  // Create a fresh instance right before making an API call to ensure latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    // Fix: Pass history to maintain conversation context
    history: history,
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS.replace('{{MODE}}', mode),
    },
  });

  return await chat.sendMessageStream({ message: prompt });
}

export async function generateMovaImage(prompt: string, base64Image?: string, mimeType?: string, qualityLevel: number = 2) {
  // Create a fresh instance right before making an API call to ensure latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Quality Level Logic:
  // 1: Draft (Fast, Lower Detail)
  // 2: Standard (Balanced)
  // 3: Pro HD (Gemini 3 Pro 2K)
  // 4: Ultra 4K (Gemini 3 Pro 4K)
  
  const isHighQuality = qualityLevel >= 3;
  const modelName = isHighQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  let enhancedPrompt = prompt;
  if (qualityLevel === 1) {
    enhancedPrompt += ", rough sketch style, draft quality, simple lines";
  } else if (qualityLevel === 3) {
    enhancedPrompt += ", high definition, sharp focus, professional photography, 8k resolution, detailed textures";
  } else if (qualityLevel === 4) {
    enhancedPrompt += ", ultra-realistic masterpiece, cinematic lighting, photorealistic, intricate detail, ray tracing, unreal engine 5 style";
  }

  const parts: any[] = [{ text: enhancedPrompt }];
  
  if (base64Image && mimeType) {
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    parts.unshift({
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    });
  }

  const imageConfig: any = {
    aspectRatio: "1:1"
  };

  if (isHighQuality) {
    imageConfig.imageSize = qualityLevel === 4 ? "4K" : "2K";
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts: parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS.replace('{{MODE}}', 'IMAGE_PROMPT'),
      imageConfig: imageConfig
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
