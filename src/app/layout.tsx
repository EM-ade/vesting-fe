import type { Metadata } from "next";
import { Manrope } from 'next/font/google';
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";
import AppWalletProvider from "@/components/wallet/AppWalletProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Lil Gargs Vesting | Secure Distribution",
  description: "Advanced token streaming protocol for the LilGarg ecosystem.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable}`} suppressHydrationWarning>
      <body className="bg-[#030305] antialiased font-manrope text-white selection:bg-blue-500/30">
        <QueryProvider>
          <AppWalletProvider>
            {children}
          </AppWalletProvider>
          <Toaster 
            position="top-right" 
            theme="dark"
            richColors
            closeButton
          />
          <Analytics />
        </QueryProvider>
      </body>
    </html>
  );
}
