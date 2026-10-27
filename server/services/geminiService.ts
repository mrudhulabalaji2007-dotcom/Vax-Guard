import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

export interface GeminiChatOptions {
  messages: ChatMessage[];
  systemInstruction?: string;
  model?: string;
  enableSearchGrounding?: boolean;
  enableMapsGrounding?: boolean;
  contextData?: any;
}

export async function processGeminiChat(options: GeminiChatOptions): Promise<{
  reply: string;
  groundingMetadata?: any;
  modelUsed: string;
}> {
  const {
    messages,
    systemInstruction = 'You are the VAXGUARD AI Cold-Chain Intelligence Assistant. You assist healthcare administrators, logistics officers, and warehouse managers in monitoring vaccine integrity, predicting thermal risks, assessing route hazards, and guiding emergency refrigeration protocols according to WHO standards.',
    model = 'gemini-3.5-flash',
    enableSearchGrounding = true,
    enableMapsGrounding = false,
    contextData,
  } = options;

  if (!apiKey) {
    return {
      reply: '⚠️ Gemini API Key not configured in environment. Please ensure GEMINI_API_KEY is available in Secrets.',
      modelUsed: model,
    };
  }

  // Format contents for @google/genai
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: [{ text: m.content }],
  }));

  // If contextData is passed, append it to the system instruction or initial prompt
  let effectiveInstruction = systemInstruction;
  if (contextData) {
    effectiveInstruction += `\n\nCURRENT VAXGUARD REAL-TIME TELEMETRY CONTEXT:\n${JSON.stringify(contextData, null, 2)}`;
  }

  const tools: any[] = [];
  if (enableMapsGrounding) {
    tools.push({ googleMaps: {} });
  } else if (enableSearchGrounding) {
    tools.push({ googleSearch: {} });
  }

  const config: any = {
    systemInstruction: effectiveInstruction,
  };

  if (tools.length > 0) {
    config.tools = tools;
  }

  try {
    const selectedModel = model || 'gemini-3.5-flash';
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: contents as any,
      config,
    });

    const replyText = response.text || 'No response generated.';
    const groundingMetadata = (response.candidates as any)?.[0]?.groundingMetadata;

    return {
      reply: replyText,
      groundingMetadata,
      modelUsed: selectedModel,
    };
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    // Fallback if tools or specific model hit an error
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents as any,
        config: { systemInstruction: effectiveInstruction },
      });
      return {
        reply: fallbackResponse.text || 'Fallback response generated.',
        modelUsed: 'gemini-3.5-flash (fallback)',
      };
    } catch (fallbackErr: any) {
      throw new Error(error.message || 'Gemini Generation Failed');
    }
  }
}
