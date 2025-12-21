'use client';

import { ModelsProvider } from '@/contexts/ModelsContext';
import { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ModelsProvider>
      {children}
    </ModelsProvider>
  );
}
