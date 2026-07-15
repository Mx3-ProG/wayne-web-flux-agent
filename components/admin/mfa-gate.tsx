"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TotpEnrollment = {
  id: string;
  qr: string;
  secret: string;
};

export function MfaGate({ onVerified }: { onVerified: () => Promise<void> }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    async function prepare() {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const existing = data?.totp.find((factor) => factor.status === "verified");
      if (!active) return;
      if (existing) {
        setFactorId(existing.id);
        setBusy(false);
        return;
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Administration FLUX",
      });
      if (!active) return;
      if (enrollError || !enrolled) {
        setError("Impossible de préparer le second facteur.");
      } else {
        setFactorId(enrolled.id);
        setEnrollment({
          id: enrolled.id,
          qr: enrolled.totp.qr_code,
          secret: enrolled.totp.secret,
        });
      }
      setBusy(false);
    }
    void prepare();
    return () => {
      active = false;
    };
  }, []);

  async function verify() {
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError("Saisissez le code à 6 chiffres de votre application.");
      return;
    }
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (verifyError) {
      setError("Code incorrect ou expiré.");
      setBusy(false);
      return;
    }
    await onVerified();
    window.location.reload();
  }

  return (
    <section style={{ maxWidth: 520, margin: "8vh auto", padding: 32 }}>
      <p style={{ color: "#c7a54b", fontWeight: 800, letterSpacing: ".12em" }}>FLUX CONTROL</p>
      <h1>Double authentification obligatoire</h1>
      <p style={{ color: "#a7adbb", lineHeight: 1.6 }}>
        L’administration contient des données sensibles. Validez un code TOTP avant d’y accéder.
      </p>
      {enrollment && (
        <div style={{ background: "white", borderRadius: 16, padding: 18, display: "inline-block" }}>
          {/* Le QR est fourni comme data URL par Supabase. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qr} alt="QR code de configuration TOTP" width={220} height={220} />
          <p style={{ color: "#111", fontSize: 12, maxWidth: 220, overflowWrap: "anywhere" }}>
            Clé manuelle : {enrollment.secret}
          </p>
        </div>
      )}
      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          aria-label="Code TOTP"
          style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid #343947", fontSize: 18 }}
        />
        <button type="button" onClick={verify} disabled={busy} style={{ padding: "12px 18px", borderRadius: 10 }}>
          {busy ? "Vérification…" : "Continuer"}
        </button>
      </div>
      {error && <p role="alert" style={{ color: "#ff7d7d" }}>{error}</p>}
    </section>
  );
}

