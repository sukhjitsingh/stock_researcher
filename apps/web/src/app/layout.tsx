import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finux | Stock Researcher",
  description: "AI-Assisted Stock Research & Options Strategy Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[url('/grid.svg')] bg-fixed bg-cover`}>
        {/* Background Gradients */}
        <div className="fixed inset-0 z-[-1] bg-background/90" />
        <div className="fixed top-[-20%] right-[10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[128px] z-[-1]" />

        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
