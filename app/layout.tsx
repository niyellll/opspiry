import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "OPSPIRY | Distribution Operating System",
  description: "Satu sistem untuk penjualan, persediaan, hutang-piutang, distribusi dan pengambilan keputusan bisnis.",
  applicationName: "OPSPIRY",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/opspiry-mark.svg", apple: "/icon-192.png" }
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, themeColor: "#b30d1b"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><PwaRegister />{children}</body></html>;
}