'use client';

import VisionComponent from '@/components/VisionComponent';

export default function VisionPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Vision
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Analiza imágenes con inteligencia artificial
        </p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <VisionComponent />
      </div>
    </div>
  );
}
