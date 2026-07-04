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
  Coins,
  Menu,
} from "lucide-react";
import styles from "./app-shell.module.css";
import { AppNavigation } from "@/components/app-navigation";

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

  // Badges de la nav (hooks de rétention). La RLS limite déjà aux données des
  // pages du user connecté.
  const [{ count: pendingOrders }, { count: lowStock }] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("track_stock", true)
      .lte("stock", 0),
  ]);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/espace" className={styles.brand}>
          <span className={styles.brandMark}>W</span>
          <span className={styles.brandWords}>WAYNE<b>WEB</b><small>FLUX</small></span>
        </Link>
        <AppNavigation pendingOrders={pendingOrders ?? 0} lowStock={lowStock ?? 0} />
        <p className={styles.sidebarHint}>Ton commerce.<br />Un seul espace.</p>
      </aside>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.mobileBrand}>
            <span className={styles.brandMark}>W</span>
            <span>Wayne Web Flux</span>
          </div>
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
                  <Link href="/commandes">Mes commandes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/stock">Mon stock</Link>
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
      <AppNavigation mobile pendingOrders={pendingOrders ?? 0} lowStock={lowStock ?? 0} />
    </div>
  );
}
