import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { FloralyProvider } from "@/context/FloralyContext";
import { UIProvider } from "@/context/UIContext";
import { AuthGate } from "@/components/AuthGate";
import { AppHeader } from "@/components/AppHeader";
import { Navigation } from "@/components/Navigation";
import { VisitTracker } from "@/components/VisitTracker";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Floraly - Nature memories, shared",
  description:
    "Join the community of nature enthusiasts today. A calm, nature-first social feed for outdoor memories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AuthProvider>
          <FloralyProvider>
            <UIProvider>
              <VisitTracker />
              <AuthGate>
                <AppHeader />
                {children}
                <Navigation />
              </AuthGate>
            </UIProvider>
          </FloralyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
