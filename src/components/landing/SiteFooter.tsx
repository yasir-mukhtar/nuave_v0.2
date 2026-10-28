import Link from "next/link";
import { CookieSettingsLink } from "@/components/consent/CookieConsent";
import { metaPixelId } from "@/lib/consent/meta-pixel";
import { cn } from "@/lib/utils";
import { Brand } from "./Brand";
import styles from "./SiteFooter.module.css";

const LINKS = [
  { href: "/faq", label: "FAQ" },
  { href: "/terms", label: "Syarat dan Ketentuan" },
  { href: "/privacy", label: "Kebijakan Privasi" },
  { href: "/support", label: "Kontak" },
];

/** Spec 019 (cookie notice): "Pengaturan cookie" reopens the notice, only
 * when the Meta Pixel is set up. */
function CookieSettingsItem() {
  if (!metaPixelId()) return null;
  return (
    <li>
      <CookieSettingsLink className={cn(styles.link, styles.linkButton)} />
    </li>
  );
}

/** The landing's footer: logo, four links (and the cookie settings), ©. */
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
            <CookieSettingsItem />
          </ul>
        </nav>
        <p className={styles.copy}>© {new Date().getFullYear()} Nuave</p>
      </div>
    </footer>
  );
}
