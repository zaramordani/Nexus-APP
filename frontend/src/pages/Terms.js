import { Link } from "react-router-dom";

const EFFECTIVE_DATE = "July 28, 2026";
const CONTACT_EMAIL = "support@nexusapp.example"; // TODO: replace with your real support inbox before launch

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-12 prose">
      <Link to="/" className="text-sm font-bold underline">← Back to Nexus</Link>
      <h1 className="font-display text-3xl md:text-4xl font-black mt-4 mb-1">Terms of Service</h1>
      <p className="text-sm text-[#4A4A4A]">Effective {EFFECTIVE_DATE}</p>

      <p>These Terms govern your use of Nexus. By creating an account, you agree to them. If you are under 18, you
        confirm you have the permission required in your jurisdiction to use an online service like Nexus (for
        example, a parent or guardian's consent where your local law requires it).</p>

      <h2>1. Eligibility</h2>
      <p>Nexus is for students age 13 and up. You must provide accurate information when you register and keep your
        account credentials confidential.</p>

      <h2>2. Community standards</h2>
      <p>Nexus is a space for students to find collaborators, share projects, and network. When using messaging, the
        forum, or your profile, you agree not to: harass, bully, or threaten other users; post hateful, sexual, or
        violent content; impersonate someone else; spam or solicit; or share another person's private information
        without consent. We may remove content, warn, suspend, or permanently ban accounts that violate these
        standards, and we review reports submitted through the in-app "Report" feature.</p>

      <h2>3. Reporting &amp; blocking</h2>
      <p>Every profile, message thread, and forum post can be reported to our Trust &amp; Safety team. You can also
        block any student, which immediately stops them from messaging you or viewing your profile.</p>

      <h2>4. Your content</h2>
      <p>You keep ownership of what you post. By posting, you give Nexus a license to display it within the app to
        the intended audience (e.g., other students, or your connections for messages). You're responsible for what
        you share.</p>

      <h2>5. Account termination</h2>
      <p>You may delete your account at any time from Profile → Danger zone, or via our{" "}
        <Link to="/delete-account" className="underline">deletion request form</Link>. We may suspend or terminate
        accounts that violate these Terms or that we determine pose a safety risk to the community.</p>

      <h2>6. Disclaimers</h2>
      <p>Nexus is provided "as is." We don't guarantee that matches, opportunities, or content posted by other users
        are accurate or suitable, and we're not responsible for interactions between users that occur outside the
        platform.</p>

      <h2>7. Changes</h2>
      <p>We may update these Terms from time to time; continued use after an update means you accept the revised
        Terms.</p>

      <h2>8. Contact</h2>
      <p>Questions about these Terms: {CONTACT_EMAIL}</p>
    </div>
  );
}
