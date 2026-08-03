import LegalLayout, { CONTACT_EMAIL } from "@/components/LegalLayout";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <LegalLayout label="Legal" title="Terms of Service" updated="August 3, 2026">
      <h2>1. Who we are</h2>
      <p>
        Project Nexus ("Nexus", "we", "us") is a collaboration platform for ambitious
        high school students (grades 9–12) to find teammates, join projects, discover
        opportunities, and build a verified portfolio. By creating an account or using
        Nexus in any way, you agree to these Terms of Service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        Nexus is intended for students roughly in grades 9–12. You must be at least 13
        years old to create an account. If you are under 18, you confirm that a parent
        or legal guardian is aware of and permits your use of Nexus. We do not knowingly
        collect information from children under 13, and we will delete any account we
        learn belongs to a child under 13.
      </p>

      <h2>3. Your account</h2>
      <ul>
        <li>You're responsible for the accuracy of the information you provide and for keeping your login credentials secure.</li>
        <li>One account per person. Impersonating another student, school, or organization is not allowed.</li>
        <li>"Verified" status (e.g. via a school email domain) reflects an automated check, not a background check or identity guarantee.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>When using Nexus, you agree not to:</p>
      <ul>
        <li>Harass, bully, threaten, or discriminate against other students.</li>
        <li>Post false, misleading, or plagiarized content, or misrepresent your contributions to a project.</li>
        <li>Use Nexus to share content that is illegal, sexually explicit, or otherwise inappropriate for a platform aimed at teenagers.</li>
        <li>Attempt to access another user's account, scrape the platform, or interfere with its normal operation.</li>
        <li>Use the messaging, forum, or project tools for spam, solicitation, or advertising unrelated to genuine collaboration.</li>
      </ul>

      <h2>5. Reporting &amp; blocking</h2>
      <p>
        Profiles, messages, and forum posts can be reported to us for review. You can
        also block any student, which immediately stops them from messaging you or
        viewing your profile. We review reports and may remove content, warn, suspend,
        or permanently ban accounts that violate these Terms.
      </p>

      <h2>6. Content you post</h2>
      <p>
        You retain ownership of the profile information, project descriptions, forum
        posts, messages, and other content you submit ("User Content"). By posting User
        Content, you grant Nexus a non-exclusive, worldwide, royalty-free license to
        host, display, and distribute it within the platform so we can provide the
        service (for example, showing your profile to potential teammates or your posts
        in the forum). You're responsible for what you post.
      </p>

      <h2>7. Reviews, reputation &amp; connections</h2>
      <p>
        Reputation scores, ratings, and reviews are submitted by other students based on
        real collaboration. They are subjective peer feedback, not verified facts. We
        may remove reviews or reputation data that we determine are abusive, fraudulent,
        or fake.
      </p>

      <h2>8. AI features</h2>
      <p>
        Nexus uses AI (with a rule-based fallback when AI is unavailable) to suggest
        teammates and opportunities based on the goals and profile details you provide.
        AI suggestions are provided for convenience — you're responsible for evaluating
        any match or recommendation yourself.
      </p>

      <h2>9. Opportunities &amp; third-party links</h2>
      <p>
        Opportunity listings (internships, competitions, scholarships, hackathons, etc.)
        may link to third-party organizations and websites we don't control. We don't
        guarantee the accuracy of listings or endorse any third party, and we're not
        responsible for your interactions with them.
      </p>

      <h2>10. Account deletion &amp; termination</h2>
      <p>
        You can delete your account instantly at any time from{" "}
        <strong>Profile → Danger zone → Delete my account</strong>. If you can't sign
        in, use our <Link to="/delete-account">account deletion request form</Link> and
        we'll process it for you. We may suspend or terminate your account if you
        violate these Terms, misuse the platform, or create risk or harm to Nexus or
        other students.
      </p>

      <h2>11. Disclaimers &amp; limitation of liability</h2>
      <p>
        Nexus is provided "as is" without warranties of any kind. We do not guarantee
        that you will find teammates, be accepted into projects, or receive any
        particular outcome from using the platform. To the fullest extent permitted by
        law, Nexus and its team are not liable for indirect, incidental, or
        consequential damages arising from your use of the platform.
      </p>

      <h2>12. Changes to these terms</h2>
      <p>
        We may update these Terms as Nexus evolves. If we make material changes, we'll
        update the "Last updated" date above. Continuing to use Nexus after changes take
        effect means you accept the updated Terms.
      </p>

      <h2>13. Contact us</h2>
      <p>
        Questions about these Terms? Email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
