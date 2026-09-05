import type { Metadata } from "next";
import localFont from "next/font/local";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const selam = localFont({
  src: "../fonts/Selam-Regular.otf",
  variable: "--font-amharic",
  display: "swap",
  weight: "400",
  style: "normal",
});

export const metadata: Metadata = {
  title: "Delala: Find a place without the middleman",
  description:
    "Delala connects people looking for property in Ethiopia directly with owners. Browse, connect, and move forward, without the traditional middleman.",
  openGraph: {
    title: "Delala",
    description: "Find a place. Without the middleman.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${selam.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
