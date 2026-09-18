import type { Metadata } from "next";
import { Fraunces, Lora, Alfa_Slab_One } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

const lora = Lora({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

// Heavy vintage slab-serif for the "PLAYBOY" masthead — evokes a bold classic
// magazine logotype without reproducing the actual registered Playboy
// wordmark/typeface.
const alfaSlabOne = Alfa_Slab_One({
  variable: "--font-masthead",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "The Playboy — Collector's Checklist",
  description: "A personal collector's checklist for tracking a physical Playboy magazine collection.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${lora.variable} ${alfaSlabOne.variable} h-full antialiased`}>
      <body className="min-h-full text-ink">
        <div className="magazine-frame">
          <div className="magazine-page flex flex-col overflow-hidden rounded-sm">{children}</div>
        </div>
      </body>
    </html>
  );
}
