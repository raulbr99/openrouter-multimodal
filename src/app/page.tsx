'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ChatComponent from '@/components/ChatComponent';

function ChatContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation') || undefined;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Chat
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Conversa con los modelos de IA más avanzados
        </p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <ChatComponent conversationId={conversationId} />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-8" />
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
