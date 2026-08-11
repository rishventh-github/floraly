import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { FloralyProvider } from "@/context/FloralyContext";
import { ThemeProvider } from "@/context/ThemeContext";
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

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('floraly_theme');
    if (t !== 'light') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full antialiased">
        <AuthProvider>
          <ThemeProvider>
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
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
