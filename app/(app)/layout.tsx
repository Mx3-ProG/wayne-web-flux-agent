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
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border bg-black/60 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/espace" className="font-bold text-lg shrink-0">
            Wayne<span className="text-primary">Web</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link
              href="/espace"
              className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors"
            >
              Mon espace
            </Link>
            <Link
              href="/ma-page"
              className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors"
            >
              Ma vitrine
            </Link>
            <Link
              href="/agenda"
              className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors"
            >
              Mon agenda
            </Link>
            <Link
              href="/resultats"
              className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors"
            >
              Mes contenus
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/credits"
              className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-sm font-medium text-red-bright"
            >
              {balance ?? 0} crédits
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  Menu
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
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
