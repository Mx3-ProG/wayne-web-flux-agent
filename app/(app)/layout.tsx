import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays,
  Coins,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Store,
} from "lucide-react";
import styles from "./app-shell.module.css";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Recharge mensuelle paresseuse + solde à jour, affiché dans le header.
  const { data: balance } = await supabase.rpc("apply_monthly_topup", {
    uid: user.id,
  });

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/espace" className={styles.brand}>
            WAYNE<span>WEB</span><small>FLUX</small>
          </Link>
          <nav className={styles.desktopNav}>
            <Link
              href="/espace"
              className={styles.navLink}
            >
              <LayoutDashboard aria-hidden="true" /> Espace
            </Link>
            <Link
              href="/ma-page"
              className={styles.navLink}
            >
              <Store aria-hidden="true" /> Vitrine
            </Link>
            <Link
              href="/agenda"
              className={styles.navLink}
            >
              <CalendarDays aria-hidden="true" /> Agenda
            </Link>
            <Link
              href="/resultats"
              className={styles.navLink}
            >
              <FolderOpen aria-hidden="true" /> Contenus
            </Link>
          </nav>
          <div className={styles.actions}>
            <Link
              href="/credits"
              className={styles.credits}
            >
              <Coins aria-hidden="true" /> {balance ?? 0}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" aria-label="Ouvrir le menu">
                  <Menu aria-hidden="true" /> Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/espace">Mon espace</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/ma-page">Ma vitrine</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/agenda">Mon agenda</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/contexte">Ma voix</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/resultats">Mes contenus</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/credits">Mes crédits</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/compte">Mon compte</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <form action={signOut}>
                    <button type="submit" className="w-full text-left">
                      Se déconnecter
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
