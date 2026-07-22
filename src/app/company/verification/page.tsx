"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { Building2, CheckCircle2, Clock3, FileSearch, LogOut, ShieldCheck, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyBrand } from "@/components/company/company-brand";
import { companyBackendUrl, companyFirebaseAuth } from "@/lib/company-firebase";

type Partner = Record<string, unknown>;

export default function CompanyVerificationPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [message, setMessage] = useState("");

  const checkStatus = useCallback(async (current: User) => {
    try {
      const token = await current.getIdToken(true);
      const response = await fetch(`${companyBackendUrl}/api/partners/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Registration status unavailable.");
      const profile = (payload.partner || payload) as Partner;
      setPartner(profile);
      const approved = profile.businessVerificationStatus === "approved" && profile.kycStatus === "verified" && profile.isVerified === true && profile.trustStatus === "trusted" && profile.accountStatus !== "blocked" && profile.accountStatus !== "suspended";
      if (approved) router.replace("/company/dashboard");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to check verification status.");
    }
  }, [router]);

  useEffect(() => onAuthStateChanged(companyFirebaseAuth(), (current) => {
    if (!current) { router.replace("/company/login"); return; }
    setUser(current); void checkStatus(current);
  }), [checkStatus, router]);
  useEffect(() => { if (!user) return; const timer = window.setInterval(() => void checkStatus(user), 15_000); return () => window.clearInterval(timer); }, [checkStatus, user]);

  const rejected = partner?.businessVerificationStatus === "rejected" || partner?.kycStatus === "rejected";
  const business = (partner?.laundryBusiness || {}) as Partner;
  return <main className="company-auth-page company-verification-page">
    <CompanyBrand />
    <section className="company-verification-card">
      <div className={`company-verification-icon ${rejected ? "rejected" : ""}`}>{rejected ? <XCircle /> : <Clock3 />}</div>
      <span className="company-verification-kicker">{rejected ? "Verification update" : "Application under review"}</span>
      <h1>{rejected ? "Registration Needs Attention" : "Verification in Progress"}</h1>
      <p>{rejected ? "Your company application was not approved. Please contact support or submit corrected details." : "Admin will verify your company details and documents. Your dashboard will unlock automatically after approval."}</p>
      <div className="company-verification-success"><CheckCircle2 />Registration received for admin verification</div>
      <div className="company-verification-company"><Building2 /><span><small>Registered company</small><b>{String(business.shopName || partner?.name || "ApnaServo Company")}</b></span><ShieldCheck /></div>
      <div className="company-verification-steps"><span className="done"><CheckCircle2 /><b>Application submitted</b></span><i /><span className="active"><FileSearch /><b>Admin verification</b></span><i /><span><ShieldCheck /><b>Dashboard access</b></span></div>
      {message ? <div className="company-form-error">{message}</div> : null}
      <div className="company-verification-actions"><button onClick={() => user && checkStatus(user)}>Check status</button><button className="secondary" onClick={async () => { await signOut(companyFirebaseAuth()); router.replace("/company/login"); }}><LogOut />Sign out</button></div>
      <small className="company-verification-refresh">Status refreshes automatically every 15 seconds.</small>
    </section>
  </main>;
}
