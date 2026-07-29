import { useState } from "react";
import { Link } from "react-router-dom";
import { api, formatError } from "@/api";
import { toast } from "sonner";

// Public, no-login page. Google Play's User Data policy requires apps that
// support in-app account creation to also offer a web resource where users
// can request deletion of their account and data without reinstalling or
// signing into the app.
export default function DeleteAccountRequest() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/account-deletion-requests", { email: email.trim(), reason: reason.trim() });
      setDone(true);
    } catch (err) {
      toast.error(formatError(err?.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-5 md:px-10 py-12">
      <Link to="/" className="text-sm font-bold underline">← Back to Nexus</Link>
      <h1 className="font-display text-3xl md:text-4xl font-black mt-4 mb-2">Request account deletion</h1>

      {done ? (
        <div className="nb-card p-6 mt-6">
          <p className="font-bold">Request received.</p>
          <p className="text-sm text-[#4A4A4A] font-medium mt-2">
            We'll verify the request and permanently delete the account and its data — profile, messages,
            connections, forum posts/comments, and reviews — within 30 days. If you can still sign in, you can also
            delete instantly from Profile → Danger zone.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[#4A4A4A] font-medium mb-6">
            If you can sign in, the fastest way to delete your account is from <strong>Profile → Danger zone → Delete
            my account</strong>. If you can't access the app, use this form and we'll process the request for you.
          </p>
          <form onSubmit={submit} className="nb-card p-6 space-y-4">
            <div>
              <label className="nb-label">Account email</label>
              <input type="email" required className="nb-input mt-1" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-testid="delete-request-email" />
            </div>
            <div>
              <label className="nb-label">Reason (optional)</label>
              <textarea className="nb-input mt-1 min-h-[80px]" value={reason}
                onChange={(e) => setReason(e.target.value)} data-testid="delete-request-reason" />
            </div>
            <button className="nb-btn w-full justify-center" disabled={submitting} data-testid="delete-request-submit">
              {submitting ? "Submitting…" : "Request deletion"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
