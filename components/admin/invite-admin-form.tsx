"use client";

import { useActionState } from "react";
import { ADMIN_PERMISSION_OPTIONS } from "./permission-options";
import { inviteAdmin, type AdminActionState } from "@/app/[adminKey]/admin-actions";

const initial: AdminActionState = {};

export function InviteAdminForm() {
  const [state, action, pending] = useActionState(inviteAdmin, initial);
  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <label>Email<input name="email" type="email" required /></label>
      <label>Rôle
        <select name="role" defaultValue="admin">
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </label>
      <fieldset style={{ border: "1px solid #343a48", borderRadius: 10, padding: 12 }}>
        <legend>Permissions de l’admin</legend>
        {ADMIN_PERMISSION_OPTIONS.map((item) => (
          <label key={item.value} style={{ display: "flex", gap: 8, margin: "8px 0" }}>
            <input type="checkbox" name="permissions" value={item.value} /> {item.label}
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={pending}>{pending ? "Invitation…" : "Inviter"}</button>
      {state.error && <span role="alert" style={{ color: "#ff9ca3" }}>{state.error}</span>}
      {state.message && <span role="status" style={{ color: "#8ee4b5" }}>{state.message}</span>}
    </form>
  );
}

