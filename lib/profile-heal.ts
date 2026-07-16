import "server-only";

import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

// Recrée la ligne profiles d'un utilisateur connecté quand elle a disparu.
//
// Le cas s'est produit en vrai (juillet 2026) : des lignes profiles supprimées
// à la main dans Supabase Studio — en croyant supprimer les comptes — pendant
// que auth.users, pages et credit_ledger restaient en place. Résultat : session
// valide mais profil introuvable, /compte en boucle de redirection muette,
// /espace renvoyé vers /commencer, et le tunnel dont les UPDATE ne touchaient
// aucune ligne, sans erreur.
//
// L'insert reproduit celui du trigger handle_new_user (user_id, email, name) ;
// toutes les autres colonnes ont un défaut. On ne recrée PAS les 100 crédits
// de bienvenue : le ledger du compte existe toujours, et un profil effacé ne
// doit pas devenir une pompe à crédits.
//
// RLS : la policy « own profile » (for all) autorise l'utilisateur à insérer
// SA ligne — le client serveur standard suffit, pas besoin du service role.
export async function healMissingProfile(db: Db, user: User): Promise<boolean> {
  const { error } = await db.from("profiles").insert({
    user_id: user.id,
    email: user.email ?? null,
    name: String(user.user_metadata?.name ?? "").slice(0, 80),
  });

  // 23505 (duplicate key) : la ligne vient d'être recréée par une requête
  // concurrente (layout et page s'exécutent en parallèle) — c'est un succès.
  if (error && error.code !== "23505") {
    console.error("profile-heal: recréation impossible", {
      userId: user.id,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  // Trace volontairement bruyante : un profil manquant reste une anomalie à
  // investiguer (qui l'a supprimé ?), même si l'utilisateur ne voit plus rien.
  console.warn("profile-heal: profil recréé pour un compte qui n'en avait plus", {
    userId: user.id,
    email: user.email,
  });
  return true;
}
