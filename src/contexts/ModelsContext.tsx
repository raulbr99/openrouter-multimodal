'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ModelSelection {
  chat: string[];
  vision: string[];
  generate: string[];
  edit: string[];
}

interface ModelsContextType {
  selectedModels: ModelSelection;
  setSelectedModels: (category: keyof ModelSelection, models: string[]) => void;
  getModelsForCategory: (category: keyof ModelSelection) => string[];
}

const defaultModels: ModelSelection = {
  chat: [
    'openai/gpt-4o',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.1-405b-instruct',
  ],
  vision: [
    'openai/gpt-4o',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-pro-1.5',
  ],
  generate: [
    'openai/dall-e-3',
    'black-forest-labs/flux-1.1-pro',
  ],
  edit: [
    'openai/dall-e-3',
    'black-forest-labs/flux-1.1-pro',
  ],
};

const ModelsContext = createContext<ModelsContextType | undefined>(undefined);

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [selectedModels, setSelectedModelsState] = useState<ModelSelection>(defaultModels);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedModels');
    if (saved) {
      try {
        setSelectedModelsState(JSON.parse(saved));
      } catch {
        // Use defaults if parse fails
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('selectedModels', JSON.stringify(selectedModels));
    }
  }, [selectedModels, isLoaded]);

  const setSelectedModels = (category: keyof ModelSelection, models: string[]) => {
    setSelectedModelsState(prev => ({
      ...prev,
      [category]: models,
    }));
  };

  const getModelsForCategory = (category: keyof ModelSelection) => {
    return selectedModels[category];
  };

  return (
    <ModelsContext.Provider value={{ selectedModels, setSelectedModels, getModelsForCategory }}>
      {children}
    </ModelsContext.Provider>
  );
}

export function useModels() {
  const context = useContext(ModelsContext);
  if (!context) {
    throw new Error('useModels must be used within a ModelsProvider');
  }
  return context;
}
