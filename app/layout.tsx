import type { Metadata } from "next";
import "./globals.css";
import "./legacy.css";

export const metadata: Metadata = {
  title: "UMKM Accounting Cycle",
  description: "Aplikasi siklus akuntansi dan pelaporan keuangan UMKM makanan.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
