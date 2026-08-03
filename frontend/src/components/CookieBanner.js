import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "@phosphor-icons/react";

const STORAGE_KEY = "nexus_cookie_notice_dismissed";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-6" data-testid="cookie-banner">
      <div className="max-w-xl mx-auto nb-card bg-white p-4 sm:p-5 flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 bg-[#FFD166] border-2 border-[#0A0A0A] rounded-lg flex items-center justify-center">
          <Cookie size={18} weight="bold" />
        </div>
        <div className="flex-1 text-sm font-medium text-[#0A0A0A]/80">
          We use one essential cookie to keep you logged in — no ads, no tracking. See our{" "}
          <Link to="/cookies" className="font-bold underline">Cookies Policy</Link> for details.
        </div>
        <button
          onClick={dismiss}
          className="nb-btn nb-btn-sec text-xs py-2 px-3 shrink-0"
          data-testid="cookie-banner-dismiss"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
