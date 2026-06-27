import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Apoyemos a Venezuela",
  description: "Encuentra los centros de acopio y las iniciativas realizadas por comercios locales.",
  openGraph: {
    title: "Apoyemos a Venezuela",
    description: "Encuentra los centros de acopio y las iniciativas realizadas por comercios locales.",
    siteName: "Apoyemos a Venezuela",
    locale: "es_PA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Apoyemos a Venezuela",
    description: "Encuentra los centros de acopio y las iniciativas realizadas por comercios locales.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
