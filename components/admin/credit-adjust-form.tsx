"use client";

import { useActionState } from "react";
import { adjustCredits, type AdminActionState } from "@/app/[adminKey]/admin-actions";

const initial: AdminActionState = {};

export function CreditAdjustForm({ userId, balance }: { userId: string; balance: number }) {
  const [state, action, pending] = useActionState(adjustCredits, initial);
  return (
    <form action={action} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
      <input type="hidden" name="userId" value={userId} />
      <label>
        Nouveau solde
        <input name="target" type="number" min="0" max="10000000" defaultValue={balance} required />
      </label>
      <label>
        Motif obligatoire
        <input name="reason" minLength={3} maxLength={500} placeholder="Geste commercial…" required />
      </label>
      <button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Ajuster"}</button>
      {state.error && <span role="alert" style={{ color: "#ff9ca3" }}>{state.error}</span>}
      {state.message && <span role="status" style={{ color: "#8ee4b5" }}>{state.message}</span>}
    </form>
  );
}

