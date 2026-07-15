import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Bot, Building2, LayoutDashboard, Shield, Users } from "lucide-react";
import { adminEntryKey } from "@/lib/admin/config";
import { can, getAdminContext } from "@/lib/admin/auth";
import { MfaGate } from "@/components/admin/mfa-gate";
import { activateAdminMembership } from "./actions";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FLUX Control",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ adminKey: string }>;
}) {
  const { adminKey } = await params;
  const configuredKey = adminEntryKey();
  if (!configuredKey || adminKey !== configuredKey) notFound();

  const context = await getAdminContext();
  if (!context) notFound();
  if (!context.mfaVerified) {
    return <MfaGate onVerified={activateAdminMembership} />;
  }

  const base = `/${adminKey}`;
  const items = [
    { href: base, label: "Vue d’ensemble", icon: LayoutDashboard, show: true },
    { href: `${base}/utilisateurs`, label: "Utilisateurs", icon: Users, show: can(context.membership, "users.read") },
    { href: `${base}/boutiques`, label: "Boutiques", icon: Building2, show: can(context.membership, "sites.moderate") },
    { href: `${base}/flux`, label: "FLUX", icon: Bot, show: can(context.membership, "flux.review") },
    { href: `${base}/securite`, label: "Sécurité", icon: Shield, show: can(context.membership, "security.read") },
    { href: `${base}/equipe`, label: "Équipe", icon: Activity, show: context.membership.role === "superadmin" },
  ];

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href={base} className={styles.brand}>FLUX CONTROL</Link>
        <p className={styles.role}>{context.membership.role} · MFA</p>
        <nav className={styles.nav} aria-label="Administration">
          {items.filter((item) => item.show).map((item) => (
            <Link key={item.href} href={item.href}>
              <item.icon size={17} aria-hidden="true" /> {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>
        <div className={styles.topbar}>
          <small>{context.email}</small>
          <span className={`${styles.badge} ${styles.good}`}>Accès sécurisé AAL2</span>
        </div>
        {children}
      </main>
    </div>
  );
}

