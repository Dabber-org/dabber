"use client";

import { createContext, useContext, ReactNode } from "react";

interface CustomizationContextType {
  agentName: string;
}

const CustomizationContext = createContext<CustomizationContextType | undefined>(
  undefined
);

export function CustomizationProvider({
  children,
  agentName,
}: {
  children: ReactNode;
  agentName: string;
}) {
  return (
    <CustomizationContext.Provider value={{ agentName }}>
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomization() {
  const context = useContext(CustomizationContext);
  if (context === undefined) {
    throw new Error("useCustomization must be used within a CustomizationProvider");
  }
  return context;
}
