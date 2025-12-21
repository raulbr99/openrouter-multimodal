'use client';

import { useState, useRef } from 'react';

const IMAGE_MODELS = [
  { id: 'google/gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image' },
  { id: 'google/gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image' },
  { id: 'openai/gpt-5-image', name: 'GPT-5 Image' },
  { id: 'openai/gpt-5-image-mini', name: 'GPT-5 Image Mini' },
  { id: 'black-forest-labs/flux.2-pro', name: 'FLUX 2 Pro' },
  { id: 'sourceful/riverflow-v2-max-preview', name: 'Riverflow V2 Max' },
];

type Mode = 'generate' | 'edit';

interface Props {
  defaultMode?: Mode;
}

export default function ImageGenerationComponent({ defaultMode }: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode || 'generate');
  const showModeSelector = !defaultMode;
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(IMAGE_MODELS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceImageBase64, setSourceImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSourceImage(result);
        const base64 = result.split(',')[1];
        setSourceImageBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSourceImage = () => {
    setSourceImage(null);
    setSourceImageBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateImage = async () => {
    if (!prompt.trim() || loading) return;
    if (mode === 'edit' && !sourceImageBase64) return;

    setLoading(true);
    setGeneratedImage(null);
    setError(null);

    try {
      const res = await fetch('/api/image-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          sourceImage: mode === 'edit' ? sourceImageBase64 : null,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      let imageUrl = '';
      if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url;
      } else if (data.data?.[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
      } else {
        throw new Error('No se recibió imagen en la respuesta');
      }

      setGeneratedImage(imageUrl);

      // Guardar imagen en la base de datos
      try {
        await fetch('/api/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model, imageUrl }),
        });
      } catch (saveError) {
        console.error('Error saving image:', saveError);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al generar la imagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Mode Selector - only show if no defaultMode */}
      {showModeSelector && (
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => setMode('generate')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              mode === 'generate'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Generar
          </button>
          <button
            onClick={() => setMode('edit')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              mode === 'edit'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
        </div>
      )}

      {/* Model Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Modelo
        </label>
        <div className="relative">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full appearance-none p-3 pr-10 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer"
          >
            {IMAGE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Image Upload for Edit Mode */}
      {mode === 'edit' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Imagen a editar
          </label>
          {!sourceImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">Arrastra o haz clic para subir</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">PNG, JPG hasta 10MB</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <img
                src={sourceImage}
                alt="Imagen a editar"
                className="w-full max-h-64 object-contain rounded-xl bg-gray-100 dark:bg-gray-800"
              />
              <button
                onClick={clearSourceImage}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Prompt Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {mode === 'generate' ? 'Describe tu imagen' : 'Describe los cambios'}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={mode === 'generate'
            ? "Un gato astronauta flotando en el espacio con la Tierra de fondo, estilo cinematográfico..."
            : "Cambia el fondo a un atardecer dorado, agrega un sombrero elegante..."
          }
          className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
          rows={3}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={generateImage}
        disabled={loading || !prompt.trim() || (mode === 'edit' && !sourceImageBase64)}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl disabled:hover:shadow-lg flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {mode === 'edit' ? 'Editando...' : 'Generando...'}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            {mode === 'edit' ? 'Editar imagen' : 'Generar imagen'}
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 rounded-full" />
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 rounded-full animate-spin border-t-transparent" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">Creando tu imagen...</p>
        </div>
      )}

      {/* Generated Image */}
      {generatedImage && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Imagen generada</span>
          </div>
          <div className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={generatedImage}
              alt="Imagen generada"
              className="w-full rounded-xl"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
              <a
                href={generatedImage}
                download="imagen-generada.png"
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar
              </a>
              <button
                onClick={() => {
                  setMode('edit');
                  setSourceImage(generatedImage);
                  // Extraer base64 si es una imagen base64, si no, convertirla
                  if (generatedImage.startsWith('data:')) {
                    setSourceImageBase64(generatedImage.split(',')[1]);
                  } else {
                    // Para URLs externas, usamos fetch para obtener el base64
                    fetch(generatedImage)
                      .then(res => res.blob())
                      .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const result = reader.result as string;
                          setSourceImageBase64(result.split(',')[1]);
                        };
                        reader.readAsDataURL(blob);
                      });
                  }
                  setPrompt('');
                  setGeneratedImage(null);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Seguir editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
