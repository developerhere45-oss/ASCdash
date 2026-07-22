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
  return <span className="google-mark" aria-hidden="true">G</span>;
}

