import type { Metadata } from "next";
import { Providers } from "../components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Truth & Dare | Obsidian Neon Arena",
  description: "Play Truth and Dare in real-time with AI-powered questions and full audio chat lobbies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-neon-purple selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

