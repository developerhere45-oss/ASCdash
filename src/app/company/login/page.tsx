"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { CompanyBrand, GoogleMark } from "@/components/company/company-brand";
import { companyBackendUrl, companyFirebaseAuth, companyGoogleProvider } from "@/lib/company-firebase";

export default function CompanyLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loginWithGoogle() {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(companyFirebaseAuth(), companyGoogleProvider);
      const token = await result.user.getIdToken(true);
      const response = await fetch(`${companyBackendUrl}/api/partners/me`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      const partner = payload.partner || payload;
      if (!response.ok || !partner?._id) throw new Error(payload.message || "No company registration found for this Google account.");
      if (partner.businessType !== "laundry") throw new Error("This Google account is not registered as a company owner.");
      router.replace("/company/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="company-auth-page">
      <CompanyBrand action="/company/register" actionLabel="Register" />
      <section className="company-login-shell">
        <div className="company-login-card">
          <div className="company-store-icon"><Building2 size={31} /></div>
          <h1>Company Login</h1>
          <div className="company-title-line" />
          <p>Login securely to manage bookings and your team</p>
          <button type="button" className="company-google-button" onClick={loginWithGoogle} disabled={loading}>
            <GoogleMark />{loading ? "Connecting securely..." : "Login with Google"}
          </button>
          {error ? <div className="company-form-error">{error}</div> : null}
          <div className="company-login-help">
            <CheckCircle2 size={17} /> Use the same verified Google email added during company registration.
          </div>
          <div className="company-secure-note"><ShieldCheck size={18} /> Your information is secure and always protected.</div>
          <p className="company-login-register">Company not registered? <Link href="/company/register">Register for verification</Link></p>
        </div>
        <div className="company-scene" aria-hidden="true"><Building2 size={170} /><span>ApnaServo</span></div>
      </section>
    </main>
  );
}

