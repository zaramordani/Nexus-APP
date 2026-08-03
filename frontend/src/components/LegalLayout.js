import { Link } from "react-router-dom";
import { EnvelopeSimple, InstagramLogo, ArrowLeft } from "@phosphor-icons/react";

export const CONTACT_EMAIL = "support.nexused@gmail.com";
export const INSTAGRAM_URL =
  "https://www.instagram.com/nexus.ed.official?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

const LEGAL_LINKS = [
  { to: "/contact", label: "Contact Us" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/cookies", label: "Cookies Policy" },
  { to: "/delete-account", label: "Delete My Account" },
];

export function LegalFooter() {
  return (
    <footer className="border-t-2 border-[#0A0A0A] bg-white">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-6">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="nb-chip bg-[#FDFBF7] hover:bg-[#FFD166]"
            data-testid="footer-contact-email"
          >
            <EnvelopeSimple size={16} weight="bold" /> {CONTACT_EMAIL}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="nb-chip bg-[#FDFBF7] hover:bg-[#A0C4FF]"
            data-testid="footer-instagram-link"
          >
            <InstagramLogo size={16} weight="bold" /> @nexus.ed.official
          </a>
        </div>
        <p className="text-xs text-[#4A4A4A] font-medium">
          Project Nexus — built for ambitious high school students.
        </p>
      </div>
    </footer>
  );
}

export default function LegalLayout({ label, title, updated, children }) {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      <header className="bg-[#FDFBF7] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Nexus" className="w-9 h-9 rounded-lg border-2 border-[#0A0A0A] object-cover" />
            <span className="font-display text-xl font-black tracking-tight">Nexus</span>
          </Link>
          <Link to="/" className="flex items-center gap-1 font-bold text-sm hover:underline">
            <ArrowLeft size={16} weight="bold" /> Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 md:px-12 py-14 md:py-20 w-full">
        {label && <div className="nb-label mb-2">{label}</div>}
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-2">{title}</h1>
        {updated && <p className="text-sm font-bold text-[#4A4A4A] mb-10">Last updated: {updated}</p>}
        <div className="legal-prose">{children}</div>
      </main>

      <LegalFooter />
    </div>
  );
}
