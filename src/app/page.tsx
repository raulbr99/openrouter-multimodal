'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ChatComponent from '@/components/ChatComponent';

function ChatContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation') || undefined;

  return (
    <div className="h-screen flex flex-col">
      <ChatComponent conversationId={conversationId} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
