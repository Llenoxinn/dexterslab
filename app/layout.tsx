import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter, Pixelify_Sans } from "next/font/google";
import Script from "next/script";
import "lenis/dist/lenis.css";
import "./globals.css";

const display = Pixelify_Sans({ weight: ["700"], subsets: ["latin"], variable: "--font-pixel", display: "swap" });
// Section headlines match Notion /dev's headline voice (NotionInter is Notion's own cut of Inter).
const heading = Inter({ weight: ["700"], subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sans = Chakra_Petch({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-chakra",
  display: "swap",
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Dexter Juevesano — dexterslab", template: "%s — dexterslab" },
  description: "The lab of Dexter Juevesano, computer science student at UP Cebu. Experiment in progress.",
  openGraph: {
    type: "website",
    siteName: "dexterslab",
    title: "dexterslab: experiment in progress",
    description: "The lab of Dexter Juevesano, computer science student at UP Cebu.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#1313ba" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${heading.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        {/* Lets CSS hide intro elements before paint (without JS everything stays visible),
            and skips the boot screen after the first visit in a session. */}
        <Script id="js-flag" strategy="beforeInteractive">
          {`document.documentElement.classList.add("js");try{if(sessionStorage.getItem("lab-booted"))document.documentElement.classList.add("booted")}catch(e){}`}
        </Script>
        {children}
      </body>
    </html>
  );
}
