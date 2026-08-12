"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { getRedirectResult, GoogleAuthProvider, signInWithCredential, signInWithPopup, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { CompanyBrand, GoogleMark } from "@/components/company/company-brand";
import { companyBackendUrl, companyFirebaseAuth, companyGoogleProvider } from "@/lib/company-firebase";

const googleWebClientId =
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "525255192682-0n4dnbed39j3h1706j6u5egr2so595up.apps.googleusercontent.com";

type GoogleIdentityApi = {
  accounts: {
    oauth2: {
      initTokenClient: (options: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
        error_callback?: (error: { type?: string }) => void;
      }) => { requestAccessToken: (options?: { prompt?: string }) => void };
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  if (window.google) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    const script = existing || document.createElement("script");
    const done = () => window.google ? resolve(window.google) : reject(new Error("Google Identity did not initialize."));
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => reject(new Error("Google Identity could not load.")), { once: true });
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      document.head.appendChild(script);
    }
  });
}

async function signInWithGoogleIdentity() {
  const google = await loadGoogleIdentity();
  const accessToken = await new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: googleWebClientId,
      scope: "openid email profile",
      callback: (response) => response.access_token ? resolve(response.access_token) : reject(new Error(response.error || "Google did not return an access token.")),
      error_callback: (error) => reject(new Error(`Google sign-in popup failed: ${error.type || "unknown error"}`)),
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
  return signInWithCredential(companyFirebaseAuth(), GoogleAuthProvider.credential(null, accessToken));
}

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
      const friendly = messages[caught.code] || "Google sign-in failed.";
      setError(`${friendly} (${caught.code}: ${caught.message})`);
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
      if (caught instanceof FirebaseError) {
        try {
          const result = await signInWithGoogleIdentity();
          await finishCompanyLogin(result.user);
          return;
        } catch (credentialError) {
          showLoginError(credentialError);
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
