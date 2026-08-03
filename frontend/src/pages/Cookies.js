import LegalLayout, { CONTACT_EMAIL } from "@/components/LegalLayout";

export default function Cookies() {
  return (
    <LegalLayout label="Legal" title="Cookies Policy" updated="August 2, 2026">
      <h2>1. What this policy covers</h2>
      <p>
        This page explains how Project Nexus ("Nexus", "we", "us") uses cookies and
        similar technologies when you use our website and app.
      </p>

      <h2>2. What cookies we use</h2>
      <p>
        Nexus uses a single <strong>essential cookie</strong> — we don't currently use
        advertising, analytics, or third-party tracking cookies.
      </p>
      <ul>
        <li>
          <strong>access_token</strong> — a secure, "httpOnly" session cookie that keeps
          you logged in after you sign in. It's essential to the service: without it,
          Nexus can't tell that you're authenticated, and features like your dashboard,
          messages, and profile won't work. It's set only when you log in or register,
          expires automatically after about 7 days, and can't be read by JavaScript or
          third parties.
        </li>
      </ul>

      <h2>3. Why we don't need a cookie banner (yet)</h2>
      <p>
        Because our only cookie is strictly necessary to provide the service you asked
        for (staying logged in), most privacy laws don't require a consent banner for
        it. If we ever add analytics, advertising, or other non-essential cookies, we
        will update this page and add a consent option before doing so.
      </p>

      <h2>4. Local storage</h2>
      <p>
        Nexus's browser app may use your browser's local storage to remember small,
        non-sensitive preferences (like UI state). This data stays on your device and
        isn't shared with anyone.
      </p>

      <h2>5. Third-party sites</h2>
      <p>
        Links to opportunity listings or other third-party sites may set their own
        cookies once you leave Nexus. Their cookie practices are covered by their own
        policies, not this one.
      </p>

      <h2>6. Managing cookies</h2>
      <p>
        Most browsers let you view, delete, or block cookies through their settings.
        Since our session cookie is required to stay logged in, blocking it will sign
        you out and prevent you from using account features.
      </p>

      <h2>7. Changes to this policy</h2>
      <p>
        If the cookies we use change — for example, if we add analytics — we'll update
        this page and the "Last updated" date above.
      </p>

      <h2>8. Contact us</h2>
      <p>
        Questions about our use of cookies? Email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
