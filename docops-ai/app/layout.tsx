import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocOps AI · Document review",
  description: "Extract invoice fields, match purchase orders and review document exceptions.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
