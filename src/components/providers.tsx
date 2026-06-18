"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgb(var(--card))",
            color: "rgb(var(--card-foreground))",
            border: "1px solid rgb(var(--border))",
          },
        }}
      />
    </NextThemesProvider>
  );
}
