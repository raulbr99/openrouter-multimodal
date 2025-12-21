'use client';

import ImageGenerationComponent from '@/components/ImageGenerationComponent';

export default function GeneratePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Generar Imagen
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Crea imágenes increíbles con IA generativa
        </p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <ImageGenerationComponent defaultMode="generate" />
      </div>
    </div>
  );
}
