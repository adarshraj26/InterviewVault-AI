"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ReactNode } from "react";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";

// Filter out the React 19 script tag warning from next-themes in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
      return;
    }
    origError.apply(console, args);
  };
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
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
    </SessionProvider>
  );
}
