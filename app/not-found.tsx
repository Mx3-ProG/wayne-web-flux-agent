import { ErrorScreen } from "@/components/error-screen";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return <ErrorScreen />;
}
