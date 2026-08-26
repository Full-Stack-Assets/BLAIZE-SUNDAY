"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PenLine,
  Layers,
  CheckCircle2,
  Radio,
  Settings,
  Music2,
  FolderKanban,
  Sparkles,
  Clapperboard,
  Send,
} from "lucide-react";

const nav = [
  { href: "/", label: "Lab", icon: PenLine },
  { href: "/video-lab", label: "Video", icon: Clapperboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/pipeline", label: "Pipeline", icon: Layers },
  { href: "/approvals", label: "Approvals", icon: CheckCircle2 },
  { href: "/releases", label: "Releases", icon: Radio },
  { href: "/distribution/routenote", label: "Distribute", icon: Send },
  { href: "/grow", label: "Grow", icon: Sparkles },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const videoFactory = pathname.startsWith("/video-lab");
  const HomeIcon = videoFactory ? Clapperboard : Music2;

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-void/90 backdrop-blur-md">
        <div className="flex items-center justify-between h-12 px-4 max-w-5xl mx-auto">
          <Link href={videoFactory ? "/video-lab" : "/"} className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 rounded-sm bg-accent/15 border border-accent/30 flex items-center justify-center">
              <HomeIcon className="w-3.5 h-3.5 text-accent" strokeWidth={2.5} />
            </div>
            <span className="text-[13px] font-medium tracking-tight text-bone group-hover:text-accent transition-colors">
              {videoFactory ? "Video Factory" : "Songforge"}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-[0.14em] text-ash/50 hidden sm:inline">
              {videoFactory ? "WISEBASE · CONNECTOR-MEDIATED" : "BLAIZE SUNDAY"}
            </span>
            <Link
              href="/settings"
              className="p-2 text-ash/60 hover:text-bone transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-24 pt-4">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-800/80 bg-void/95 backdrop-blur-md safe-bottom">
        <div className="flex items-center justify-around h-14 max-w-xl mx-auto px-1">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 h-12 rounded-lg transition-colors",
                  active
                    ? "text-accent"
                    : "text-ash/50 hover:text-ash"
                )}
              >
                <Icon
                  className={cn("w-[18px] h-[18px] shrink-0", active && "stroke-[2.25]")}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium tracking-wide sm:text-[10px]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
