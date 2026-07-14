export const COMPANY = {
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "Wayne Web",
  tradeName: "Wayne Web Flux",
  legalForm: process.env.NEXT_PUBLIC_COMPANY_LEGAL_FORM || "Entreprise individuelle",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Adresse communiquée sur demande",
  siret: process.env.NEXT_PUBLIC_COMPANY_SIRET || "À renseigner",
  vat: process.env.NEXT_PUBLIC_COMPANY_VAT || "Non applicable ou à renseigner",
  email: process.env.NEXT_PUBLIC_BILLING_EMAIL || "contact@wayne-web.com",
  host: process.env.NEXT_PUBLIC_HOST_NAME || "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
};
