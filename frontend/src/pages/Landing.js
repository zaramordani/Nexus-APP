import { Link } from "react-router-dom";
import {
  GraduationCap, Sparkle, Rocket, Trophy, UsersThree, ShieldCheck,
  ArrowRight, Lightning, Handshake, ChartLineUp,
} from "@phosphor-icons/react";
import { LegalFooter } from "@/components/LegalLayout";

const Chip = ({ children }) => (
  <span className="nb-chip bg-white">{children}</span>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="bg-[#FDFBF7] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Nexus" className="w-9 h-9 rounded-lg border-2 border-[#0A0A0A] object-cover" />
            <span className="font-display text-xl font-black tracking-tight">Nexus</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/contact" data-testid="nav-contact-link" className="font-bold text-sm hidden sm:block hover:underline">Contact us</Link>
            <Link to="/login" data-testid="nav-login-link" className="font-bold text-sm hidden sm:block hover:underline">Log in</Link>
            <Link to="/signup" data-testid="nav-signup-link" className="nb-btn text-sm">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-14 md:pt-24 pb-16">
        <div className="flex flex-wrap gap-2 mb-6 fade-up">
          <Chip>🎓 For grades 9–12</Chip>
          <Chip>🔒 Verified students only</Chip>
          <Chip>🤝 Collaboration &gt; popularity</Chip>
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight leading-[0.95] max-w-4xl fade-up">
          The place where ambitious students <span className="bg-[#FFD166] px-2 border-2 border-[#0A0A0A] rounded-lg inline-block -rotate-1">build their future</span> together.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-[#4A4A4A] max-w-2xl font-medium fade-up">
          Stop jumping between Discord, Docs and Instagram. Find teammates, join projects, discover opportunities, and build a verified portfolio — all powered by AI.
        </p>

        {/* AI Goal input showcase */}
        <div className="mt-10 nb-card p-2 max-w-2xl fade-up">
          <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-dashed border-[#0A0A0A]/20">
            <Sparkle size={18} weight="fill" className="text-[#FF7B54]" />
            <span className="nb-label">Tell Nexus your goal</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-2 p-2">
            <div className="flex-1 px-3 py-3 text-[#4A4A4A] font-medium text-base">
              "I want two teammates for a robotics hackathon…"
            </div>
            <Link to="/signup" className="nb-btn justify-center whitespace-nowrap" data-testid="hero-cta">
              Find matches <ArrowRight size={18} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      {/* Bento grid */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="md:col-span-2 bg-[#A0C4FF]" icon={Sparkle} title="AI Matchmaker">
            Describe your goal in plain English. Our AI recommends the best teammates and explains exactly why they fit.
          </Card>
          <Card className="bg-white" icon={Rocket} title="Project Hub">
            Create or join real projects with defined roles, timelines and progress tracking.
          </Card>
          <Card className="bg-white" icon={Trophy} title="Opportunity Board">
            Competitions, research, scholarships & hackathons — curated for students.
          </Card>
          <Card className="bg-[#FFD166]" icon={ShieldCheck} title="Verified Collaboration">
            Teammates confirm each other's contributions. Trust beats a list of claims.
          </Card>
          <Card className="bg-white" icon={ChartLineUp} title="Reputation, not followers">
            Earn credibility for finishing projects, helping others and being reliable.
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t-2 border-[#0A0A0A] bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-20">
          <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-12">From idea to finished project.</h2>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { icon: GraduationCap, t: "Build your profile", d: "Skills, interests & what you're looking for." },
              { icon: Sparkle, t: "Tell AI your goal", d: "Get matched to the right people instantly." },
              { icon: Handshake, t: "Form your team", d: "Join a project and start building together." },
              { icon: Lightning, t: "Ship & get verified", d: "Complete work and earn real credibility." },
            ].map((s, i) => (
              <div key={i} className="nb-card p-5">
                <div className="w-11 h-11 bg-[#FF7B54] border-2 border-[#0A0A0A] rounded-lg flex items-center justify-center mb-4">
                  <s.icon size={22} weight="bold" />
                </div>
                <div className="text-xs font-black text-[#FF7B54] mb-1">STEP {i + 1}</div>
                <h3 className="font-display text-xl font-bold mb-1">{s.t}</h3>
                <p className="text-sm text-[#4A4A4A] font-medium">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 py-24">
        <div className="nb-card bg-[#FF7B54] p-10 md:p-16 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-4">Ready to build something real?</h2>
          <p className="text-lg font-medium mb-8 max-w-xl mx-auto">Join a community of ambitious students who ship projects, not just posts.</p>
          <Link to="/signup" className="nb-btn nb-btn-ghost text-lg" data-testid="footer-cta">
            Create your free account <ArrowRight size={20} weight="bold" />
          </Link>
        </div>
      </section>

      <LegalFooter />
    </div>
  );
}

function Card({ icon: Icon, title, children, className = "" }) {
  return (
    <div className={`nb-card nb-card-hover p-6 ${className}`}>
      <div className="w-11 h-11 bg-white border-2 border-[#0A0A0A] rounded-lg flex items-center justify-center mb-4">
        <Icon size={22} weight="bold" />
      </div>
      <h3 className="font-display text-2xl font-bold tracking-tight mb-2">{title}</h3>
      <p className="text-[#0A0A0A]/80 font-medium">{children}</p>
    </div>
  );
}
