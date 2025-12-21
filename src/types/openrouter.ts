export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ChatRequest {
  messages: Message[];
  model?: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
}

export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export interface ImageGenerationResponse {
  data: {
    url?: string;
    b64_json?: string;
  }[];
}

export type ModalityType = 'chat' | 'vision' | 'image-generation';
