import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Changa_One, Balsamiq_Sans } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const changaOne = Changa_One({ weight: '400', subsets: ['latin'], variable: '--font-changa' });
const balsamiq = Balsamiq_Sans({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-balsamiq' });

export const metadata: Metadata = {
  title: "nazo",
  description: "Next-gen learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`w-full h-full ${inter.variable} ${changaOne.variable} ${balsamiq.variable}`}>
      <head>
        {/* AdSense Verification Script */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8590308608127657"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`antialiased ${inter.className} dark h-full w-full`}
      >
        {children}
        <script src="https://js.puter.com/v2/"></script>
      </body>
    </html>
  );
}
