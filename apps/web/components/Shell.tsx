import Link from "next/link";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="shell">
      <div className="container">
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark"><span>S</span></span>
            Songforge OS
          </Link>
          <nav className="nav" aria-label="Primary navigation">
            <Link href="/projects">Projects</Link>
            <Link href="/releases">Release Manager</Link>
            <Link href="/grow">Grow</Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
