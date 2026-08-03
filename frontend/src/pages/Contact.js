import { EnvelopeSimple, InstagramLogo, ArrowUpRight } from "@phosphor-icons/react";
import LegalLayout, { CONTACT_EMAIL, INSTAGRAM_URL } from "@/components/LegalLayout";

export default function Contact() {
  return (
    <LegalLayout label="We're here to help" title="Contact Us">
      <p>
        Got a question, feedback, or an issue with your account? Reach out — a real
        person reads every message.
      </p>

      <div className="grid sm:grid-cols-2 gap-5 mt-8 mb-8">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="nb-card nb-card-hover p-6 bg-[#FFD166] flex flex-col gap-3"
          data-testid="contact-email-card"
        >
          <div className="w-11 h-11 bg-white border-2 border-[#0A0A0A] rounded-lg flex items-center justify-center">
            <EnvelopeSimple size={22} weight="bold" />
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-tight mb-1">Email us</div>
            <div className="font-bold text-sm break-all flex items-center gap-1">
              {CONTACT_EMAIL} <ArrowUpRight size={14} weight="bold" />
            </div>
          </div>
        </a>

        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="nb-card nb-card-hover p-6 bg-[#A0C4FF] flex flex-col gap-3"
          data-testid="contact-instagram-card"
        >
          <div className="w-11 h-11 bg-white border-2 border-[#0A0A0A] rounded-lg flex items-center justify-center">
            <InstagramLogo size={22} weight="bold" />
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-tight mb-1">Follow us</div>
            <div className="font-bold text-sm flex items-center gap-1">
              @nexus.ed.official <ArrowUpRight size={14} weight="bold" />
            </div>
          </div>
        </a>
      </div>

      <p>
        Looking for something specific? Check our{" "}
        <a href="/terms">Terms of Service</a>, <a href="/privacy">Privacy Policy</a>, or{" "}
        <a href="/cookies">Cookies Policy</a>.
      </p>
    </LegalLayout>
  );
}
