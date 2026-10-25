import Link from "next/link";
import { Brand } from "./Brand";
import styles from "./SiteFooter.module.css";

const LINKS = [
  { href: "/faq", label: "FAQ" },
  { href: "/terms", label: "Syarat dan Ketentuan" },
  { href: "/privacy", label: "Kebijakan Privasi" },
  { href: "/support", label: "Kontak" },
];

/** The landing's footer: logo, four links, ©. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <Link href="/" aria-label="Nuave, ke beranda" className={styles.brand}>
          <Brand />
        </Link>
        <nav aria-label="Tautan situs">
          <ul className={styles.links}>
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.link}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className={styles.copy}>© {new Date().getFullYear()} Nuave</p>
      </div>
    </footer>
  );
}
