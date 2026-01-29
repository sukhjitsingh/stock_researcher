import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Researcher",
  description: "AI-Assisted Stock Research & Options Strategy Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
