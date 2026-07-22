import Image from "next/image";
import Link from "next/link";

export function CompanyBrand({ action, actionLabel }: { action?: string; actionLabel?: string }) {
  return (
    <header className="company-header">
      <Link href="/company/login" className="company-logo-wrap" aria-label="ApnaServo company portal">
        <Image src="/apna-servo-wordmark.png" width={180} height={58} alt="ApnaServo" priority className="company-logo" />
        <span>Home Services At Your Doorstep</span>
      </Link>
      {action && actionLabel ? (
        <div className="company-header-action"><span>{actionLabel === "Login" ? "Already registered?" : "New company?"}</span><Link href={action}>{actionLabel} →</Link></div>
      ) : null}
    </header>
  );
}

export function GoogleMark() {
  return <svg className="google-official-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.13H3.06v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.32-1.86V7.52H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.48l3.34-2.62Z"/><path fill="#EA4335" d="M12 6.01c1.47 0 2.79.51 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.52l3.34 2.62C7.19 7.77 9.4 6.01 12 6.01Z"/></svg>;
}
