"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { getRedirectResult, signInWithPopup, signInWithRedirect, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { CompanyBrand, GoogleMark } from "@/components/company/company-brand";
import { companyBackendUrl, companyFirebaseAuth, companyGoogleProvider } from "@/lib/company-firebase";

export default function CompanyLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function finishCompanyLogin(user: User) {
    const token = await user.getIdToken(true);
    const response = await fetch(`${companyBackendUrl}/api/partners/me`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json().catch(() => ({}));
    const partner = payload.partner || payload;
    if (!response.ok || !partner?._id) throw new Error(payload.message || "No company registration found for this Google account.");
    if (partner.businessType !== "laundry") throw new Error("This Google account is not registered as a company owner.");
    const approved = partner.businessVerificationStatus === "approved" && partner.kycStatus === "verified" && partner.isVerified === true && partner.trustStatus === "trusted" && partner.accountStatus !== "blocked" && partner.accountStatus !== "suspended";
    if (!approved) {
      router.replace("/company/verification");
      return;
    }
    router.replace("/company/dashboard");
  }

  function showLoginError(caught: unknown) {
    if (caught instanceof FirebaseError) {
      const messages: Record<string, string> = {
        "auth/unauthorized-domain": "This Render domain is not authorized in Firebase Authentication.",
        "auth/operation-not-allowed": "Google login is not enabled in Firebase Authentication.",
        "auth/popup-blocked": "Google sign-in was blocked. Please try again.",
        "auth/popup-closed-by-user": "Google sign-in was cancelled.",
        "auth/internal-error": "Google sign-in could not start. Please reload once and try again.",
      };
      setError(messages[caught.code] || `Google sign-in failed (${caught.code}).`);
    } else {
      setError(caught instanceof Error ? caught.message : "Google login failed. Please try again.");
    }
  }

  useEffect(() => {
    let active = true;
    getRedirectResult(companyFirebaseAuth()).then((result) => {
      if (!active || !result?.user) return;
      setLoading(true);
      return finishCompanyLogin(result.user);
    }).catch((caught) => { if (active) showLoginError(caught); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function loginWithGoogle() {
    setLoading(true); setError("");
    try {
      const result = await signInWithPopup(companyFirebaseAuth(), companyGoogleProvider);
      await finishCompanyLogin(result.user);
    } catch (caught) {
      // Some mobile browsers block a popup. Redirect remains a supported
      // fallback, while normal desktop login completes without a redirect.
      if (caught instanceof FirebaseError && caught.code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(companyFirebaseAuth(), companyGoogleProvider);
          return;
        } catch (redirectError) {
          showLoginError(redirectError);
        }
      } else {
        showLoginError(caught);
      }
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
            <GoogleMark />{loading ? "Connecting securely..." : "Sign in with Google"}
          </button>
          {error ? <div className="company-form-error">{error}</div> : null}
          <div className="company-login-help">
            <CheckCircle2 size={17} /> Use the same verified Google email added during company registration.
          </div>
          <div className="company-secure-note"><ShieldCheck size={18} /> Your information is secure and always protected.</div>
          <p className="company-login-register">Company not registered? <Link href="/company/register">Register for verification</Link></p>
        </div>
      </section>
    </main>
  );
}
