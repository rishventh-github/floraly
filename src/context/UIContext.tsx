"use client";

import { createContext, useContext, useState } from "react";

interface UIContextValue {
  commentsOpen: boolean;
  setCommentsOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  return (
    <UIContext.Provider value={{ commentsOpen, setCommentsOpen }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
