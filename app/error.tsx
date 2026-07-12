"use client";

import { ErrorScreen } from "@/components/error-screen";

// Boundary d'erreur runtime de l'app (rendu à la place de la page en échec).
export default function AppError() {
  return <ErrorScreen />;
}
