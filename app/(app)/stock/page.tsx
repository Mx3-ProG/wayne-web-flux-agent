import { redirect } from "next/navigation";

// La gestion du stock a été fusionnée dans la page Produits.
export default function StockRedirect() {
  redirect("/produits");
}
