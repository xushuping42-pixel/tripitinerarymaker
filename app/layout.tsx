import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import "./globals.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tripitinerarymaker.com"),
  title: "Trip Itinerary Template — Free & Editable Online",
  description: "Free editable trip itinerary template — create, customize & download your travel itinerary in minutes. No sign-up required, edit anytime.",
  alternates: {
    canonical: "https://www.tripitinerarymaker.com",
  },
  openGraph: {
    title: "Trip Itinerary Template — Free & Editable Online",
    description: "Free editable trip itinerary template — create, customize & download your travel itinerary in minutes. No sign-up required, edit anytime.",
    images: [{ url: "/og-cover.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${serif.variable} ${sans.variable}`}><body>{children}</body></html>;
}
