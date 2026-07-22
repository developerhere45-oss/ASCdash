"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, User } from "firebase/auth";
import { Building2, FileBadge2, Headphones, ImageIcon, LockKeyhole, MapPin, Phone, Send, ShieldCheck, TrendingUp, UserRound, X } from "lucide-react";
import { CompanyBrand, GoogleMark } from "@/components/company/company-brand";
import { companyBackendUrl, companyFirebaseAuth, companyGoogleProvider } from "@/lib/company-firebase";

type UploadKey = "license" | "ownerId" | "logo";

export default function CompanyRegisterPage() {
  const router = useRouter();
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [form, setForm] = useState({ companyName: "", licenseNumber: "", ownerName: "", ownerMobile: "", address: "", areaDraft: "" });
  const [areas, setAreas] = useState<string[]>([]);
  const [files, setFiles] = useState<Partial<Record<UploadKey, File>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const verifiedEmail = googleUser?.email || "";
  const canSubmit = useMemo(() => form.companyName && form.licenseNumber && form.ownerName && /^\d{10}$/.test(form.ownerMobile) && form.address && areas.length > 0 && files.license && files.ownerId && files.logo, [form, areas, files]);

  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  function addArea() {
    const value = form.areaDraft.trim();
    if (!value || areas.some((area) => area.toLowerCase() === value.toLowerCase())) return;
    setAreas((current) => [...current, value]);
    update("areaDraft", "");
  }
  async function connectGoogle() {
    setError("");
    try { setGoogleUser((await signInWithPopup(companyFirebaseAuth(), companyGoogleProvider)).user); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Google verification failed."); }
  }
  async function uploadDocument(token: string, file: File, documentType: string) {
    const data = new FormData();
    data.append("document", file);
    data.append("documentType", documentType);
    const response = await fetch(`${companyBackendUrl}/api/partners/documents`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: data });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || `Unable to upload ${file.name}`);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) { setError("Please complete every required field, coverage area and document."); return; }
    setLoading(true); setError("");
    try {
      const user = googleUser || (await signInWithPopup(companyFirebaseAuth(), companyGoogleProvider)).user;
      setGoogleUser(user);
      const token = await user.getIdToken(true);
      const response = await fetch(`${companyBackendUrl}/api/partners/profile`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.ownerName, phone: form.ownerMobile, email: user.email || "", businessType: "laundry",
          serviceCategory: ["laundry", "cleaning"], city: areas[0], serviceArea: form.address, workingAreas: areas,
          residentialAddress: form.address, isOnline: false,
          laundryBusiness: { shopName: form.companyName, shopLicenseNumber: form.licenseNumber, shopLocation: form.address, ownerName: form.ownerName, ownerPhone: form.ownerMobile, staffMembers: [] }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Company registration could not be submitted.");
      await uploadDocument(token, files.license!, "laundry_shop_license");
      await uploadDocument(token, files.ownerId!, "id_proof");
      const logoData = new FormData(); logoData.append("photo", files.logo!);
      const logoResponse = await fetch(`${companyBackendUrl}/api/partners/profile-photo`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: logoData });
      if (!logoResponse.ok) throw new Error("Company logo upload failed.");
      router.replace("/company/dashboard?registered=1");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Registration failed."); }
    finally { setLoading(false); }
  }

  return (
    <main className="company-auth-page company-register-page">
      <CompanyBrand action="/company/login" actionLabel="Login" />
      <form className="company-register-card" onSubmit={submit}>
        <div className="company-store-icon"><Building2 size={27} /></div>
        <h1>Register Your Company</h1><div className="company-title-line" />
        <p>Join ApnaServo as a verified service company and grow your business.</p>
        <div className="company-trust-strip">
          <span><ShieldCheck /><b>100% Verified Companies</b><small>Build trust with customers</small></span>
          <span><TrendingUp /><b>More Business</b><small>Get more service requests</small></span>
          <span><Headphones /><b>24/7 Support</b><small>We&apos;re here to help you</small></span>
        </div>
        <button type="button" className="company-google-verify" onClick={connectGoogle}><GoogleMark />{verifiedEmail ? `Verified: ${verifiedEmail}` : "Verify company owner with Google"}</button>
        <div className="company-form-grid">
          <CompanyField label="Company Name" value={form.companyName} onChange={(v) => update("companyName", v)} icon={<Building2 />} placeholder="Enter company name" />
          <CompanyField label="License Number" value={form.licenseNumber} onChange={(v) => update("licenseNumber", v)} icon={<FileBadge2 />} placeholder="Enter license number" />
          <CompanyField label="Owner Name" value={form.ownerName} onChange={(v) => update("ownerName", v)} icon={<UserRound />} placeholder="Enter owner full name" />
          <CompanyField label="Owner Mobile Number" value={form.ownerMobile} onChange={(v) => update("ownerMobile", v.replace(/\D/g, "").slice(0, 10))} icon={<Phone />} placeholder="Enter mobile number" inputMode="numeric" />
          <CompanyField wide label="Company Address" value={form.address} onChange={(v) => update("address", v)} icon={<MapPin />} placeholder="Enter complete company address" />
          <div className="company-field company-field-wide"><label>Areas Your Company Can Cover <b>*</b></label><div className="company-area-input">{areas.map((area) => <span key={area}>{area}<button type="button" onClick={() => setAreas((current) => current.filter((item) => item !== area))}><X size={13} /></button></span>)}<input value={form.areaDraft} onChange={(e) => update("areaDraft", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addArea(); } }} onBlur={addArea} placeholder={areas.length ? "Add another area" : "Type an area and press Enter"} /></div></div>
        </div>
        <div className="company-upload-label">Upload Documents <b>*</b></div>
        <div className="company-upload-grid">
          <UploadBox title="Business License" note="PDF, JPG or PNG (Max. 5MB)" icon={<FileBadge2 />} file={files.license} accept=".pdf,image/png,image/jpeg" onFile={(file) => setFiles((v) => ({ ...v, license: file }))} />
          <UploadBox title="Owner ID Proof" note="PDF, JPG or PNG (Max. 5MB)" icon={<UserRound />} file={files.ownerId} accept=".pdf,image/png,image/jpeg" onFile={(file) => setFiles((v) => ({ ...v, ownerId: file }))} />
          <UploadBox title="Company Logo" note="JPG or PNG (Max. 5MB)" icon={<ImageIcon />} file={files.logo} accept="image/png,image/jpeg" onFile={(file) => setFiles((v) => ({ ...v, logo: file }))} />
        </div>
        {error ? <div className="company-form-error">{error}</div> : null}
        <button className="company-submit" disabled={loading}><Send size={18} />{loading ? "Submitting securely..." : "Submit for Verification"}</button>
        <div className="company-secure-note"><LockKeyhole size={15} /> Your information is secure and only used for verification.</div>
      </form>
    </main>
  );
}

function CompanyField({ label, value, onChange, icon, placeholder, wide, inputMode }: { label: string; value: string; onChange: (value: string) => void; icon: React.ReactNode; placeholder: string; wide?: boolean; inputMode?: "numeric" }) {
  return <div className={`company-field ${wide ? "company-field-wide" : ""}`}><label>{label} <b>*</b></label><div>{icon}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} /></div></div>;
}
function UploadBox({ title, note, icon, file, accept, onFile }: { title: string; note: string; icon: React.ReactNode; file?: File; accept: string; onFile: (file: File) => void }) {
  return <label className="company-upload-box"><span>{icon}</span><div><b>{title}</b><small>{file?.name || `Upload valid ${title.toLowerCase()}`}</small><em>{file ? "Replace Document" : "Upload Document"}</em><small>{note}</small></div><input type="file" hidden accept={accept} onChange={(event) => { const selected = event.target.files?.[0]; if (selected && selected.size <= 5 * 1024 * 1024) onFile(selected); }} /></label>;
}

