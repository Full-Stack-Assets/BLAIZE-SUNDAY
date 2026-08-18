import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-slate-800 p-8 space-y-3">
      <p className="section-label">404</p>
      <h1 className="text-xl text-bone">That Songforge record was not found.</h1>
      <Link className="text-[13px] text-accent" href="/">
        Return home
      </Link>
    </div>
  );
}
