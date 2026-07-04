"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/types";
import { deleteAccount, updateProfile } from "@/app/(app)/compte/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/app/(app)/compte/compte.module.css";

export function ProfileForm({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, {});

  return (
    <form action={action} className={styles.profileForm}>
      <div className={styles.field}>
        <Label htmlFor="name">Nom et prénom</Label>
        <Input id="name" name="name" defaultValue={profile.name ?? ""} required />
      </div>
      <div className={styles.field}>
        <Label htmlFor="account-email">E-mail de connexion</Label>
        <Input id="account-email" value={email} disabled />
      </div>
      <div className={styles.field}>
        <Label htmlFor="phone">Téléphone personnel</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="company-name">Entreprise</Label>
        <Input id="company-name" name="company_name" defaultValue={profile.company_name ?? ""} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="job-title">Métier / fonction</Label>
        <Input id="job-title" name="job_title" defaultValue={profile.job_title ?? ""} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="business-email">E-mail professionnel</Label>
        <Input id="business-email" name="business_email" type="email" defaultValue={profile.business_email ?? ""} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="siret">SIRET</Label>
        <Input id="siret" name="siret" inputMode="numeric" defaultValue={profile.siret ?? ""} />
      </div>
      <div className={`${styles.field} ${styles.fieldWide}`}>
        <Label htmlFor="address">Adresse professionnelle</Label>
        <Input id="address" name="address" defaultValue={profile.address ?? ""} />
      </div>
      <div className={styles.formFooter}>
        <span aria-live="polite">
          {state.error && <small className={styles.error}>{state.error}</small>}
          {state.message && <small className={styles.success}>{state.message}</small>}
        </span>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, {});

  return (
    <form action={action} className={styles.deleteForm}>
      <div>
        <Label htmlFor="delete-confirmation">
          Écris <strong>SUPPRIMER</strong> pour confirmer
        </Label>
        <Input
          id="delete-confirmation"
          name="confirmation"
          autoComplete="off"
          required
        />
      </div>
      {state.error && <small className={styles.error}>{state.error}</small>}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Suppression…" : "Supprimer définitivement mon compte"}
      </Button>
    </form>
  );
}
