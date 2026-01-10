import type { Metadata } from "next";
import { Teko, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'


const teko = Teko({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-teko" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ban Lang Tia Chop Championship",
  description: "Esports Tournament Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Thêm class font vào body để Tailwind nhận diện */}
      <body className={`${teko.variable} ${inter.variable} bg-void text-slate-200 antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}