import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "PT. Bukit Sion Medikal | Sistem Operasional",
  description: "Satu sistem untuk penjualan, persediaan, hutang-piutang, distribusi dan pengambilan keputusan bisnis.",
  applicationName: "PT. Bukit Sion Medikal",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.svg", apple: "/bsm-logo.png" }
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, themeColor: "#0759b4"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><PwaRegister />{children}</body></html>;
}