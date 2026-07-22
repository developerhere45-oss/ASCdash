"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Clock3, LogOut, MapPin } from "lucide-react";
import { CompanyBrand } from "@/components/company/company-brand";
import { companyBackendUrl, companyFirebaseAuth } from "@/lib/company-firebase";

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [registered, setRegistered] = useState(false);
  const [partner, setPartner] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("Loading company details...");

  useEffect(() => {
    setRegistered(new URLSearchParams(window.location.search).get("registered") === "1");
    return onAuthStateChanged(companyFirebaseAuth(), async (user) => {
      if (!user) { router.replace("/company/login"); return; }
      const response = await fetch(`${companyBackendUrl}/api/partners/me`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(payload.message || "Company profile unavailable."); return; }
      setPartner(payload.partner || payload);
    });
  }, [router]);

  const business = (partner?.laundryBusiness || {}) as Record<string, unknown>;
  return (
    <main className="company-auth-page">
      <CompanyBrand />
      <section className="company-dashboard-card">
        {registered ? <div className="company-success"><CheckCircle2 />Registration submitted successfully. Admin verification is now pending.</div> : null}
        <div className="company-dashboard-top">
          <div className="company-store-icon"><Building2 /></div>
          <div><h1>{String(business.shopName || "Company Dashboard")}</h1><p><MapPin size={15} />{String(business.shopLocation || partner?.serviceArea || "Service location")}</p></div>
          <button onClick={async () => { await signOut(companyFirebaseAuth()); router.replace("/company/login"); }}><LogOut size={16} />Logout</button>
        </div>
        {partner ? <div className="company-status-panel"><Clock3 /><div><b>Verification Status</b><p>{String(partner.businessVerificationStatus || "pending_review").replace(/_/g, " ")}</p></div></div> : <p>{message}</p>}
      </section>
    </main>
  );
}
