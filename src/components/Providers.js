"use client";

import { TemaProvider } from "@/lib/theme";
import { TilProvider } from "@/lib/i18n";

export default function Providers({ children }) {
  return (
    <TemaProvider>
      <TilProvider>{children}</TilProvider>
    </TemaProvider>
  );
}
