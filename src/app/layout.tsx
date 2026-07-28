import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "KiroSpec Studio — Entrada",
  description: "AI-powered software specification pipeline",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <a href="#main-content" className={styles.skipLink}>
          Saltar al contenido principal
        </a>
        <header className={styles.header}>
          <nav className={styles.nav}>{/* Placeholder navigation */}</nav>
        </header>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
