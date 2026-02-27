import {
  HeadContent,
  Scripts,
  createRootRoute,
  Outlet,
} from "@tanstack/react-router";
import { ThemeProvider } from "better-themes";
import { TooltipProvider } from "@/components/ui/tooltip";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "Allegro Access — Uprawnienia" },
      {
        name: "description",
        content: "Zarządzanie uprawnieniami dostępu w systemie Allegro",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system">
          <TooltipProvider delayDuration={200}>
            <AppLayout />
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function AppLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

/* ─── Inline Header ───────────────────────────────── */
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";

function Header() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/40 bg-card/85 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          to="/permissions"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-orange-600 text-brand-foreground font-bold text-sm shadow-sm">
            A
          </span>
          <span className="text-lg font-bold tracking-tight">
            Allegro{" "}
            <span className="font-normal text-muted-foreground">Access</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-1">
          <Link
            to="/permissions"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg px-3 py-2 hover:bg-accent/50"
            activeProps={{ className: "text-sm font-medium text-brand bg-brand/6 rounded-lg px-3 py-2" }}
          >
            Uprawnienia
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
