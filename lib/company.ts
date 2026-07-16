export const COMPANY = {
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "Wayne Web",
  tradeName: "Wayne Web Flux",
  legalForm: process.env.NEXT_PUBLIC_COMPANY_LEGAL_FORM || "SAS",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Adresse communiquée sur demande",
  siret: process.env.NEXT_PUBLIC_COMPANY_SIRET || "SIRET communiquée sur demande",
  vat: process.env.NEXT_PUBLIC_COMPANY_VAT || "Applicable pour tous les vendeurs",
  email: process.env.NEXT_PUBLIC_BILLING_EMAIL || "nwh.studios.972@gmail.com",
  host: process.env.NEXT_PUBLIC_HOST_NAME || "NoWhereStudios",
};
