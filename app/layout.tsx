import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "PT. BUKIT SION MEDIKAL | Distribution Operating System",
  description: "Satu sistem untuk penjualan, persediaan, hutang-piutang, distribusi dan pengambilan keputusan bisnis.",
  applicationName: "PT. BUKIT SION MEDIKAL",
  manifest: "/manifest.webmanifest",
  icons: { icon: { url: "/bsm-logo.png", type: "image/png" }, apple: "/icon-192.png" }
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, themeColor: "#07549b"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><PwaRegister />{children}</body></html>;
}