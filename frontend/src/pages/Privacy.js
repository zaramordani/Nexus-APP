import { Link } from "react-router-dom";

const EFFECTIVE_DATE = "July 28, 2026";
const CONTACT_EMAIL = "privacy@nexusapp.example"; // TODO: replace with your real support/privacy inbox before launch

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-12 prose">
      <Link to="/" className="text-sm font-bold underline">← Back to Nexus</Link>
      <h1 className="font-display text-3xl md:text-4xl font-black mt-4 mb-1">Privacy Policy</h1>
      <p className="text-sm text-[#4A4A4A]">Effective {EFFECTIVE_DATE}</p>

      <p>Nexus ("Nexus", "we", "us") is a collaboration platform for high school students. This policy explains what
        information we collect, how we use it, and the choices you have — including how to delete your account and data.</p>

      <h2>1. Who this service is for</h2>
      <p>Nexus is intended for students age 13 and older. We do not knowingly collect personal information from
        children under 13. If you believe a child under 13 has created an account, contact us at {CONTACT_EMAIL} and we
        will delete it. Because many of our users are minors, we collect only what's needed to run the product and we
        do not use profile or activity data to serve behavioral/personalized advertising to any user.</p>

      <h2>2. Information we collect</h2>
      <p><strong>Account information:</strong> name, email address, and a hashed password (we never store your
        password in plain text).</p>
      <p><strong>Profile information you choose to add:</strong> school, grade, bio, avatar image, skills, interests,
        "looking for" tags, and a general area/location (city and state that you select from a list — we do not access
        your device's precise GPS location).</p>
      <p><strong>Content you create:</strong> messages you send to other students, forum posts and comments, project
        listings, and reviews/ratings you give or receive.</p>
      <p><strong>AI matchmaking input:</strong> when you use "AI Match" and describe a goal in your own words, that
        text is sent to our AI matching provider (Groq) to generate ranked teammate suggestions. We don't send your
        name, email, or password to that provider.</p>
      <p><strong>Automatically collected:</strong> basic technical data needed to keep you signed in and the service
        secure (an authentication token stored in a cookie, and standard server request logs).</p>
      <p>We do not collect precise device location, contacts, photos/media from your device, call logs, or SMS. We do
        not run advertising SDKs and we do not sell personal information.</p>

      <h2>3. How we use information</h2>
      <p>To create and secure your account; to operate core features (profiles, teammate discovery, AI matching,
        messaging, forum, project hub, opportunity board, reviews/reputation); to enforce our Terms and community
        safety rules (including reviewing reports of abuse); and to maintain and improve the service.</p>

      <h2>4. Who we share information with</h2>
      <p>Other Nexus users see the profile information you choose to publish (name, school, grade, bio, skills,
        interests, area, avatar, reputation) and any content you post or send them. We share limited data with the
        service providers that host and operate Nexus: our database host, and Groq for AI-matching text you submit.
        These providers are only permitted to use your data to provide the service to us. We do not sell your data or
        share it with advertisers.</p>

      <h2>5. Data retention</h2>
      <p>We keep your information for as long as your account is active. If you delete your account (see Section 7),
        we delete your profile, messages, connections, forum posts/comments, and reviews within 30 days, except where
        we must retain limited records to comply with law, resolve disputes, or enforce our safety policies (for
        example, records of a content report you filed or were the subject of).</p>

      <h2>6. Your choices &amp; controls</h2>
      <p>You can edit or remove most profile fields at any time from Settings → Profile. You can block another
        student, which stops them from messaging or seeing your profile and removes any connection between you. You
        can report a student, message, or forum post to our Trust &amp; Safety team for review.</p>

      <h2>7. Deleting your account</h2>
      <p>You can permanently delete your account and associated data at any time from <strong>Profile → Danger
        zone → Delete my account</strong> while logged in. If you can't log in, use our{" "}
        <Link to="/delete-account" className="underline">account deletion request form</Link> — no login required —
        and we'll process your request within 30 days.</p>

      <h2>8. Security</h2>
      <p>Passwords are hashed with bcrypt and never stored in plain text. Authentication uses signed, expiring tokens.
        Traffic between the app and our servers is encrypted (HTTPS). No method of transmission or storage is 100%
        secure, so we can't guarantee absolute security.</p>

      <h2>9. Changes to this policy</h2>
      <p>If we make material changes, we'll update the effective date above and, where required, notify you in the
        app.</p>

      <h2>10. Contact us</h2>
      <p>Questions or requests about this policy or your data: {CONTACT_EMAIL}</p>
    </div>
  );
}
