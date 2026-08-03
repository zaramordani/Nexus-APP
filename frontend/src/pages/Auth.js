import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/AuthContext";
import { formatError } from "@/api";
import { ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Auth({ mode }) {
  const isSignup = mode === "signup";
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", birthdate: "", school: "", grade: "11th" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (isSignup && !agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        await register(form);
        toast.success("Welcome to Nexus! 🎉");
      } else {
        await login(form.email, form.password);
        toast.success("Welcome back!");
      }
      nav("/app");
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col md:flex-row">
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col justify-between w-2/5 bg-[#FF7B54] border-r-2 border-[#0A0A0A] p-12">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Nexus" className="w-9 h-9 rounded-lg border-2 border-[#0A0A0A] object-cover" />
          <span className="font-display text-xl font-black">Nexus</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-black tracking-tight leading-tight">Where ambitious students build together.</h2>
          <div className="mt-6 nb-card bg-white p-4 inline-flex items-center gap-2 -rotate-1">
            <ShieldCheck size={22} weight="fill" className="text-[#2ECC71]" />
            <span className="font-bold text-sm">Verified students only</span>
          </div>
        </div>
        <p className="text-sm font-medium text-[#0A0A0A]/70">Collaboration over popularity.</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md nb-card p-8 fade-up" data-testid="auth-form">
          <h1 className="font-display text-3xl font-black tracking-tight mb-1">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-[#4A4A4A] font-medium mb-6">
            {isSignup ? "Use your school email to get verified." : "Log in to your Nexus workspace."}
          </p>

          {error && (
            <div className="mb-4 nb-card bg-[#FF3B30]/10 border-[#FF3B30] p-3 text-sm font-bold text-[#FF3B30]" data-testid="auth-error">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {isSignup && (
              <div>
                <label className="nb-label">Full name</label>
                <input className="nb-input mt-1" value={form.name} onChange={set("name")} required data-testid="input-name" placeholder="Alex Rivera" />
              </div>
            )}
            {isSignup && (
              <div>
                <label className="nb-label">Date of birth</label>
                <input
                  type="date"
                  className="nb-input mt-1"
                  value={form.birthdate}
                  onChange={set("birthdate")}
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  data-testid="input-birthdate"
                />
                <p className="text-xs text-[#4A4A4A] font-medium mt-1">You must be at least 13 to join Nexus.</p>
              </div>
            )}
            <div>
              <label className="nb-label">Email {isSignup && "(.edu preferred)"}</label>
              <input type="email" className="nb-input mt-1" value={form.email} onChange={set("email")} required data-testid="input-email" placeholder="you@school.edu" />
            </div>
            <div>
              <label className="nb-label">Password</label>
              <input type="password" className="nb-input mt-1" value={form.password} onChange={set("password")} required minLength={6} data-testid="input-password" placeholder="••••••••" />
            </div>
            {isSignup && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="nb-label">School</label>
                  <input className="nb-input mt-1" value={form.school} onChange={set("school")} data-testid="input-school" placeholder="Lincoln High" />
                </div>
                <div>
                  <label className="nb-label">Grade</label>
                  <select className="nb-input mt-1" value={form.grade} onChange={set("grade")} data-testid="input-grade">
                    {["9th", "10th", "11th", "12th"].map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {isSignup && (
            <label className="flex items-start gap-2 mt-5 cursor-pointer" data-testid="auth-legal-notice">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5 mt-0.5 shrink-0 accent-[#FF7B54]"
                data-testid="auth-agree-checkbox"
              />
              <span className="text-sm font-medium text-[#4A4A4A]">
                I agree to Nexus's{" "}
                <Link to="/terms" className="font-bold underline">Terms of Service</Link> and{" "}
                <Link to="/privacy" className="font-bold underline">Privacy Policy</Link>.
              </span>
            </label>
          )}

          <button type="submit" disabled={loading} className="nb-btn w-full justify-center mt-4" data-testid="auth-submit">
            {loading ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>

          <p className="text-center text-sm font-medium mt-5">
            {isSignup ? "Already have an account? " : "New to Nexus? "}
            <Link to={isSignup ? "/login" : "/signup"} className="font-bold underline" data-testid="auth-switch">
              {isSignup ? "Log in" : "Sign up"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
