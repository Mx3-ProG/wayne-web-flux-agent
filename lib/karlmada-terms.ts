import type { Locale } from "@/lib/i18n/config";

// Catégories de contenu ILLICITE (biens/services interdits à la vente ou à la
// promotion). KarlMada ne bloque QUE ces catégories — jamais la grossièreté
// seule, qui n'est pas illicite et générait des faux positifs.
export type IllicitCategory = "adult" | "drugs" | "weapons" | "illegal";

export type TermGroup = {
  category: IllicitCategory;
  terms: readonly string[];
};

// Bibliothèque de termes illicites PAR LANGUE. On vérifie le contenu d'une page
// contre la liste de SA langue (page.default_locale) — plus jamais le mélange
// global anglais+français qui bloquait « sale » (soldes), « pet » (animalerie),
// etc. Les termes sont volontairement SPÉCIFIQUES et, quand un mot isolé serait
// ambigu (« arme », « pot »…), exprimés en locutions d'intention commerciale
// (« vente d'arme », « drug dealing »).
//
// Latin (fr/en/es/de/it) : comparaison MOT-ENTIER après normalisation
// (accents + leetspeak). Scripts non latins (ru/zh/ja/ar) : comparaison en
// SOUS-CHAÎNE (pas de frontières de mots exploitables).
export const ILLICIT_TERMS: Record<Locale, readonly TermGroup[]> = {
  fr: [
    { category: "adult", terms: [
      "porno", "pornographie", "pornographique", "escort", "escorte sexuelle",
      "camgirl", "onlyfans", "massage erotique", "service sexuel", "services sexuels",
      "prostitution", "proxenetisme", "vente de sexe", "sexe tarife", "contenu adulte",
    ] },
    { category: "drugs", terms: [
      "cocaine", "heroine", "methamphetamine", "crack", "ecstasy", "ketamine",
      "vente de drogue", "trafic de drogue", "achat de drogue", "trafic de stupefiant",
      "stupefiants a vendre", "dealer de drogue", "cannabis a vendre", "weed a vendre",
    ] },
    { category: "weapons", terms: [
      "arme a feu", "armes a feu", "vente d arme", "vente d armes", "trafic d arme",
      "trafic d armes", "kalachnikov", "fusil d assaut", "munition illegale",
      "explosif artisanal", "bombe artisanale", "arme non declaree",
    ] },
    { category: "illegal", terms: [
      "faux papiers", "faux billets", "fausse monnaie", "carte bancaire volee",
      "cartes volees", "blanchiment d argent", "contrefacon", "pirater un compte",
      "service de piratage", "donnees volees", "traite humaine", "tueur a gages",
      "fraude fiscale", "papiers falsifies", "permis falsifie",
    ] },
  ],
  en: [
    { category: "adult", terms: [
      "porn", "pornography", "escort service", "escort services", "camgirl",
      "onlyfans", "sexual services", "prostitution", "pimping", "adult content",
      "sex for money", "erotic massage",
    ] },
    { category: "drugs", terms: [
      "cocaine", "heroin", "methamphetamine", "crystal meth", "crack cocaine",
      "buy weed", "weed for sale", "sell drugs", "drug dealing", "drug trafficking",
      "buy cocaine", "ecstasy pills",
    ] },
    { category: "weapons", terms: [
      "firearm for sale", "buy a gun illegally", "gun trafficking", "assault rifle",
      "kalashnikov", "illegal ammunition", "homemade explosive", "pipe bomb",
      "unregistered firearm",
    ] },
    { category: "illegal", terms: [
      "fake id", "fake ids", "counterfeit money", "stolen credit card", "stolen cards",
      "money laundering", "counterfeit goods", "hack an account", "hacking service",
      "stolen data", "human trafficking", "hitman for hire", "hire a hitman",
      "tax fraud", "forged documents",
    ] },
  ],
  es: [
    { category: "adult", terms: [
      "porno", "pornografia", "escort", "servicios sexuales", "prostitucion",
      "proxenetismo", "contenido para adultos", "masaje erotico", "sexo de pago",
    ] },
    { category: "drugs", terms: [
      "cocaina", "heroina", "metanfetamina", "vender droga", "trafico de droga",
      "comprar droga", "narcotrafico", "marihuana a la venta", "extasis",
    ] },
    { category: "weapons", terms: [
      "arma de fuego", "venta de armas", "trafico de armas", "fusil de asalto",
      "kalashnikov", "municion ilegal", "explosivo casero", "bomba casera",
    ] },
    { category: "illegal", terms: [
      "documentos falsos", "dinero falso", "tarjeta robada", "blanqueo de dinero",
      "lavado de dinero", "falsificacion", "hackear una cuenta", "datos robados",
      "trata de personas", "sicario", "fraude fiscal",
    ] },
  ],
  de: [
    { category: "adult", terms: [
      "porno", "pornografie", "escort", "sexdienste", "prostitution", "zuhalterei",
      "erotische massage", "sexservice", "sex gegen geld",
    ] },
    { category: "drugs", terms: [
      "kokain", "heroin", "methamphetamin", "crystal meth", "drogen verkaufen",
      "drogenhandel", "drogen kaufen", "cannabis verkauf", "ecstasy",
    ] },
    { category: "weapons", terms: [
      "schusswaffe", "waffen verkauf", "waffenhandel", "sturmgewehr", "kalaschnikow",
      "illegale munition", "selbstgebaute bombe", "rohrbombe",
    ] },
    { category: "illegal", terms: [
      "gefalschte ausweise", "falschgeld", "gestohlene kreditkarte", "geldwasche",
      "produktfalschung", "konto hacken", "gestohlene daten", "menschenhandel",
      "auftragsmorder", "steuerbetrug",
    ] },
  ],
  it: [
    { category: "adult", terms: [
      "porno", "pornografia", "escort", "servizi sessuali", "prostituzione",
      "sfruttamento della prostituzione", "contenuti per adulti", "massaggio erotico",
    ] },
    { category: "drugs", terms: [
      "cocaina", "eroina", "metanfetamina", "vendere droga", "traffico di droga",
      "comprare droga", "spaccio di droga", "ecstasy",
    ] },
    { category: "weapons", terms: [
      "arma da fuoco", "vendita di armi", "traffico di armi", "fucile d assalto",
      "kalashnikov", "munizioni illegali", "bomba artigianale",
    ] },
    { category: "illegal", terms: [
      "documenti falsi", "denaro falso", "carta rubata", "riciclaggio di denaro",
      "contraffazione", "hackerare un account", "dati rubati", "tratta di esseri umani",
      "sicario", "frode fiscale",
    ] },
  ],
  ru: [
    { category: "adult", terms: [
      "порнография", "порно", "эскорт услуги", "проституция", "сутенёрство",
      "интим услуги", "секс за деньги",
    ] },
    { category: "drugs", terms: [
      "кокаин", "героин", "метамфетамин", "продажа наркотиков", "купить наркотики",
      "наркоторговля", "мефедрон", "закладки наркотики",
    ] },
    { category: "weapons", terms: [
      "продажа оружия", "купить оружие нелегально", "автомат калашникова",
      "нелегальные боеприпасы", "самодельная бомба", "оружие без лицензии",
    ] },
    { category: "illegal", terms: [
      "поддельные документы", "фальшивые деньги", "краденая карта", "отмывание денег",
      "контрафакт", "взлом аккаунта", "краденые данные", "торговля людьми",
      "киллер на заказ", "наёмный убийца",
    ] },
  ],
  zh: [
    { category: "adult", terms: [
      "色情", "情色服务", "卖淫", "嫖娼", "招妓", "裸聊", "色情服务",
    ] },
    { category: "drugs", terms: [
      "可卡因", "海洛因", "冰毒", "甲基苯丙胺", "摇头丸", "贩毒", "毒品交易", "买毒品",
    ] },
    { category: "weapons", terms: [
      "枪支买卖", "非法枪支", "贩卖军火", "军火交易", "制造炸弹", "非法弹药",
    ] },
    { category: "illegal", terms: [
      "假证件", "假钞", "假币", "盗刷信用卡", "洗钱", "假冒商品", "黑客服务",
      "盗取数据", "人口贩卖", "雇凶杀人",
    ] },
  ],
  ja: [
    { category: "adult", terms: [
      "児童ポルノ", "売春斡旋", "児童買春", "売春の勧誘",
    ] },
    { category: "drugs", terms: [
      "麻薬", "覚醒剤", "コカイン", "ヘロイン", "大麻売買", "麻薬密売", "麻薬取引",
    ] },
    { category: "weapons", terms: [
      "拳銃密売", "銃器密売", "違法銃", "自動小銃", "爆弾製造",
    ] },
    { category: "illegal", terms: [
      "偽造書類", "偽札", "盗難カード", "マネーロンダリング", "資金洗浄", "偽ブランド品",
      "アカウント乗っ取り", "個人情報盗難", "人身売買", "殺し屋", "脱税",
    ] },
  ],
  ar: [
    { category: "adult", terms: [
      "اباحية", "إباحية", "دعارة", "بغاء", "خدمات جنسية", "محتوى اباحي",
    ] },
    { category: "drugs", terms: [
      "كوكايين", "هيروين", "ميثامفيتامين", "بيع المخدرات", "تجارة المخدرات",
      "ترويج المخدرات", "حشيش للبيع",
    ] },
    { category: "weapons", terms: [
      "سلاح ناري", "بيع الاسلحة", "تجارة السلاح", "بندقية هجومية", "ذخيرة غير قانونية",
      "قنبلة منزلية",
    ] },
    { category: "illegal", terms: [
      "اوراق مزورة", "عملة مزيفة", "بطاقة مسروقة", "غسيل الاموال", "تزوير",
      "اختراق حساب", "بيانات مسروقة", "الاتجار بالبشر", "قاتل ماجور", "تهرب ضريبي",
    ] },
  ],
};

// Termes universels, non ambigus dans TOUTES les langues (jamais un produit
// légitime de vitrine). Vérifiés en latin/mot-entier sur TOUT le contenu, quelle
// que soit sa langue — ils apparaissent souvent en caractères latins même dans
// un texte non latin (ex. « MDMA » sur une page japonaise).
export const ILLICIT_TERMS_COMMON: readonly TermGroup[] = [
  { category: "drugs", terms: [
    "mdma", "lsd", "ghb", "cocaine", "heroin", "heroine", "methamphetamine",
    "fentanyl", "ketamine",
  ] },
  { category: "weapons", terms: ["ak47", "ak 47", "kalashnikov", "kalachnikov"] },
  { category: "illegal", terms: [
    "ransomware", "child porn", "child pornography", "cp for sale",
  ] },
];
