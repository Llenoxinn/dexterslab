import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { LabCustomizer } from "@/components/lab-customizer";
import { site } from "@/lib/site";
import "./globals.css";

const display = localFont({ src: "../assets/PixelifySans-Bold.ttf", weight: "700", variable: "--font-pixel", display: "swap" });
// Section headlines match Notion /dev's headline voice (NotionInter is Notion's own cut of Inter).
const heading = Inter({ weight: ["700"], subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sans = Chakra_Petch({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-chakra",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Dexter Juevesano | dexterslab", template: "%s | dexterslab" },
  description: "Dexter Juevesano, computer science student at UP Cebu. Explore shipped web tools, cybersecurity projects, and computational biology research.",
  openGraph: {
    type: "website",
    siteName: "dexterslab",
    locale: "en_PH",
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
        <a href="#lab" className="skip-link">Skip to content</a>
        {/* Apply saved appearance before paint, and arm the opening on a first visit; content remains visible without JavaScript. */}
        <Script id="js-flag" strategy="beforeInteractive">
          {`const root=document.documentElement;root.classList.add("js");try{const p=JSON.parse(localStorage.getItem("dexterslab:prefs")||"{}");root.dataset.labTheme=p.theme==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"phosphor":"dos"):["dos","phosphor","contrast"].includes(p.theme)?p.theme:"dos";root.dataset.labRails=p.rails===true?"on":"off";if(p.density==="compact")root.dataset.labDensity="compact";if(p.fx==="calm")root.dataset.labFx="calm"}catch(e){root.dataset.labTheme="dos";root.dataset.labRails="off"};try{if(location.pathname==="/"&&!location.hash&&root.dataset.labFx!=="calm"&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&sessionStorage.getItem("lab:intro")!=="seen")root.dataset.intro="play"}catch(e){}`}
        </Script>
        {children}
        <LabCustomizer />
      </body>
    </html>
  );
}
