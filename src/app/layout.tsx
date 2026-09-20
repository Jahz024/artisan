import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

// Barlow draws on highway and transit signage: legible at small sizes,
// and the condensed cut reads like station names on a map.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Artisan | Map your route to graduation",
  description:
    "Virginia Tech academic planning with AI agents — visualize prerequisites, optimize schedules, and graduate with confidence.",
  keywords: ["Virginia Tech", "Hokie", "degree planning", "CS", "academic planner"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
