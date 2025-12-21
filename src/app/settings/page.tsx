'use client';

import { useState, useEffect } from 'react';
import { useModels } from '@/contexts/ModelsContext';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

type Category = 'chat' | 'vision' | 'generate' | 'edit';

const categories: { key: Category; label: string; description: string; icon: JSX.Element }[] = [
  {
    key: 'chat',
    label: 'Chat',
    description: 'Modelos para conversaciones de texto',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    key: 'vision',
    label: 'Vision',
    description: 'Modelos que pueden analizar imágenes',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    key: 'generate',
    label: 'Generar',
    description: 'Modelos para generar imágenes',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    key: 'edit',
    label: 'Editar',
    description: 'Modelos para editar imágenes',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const { selectedModels, setSelectedModels } = useModels();
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('chat');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.data) {
        setAllModels(data.data);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredModels = () => {
    let filtered = allModels;

    // Filter by category capabilities
    if (activeCategory === 'vision') {
      filtered = filtered.filter(m =>
        m.architecture?.input_modalities?.includes('image') ||
        m.id.includes('vision') ||
        m.id.includes('gpt-4o') ||
        m.id.includes('claude-3') ||
        m.id.includes('gemini')
      );
    } else if (activeCategory === 'generate' || activeCategory === 'edit') {
      filtered = filtered.filter(m =>
        m.architecture?.output_modalities?.includes('image') ||
        m.id.includes('dall-e') ||
        m.id.includes('flux') ||
        m.id.includes('stable-diffusion') ||
        m.id.includes('midjourney') ||
        m.id.includes('imagen')
      );
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(m =>
        m.id.toLowerCase().includes(searchLower) ||
        m.name.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const toggleModel = (modelId: string) => {
    const current = selectedModels[activeCategory];
    if (current.includes(modelId)) {
      setSelectedModels(activeCategory, current.filter(id => id !== modelId));
    } else {
      setSelectedModels(activeCategory, [...current, modelId]);
    }
  };

  const isSelected = (modelId: string) => {
    return selectedModels[activeCategory].includes(modelId);
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num === 0) return 'Gratis';
    if (num < 0.001) return `$${(num * 1000000).toFixed(2)}/M`;
    return `$${num.toFixed(4)}`;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Configuración de Modelos
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Selecciona los modelos que quieres usar en cada sección
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeCategory === cat.key
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {cat.icon}
            {cat.label}
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              activeCategory === cat.key
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {selectedModels[cat.key].length}
            </span>
          </button>
        ))}
      </div>

      {/* Selected Models for Current Category */}
      {selectedModels[activeCategory].length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-3">
            Modelos seleccionados para {categories.find(c => c.key === activeCategory)?.label}
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedModels[activeCategory].map((modelId) => {
              const model = allModels.find(m => m.id === modelId);
              return (
                <span
                  key={modelId}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg text-sm border border-purple-200 dark:border-purple-700"
                >
                  <span className="text-gray-900 dark:text-white">{model?.name || modelId}</span>
                  <button
                    onClick={() => toggleModel(modelId)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar modelos..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getFilteredModels().map((model) => (
            <div
              key={model.id}
              onClick={() => toggleModel(model.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected(model.id)
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {model.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {model.id}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${
                  isSelected(model.id)
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected(model.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatPrice(model.pricing.prompt)}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  {(model.context_length / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && getFilteredModels().length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No se encontraron modelos
        </div>
      )}
    </div>
  );
}
