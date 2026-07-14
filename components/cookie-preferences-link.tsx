"use client";

export function CookiePreferencesLink() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("wayne:open-cookie-preferences"))}
    >
      Gérer les cookies
    </button>
  );
}

