"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/types";
import { deleteAccount, updateProfile } from "@/app/(app)/compte/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/app/(app)/compte/compte.module.css";
import type { AccountDict } from "@/lib/i18n/get-dictionary";

export function ProfileForm({
  profile,
  email,
  t,
}: {
  profile: Profile;
  email: string;
  t: AccountDict;
}) {
  const [state, action, pending] = useActionState(updateProfile, {});
  const f = t.profileForm;

  return (
    <form action={action} className={styles.profileForm}>
      <div className={styles.field}>
        <Label htmlFor="name">{f.name}</Label>
        <Input id="name" name="name" defaultValue={profile.name ?? ""} required />
      </div>
      <div className={styles.field}>
        <Label htmlFor="account-email">{f.email}</Label>
        <Input id="account-email" value={email} disabled />
      </div>
      <div className={styles.field}>
        <Label htmlFor="phone">{f.phone}</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="company-name">{f.company}</Label>
        <Input id="company-name" name="company_name" defaultValue={profile.company_name ?? ""} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="job-title">{f.job}</Label>
        <Input id="job-title" name="job_title" defaultValue={profile.job_title ?? ""} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="business-email">{f.businessEmail}</Label>
        <Input id="business-email" name="business_email" type="email" defaultValue={profile.business_email ?? ""} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="siret">{f.siret}</Label>
        <Input id="siret" name="siret" inputMode="numeric" defaultValue={profile.siret ?? ""} />
      </div>
      <div className={`${styles.field} ${styles.fieldWide}`}>
        <Label htmlFor="address">{f.address}</Label>
        <Input id="address" name="address" defaultValue={profile.address ?? ""} />
      </div>
      <div className={styles.formFooter}>
        <span aria-live="polite">
          {state.error && <small className={styles.error}>{state.error}</small>}
          {state.message && <small className={styles.success}>{state.message}</small>}
        </span>
        <Button type="submit" disabled={pending}>
          {pending ? f.saving : f.save}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAccountForm({ t }: { t: AccountDict }) {
  const [state, action, pending] = useActionState(deleteAccount, {});
  const d = t.danger;

  return (
    <form action={action} className={styles.deleteForm}>
      <div>
        <Label htmlFor="delete-confirmation">
          {d.confirmLabel.split("{word}")[0]}
          <strong>{d.confirmWord}</strong>
          {d.confirmLabel.split("{word}")[1]}
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
        {pending ? d.deleting : d.delete}
      </Button>
    </form>
  );
}
