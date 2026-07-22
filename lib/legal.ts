import type { Locale } from "@/lib/i18n/config";

// Textes légaux par défaut de la vitrine, générés avec des [À COMPLÉTER] (ou
// équivalent traduit) que le commerçant remplace quand il a 2 minutes. Rien
// ne bloque sans.
//
// Le gabarit "fr" cite du droit français (SIRET, TVA en euros...) : il n'est
// PAS traduit mot à mot pour les autres locales, ce qui ferait croire à une
// adaptation juridique locale qui n'existe pas (voir AGENTS.md / brief i18n,
// LOT 4). Chaque autre locale a son propre gabarit générique, écrit nativement
// dans sa langue, sans référence à un droit national précis, et portant un
// avertissement explicite en tête de chaque document invitant à une
// validation juridique locale avant publication.

export type LegalTexts = {
  mentions: string;
  cgv: string;
  confidentialite: string;
};

function frLegal(businessName: string): LegalTexts {
  const name = businessName || "[FLUX : WAYNE-WEB]";
  return {
    mentions: `MENTIONS LÉGALES

Éditeur du site :
${name}
Statut : SAS
SIRET :
Adresse : 1b rue guy pépin
E-mail : contact@flux-wayne.com
Téléphone : +33 7 63 57 28 64

Hébergement :
Ce site est hébergé par l'hébergeur choisi par l'éditeur.

Propriété intellectuelle :
L'ensemble des contenus de ce site (textes, images) est la propriété de l'éditeur, sauf mention contraire. Toute reproduction sans autorisation est interdite.`,
    cgv: `CONDITIONS GÉNÉRALES DE VENTE

1. Prestations
Les prestations proposées sont réalisées sur rendez-vous. Les tarifs affichés sont en euros, TTC.

2. Réservation
Toute réservation vaut acceptation des présentes conditions. Un rendez-vous est confirmé après validation du créneau.

3. Annulation / Retard
Toute annulation doit être signalée au moins de 24h à l'avance. En cas de retard, la prestation pourra être écourtée ou reportée.

4. Paiement
Le paiement s'effectue en ligne à l'issue de la prestation.

5. Responsabilité
Le client s'engage à signaler toute information utile (contre-indication, contrainte technique) avant la prestation.

Éditeur : ${name} — SIRET : `,
    confidentialite: `POLITIQUE DE CONFIDENTIALITÉ

Responsable du traitement :
${name} — contact@flux-wayne.com

Données collectées :
Lors d'une réservation, sont collectés : prénom, téléphone et/ou e-mail. Ces données servent uniquement à gérer le rendez-vous.

Conservation :
Les données sont conservées le temps nécessaire à la gestion des rendez-vous, puis supprimées.

Vos droits (RGPD) :
Vous pouvez à tout moment demander l'accès, la modification ou la suppression de vos données en écrivant à : [À COMPLÉTER : e-mail].

Aucune donnée n'est revendue à des tiers.`,
  };
}

// Gabarits génériques (sans référence à un droit national), un par locale
// non-fr. `warning` s'affiche en tête des trois documents.
const GENERIC: Record<
  Exclude<Locale, "fr">,
  {
    warning: string;
    mentionsTitle: string;
    editor: string;
    status: string;
    id: string;
    address: string;
    email: string;
    phone: string;
    hosting: string;
    hostingBody: string;
    ip: string;
    ipBody: string;
    cgvTitle: string;
    s1: string;
    s1Body: string;
    s2: string;
    s2Body: string;
    s3: string;
    s3Body: string;
    s4: string;
    s4Body: string;
    s5: string;
    s5Body: string;
    editorLine: string;
    privacyTitle: string;
    controller: string;
    collected: string;
    collectedBody: string;
    retention: string;
    retentionBody: string;
    rights: string;
    rightsBody: string;
    noResale: string;
    complete: string;
  }
> = {
  en: {
    warning:
      "⚠ Generic template — this document has not been reviewed by a lawyer. Have it checked against your country's regulations before publishing.",
    mentionsTitle: "LEGAL NOTICE",
    editor: "Site owner:",
    status: "Legal status:",
    id: "Business ID:",
    address: "Address:",
    email: "Email:",
    phone: "Phone:",
    hosting: "Hosting:",
    hostingBody: "This site is hosted by the host chosen by the owner.",
    ip: "Intellectual property:",
    ipBody:
      "All content on this site (text, images) is the property of the owner, unless stated otherwise. Any reproduction without permission is prohibited.",
    cgvTitle: "TERMS OF SALE",
    s1: "1. Services",
    s1Body: "Services are provided by appointment. Prices shown are in euros.",
    s2: "2. Booking",
    s2Body: "Any booking implies acceptance of these terms. An appointment is confirmed once the time slot is validated.",
    s3: "3. Cancellation / Lateness",
    s3Body:
      "Cancellations must be notified at least [TO COMPLETE: 24h] in advance. In case of lateness, the service may be shortened or rescheduled.",
    s4: "4. Payment",
    s4Body: "Payment is made [TO COMPLETE: on site, cash / card] at the end of the service.",
    s5: "5. Liability",
    s5Body:
      "The customer agrees to disclose any relevant information (allergy, contraindication, technical constraint) before the service.",
    editorLine: "Owner:",
    privacyTitle: "PRIVACY POLICY",
    controller: "Data controller:",
    collected: "Data collected:",
    collectedBody:
      "When booking, the following is collected: first name, phone and/or email. This data is only used to manage the appointment.",
    retention: "Retention:",
    retentionBody: "Data is kept for as long as needed to manage appointments, then deleted.",
    rights: "Your rights:",
    rightsBody: "You may request access to, correction of, or deletion of your data at any time by writing to: [TO COMPLETE: email].",
    noResale: "No data is sold to third parties.",
    complete: "[TO COMPLETE: First name LAST NAME]",
  },
  es: {
    warning:
      "⚠ Plantilla genérica — este documento no ha sido revisado por un abogado. Verifíquelo con la normativa de su país antes de publicarlo.",
    mentionsTitle: "AVISO LEGAL",
    editor: "Editor del sitio:",
    status: "Forma jurídica:",
    id: "Identificador fiscal:",
    address: "Dirección:",
    email: "Correo electrónico:",
    phone: "Teléfono:",
    hosting: "Alojamiento:",
    hostingBody: "Este sitio está alojado por el proveedor elegido por el editor.",
    ip: "Propiedad intelectual:",
    ipBody:
      "Todo el contenido de este sitio (textos, imágenes) es propiedad del editor, salvo indicación contraria. Queda prohibida su reproducción sin autorización.",
    cgvTitle: "CONDICIONES GENERALES DE VENTA",
    s1: "1. Servicios",
    s1Body: "Los servicios se prestan con cita previa. Los precios se muestran en euros.",
    s2: "2. Reserva",
    s2Body: "Toda reserva implica la aceptación de estas condiciones. La cita se confirma tras validar el horario.",
    s3: "3. Cancelación / Retraso",
    s3Body:
      "Las cancelaciones deben notificarse con al menos [COMPLETAR: 24h] de antelación. En caso de retraso, el servicio podrá acortarse o reprogramarse.",
    s4: "4. Pago",
    s4Body: "El pago se realiza [COMPLETAR: en el local, efectivo / tarjeta] al finalizar el servicio.",
    s5: "5. Responsabilidad",
    s5Body: "El cliente se compromete a informar de cualquier dato relevante (alergia, contraindicación, restricción técnica) antes del servicio.",
    editorLine: "Editor:",
    privacyTitle: "POLÍTICA DE PRIVACIDAD",
    controller: "Responsable del tratamiento:",
    collected: "Datos recabados:",
    collectedBody: "Al reservar se recogen: nombre, teléfono y/o correo electrónico, usados únicamente para gestionar la cita.",
    retention: "Conservación:",
    retentionBody: "Los datos se conservan el tiempo necesario para gestionar las citas y después se eliminan.",
    rights: "Sus derechos:",
    rightsBody: "Puede solicitar el acceso, la rectificación o la supresión de sus datos escribiendo a: [COMPLETAR: correo electrónico].",
    noResale: "Ningún dato se revende a terceros.",
    complete: "[COMPLETAR: Nombre APELLIDO]",
  },
  de: {
    warning:
      "⚠ Allgemeine Vorlage — dieses Dokument wurde nicht von einem Anwalt geprüft. Bitte vor der Veröffentlichung mit den Vorschriften Ihres Landes abgleichen.",
    mentionsTitle: "IMPRESSUM",
    editor: "Betreiber der Website:",
    status: "Rechtsform:",
    id: "Registernummer:",
    address: "Adresse:",
    email: "E-Mail:",
    phone: "Telefon:",
    hosting: "Hosting:",
    hostingBody: "Diese Website wird beim vom Betreiber gewählten Hoster gehostet.",
    ip: "Geistiges Eigentum:",
    ipBody:
      "Alle Inhalte dieser Website (Texte, Bilder) sind, sofern nicht anders angegeben, Eigentum des Betreibers. Jede Vervielfältigung ohne Genehmigung ist untersagt.",
    cgvTitle: "ALLGEMEINE GESCHÄFTSBEDINGUNGEN",
    s1: "1. Leistungen",
    s1Body: "Die angebotenen Leistungen erfolgen nach Terminvereinbarung. Angegebene Preise verstehen sich in Euro.",
    s2: "2. Buchung",
    s2Body: "Jede Buchung gilt als Zustimmung zu diesen Bedingungen. Ein Termin ist nach Bestätigung des Slots verbindlich.",
    s3: "3. Stornierung / Verspätung",
    s3Body:
      "Stornierungen sind mindestens [ERGÄNZEN: 24 Std.] im Voraus mitzuteilen. Bei Verspätung kann die Leistung verkürzt oder verschoben werden.",
    s4: "4. Zahlung",
    s4Body: "Die Zahlung erfolgt [ERGÄNZEN: vor Ort, bar / Karte] am Ende der Leistung.",
    s5: "5. Haftung",
    s5Body: "Der Kunde verpflichtet sich, relevante Informationen (Allergie, Gegenanzeige, technische Einschränkung) vor der Leistung mitzuteilen.",
    editorLine: "Betreiber:",
    privacyTitle: "DATENSCHUTZERKLÄRUNG",
    controller: "Verantwortlicher:",
    collected: "Erhobene Daten:",
    collectedBody: "Bei einer Buchung werden erhoben: Vorname, Telefonnummer und/oder E-Mail. Diese Daten dienen ausschließlich der Terminverwaltung.",
    retention: "Speicherdauer:",
    retentionBody: "Die Daten werden so lange gespeichert, wie es für die Terminverwaltung erforderlich ist, und danach gelöscht.",
    rights: "Ihre Rechte:",
    rightsBody: "Sie können jederzeit Auskunft, Berichtigung oder Löschung Ihrer Daten verlangen, indem Sie schreiben an: [ERGÄNZEN: E-Mail].",
    noResale: "Es werden keine Daten an Dritte verkauft.",
    complete: "[ERGÄNZEN: Vorname NACHNAME]",
  },
  it: {
    warning:
      "⚠ Modello generico — questo documento non è stato revisionato da un avvocato. Verificarlo rispetto alla normativa del proprio paese prima della pubblicazione.",
    mentionsTitle: "NOTE LEGALI",
    editor: "Titolare del sito:",
    status: "Forma giuridica:",
    id: "Partita IVA / identificativo:",
    address: "Indirizzo:",
    email: "E-mail:",
    phone: "Telefono:",
    hosting: "Hosting:",
    hostingBody: "Questo sito è ospitato dal provider scelto dal titolare.",
    ip: "Proprietà intellettuale:",
    ipBody:
      "Tutti i contenuti di questo sito (testi, immagini) sono di proprietà del titolare, salvo diversa indicazione. È vietata qualsiasi riproduzione non autorizzata.",
    cgvTitle: "CONDIZIONI GENERALI DI VENDITA",
    s1: "1. Prestazioni",
    s1Body: "Le prestazioni sono erogate su appuntamento. I prezzi indicati sono in euro.",
    s2: "2. Prenotazione",
    s2Body: "Ogni prenotazione implica l'accettazione delle presenti condizioni. L'appuntamento è confermato dopo la convalida della fascia oraria.",
    s3: "3. Annullamento / Ritardo",
    s3Body:
      "Le cancellazioni vanno comunicate con almeno [DA COMPLETARE: 24h] di anticipo. In caso di ritardo, la prestazione potrà essere ridotta o riprogrammata.",
    s4: "4. Pagamento",
    s4Body: "Il pagamento avviene [DA COMPLETARE: in loco, contanti / carta] al termine della prestazione.",
    s5: "5. Responsabilità",
    s5Body: "Il cliente si impegna a segnalare ogni informazione utile (allergia, controindicazione, vincolo tecnico) prima della prestazione.",
    editorLine: "Titolare:",
    privacyTitle: "INFORMATIVA SULLA PRIVACY",
    controller: "Titolare del trattamento:",
    collected: "Dati raccolti:",
    collectedBody: "Alla prenotazione vengono raccolti: nome, telefono e/o e-mail, usati solo per gestire l'appuntamento.",
    retention: "Conservazione:",
    retentionBody: "I dati sono conservati per il tempo necessario alla gestione degli appuntamenti, poi cancellati.",
    rights: "I tuoi diritti:",
    rightsBody: "Puoi richiedere in qualsiasi momento l'accesso, la rettifica o la cancellazione dei tuoi dati scrivendo a: [DA COMPLETARE: e-mail].",
    noResale: "Nessun dato viene rivenduto a terzi.",
    complete: "[DA COMPLETARE: Nome COGNOME]",
  },
  ru: {
    warning:
      "⚠ Типовой шаблон — этот документ не проверялся юристом. Перед публикацией сверьте его с законодательством вашей страны.",
    mentionsTitle: "ЮРИДИЧЕСКАЯ ИНФОРМАЦИЯ",
    editor: "Владелец сайта:",
    status: "Организационно-правовая форма:",
    id: "Регистрационный номер:",
    address: "Адрес:",
    email: "Эл. почта:",
    phone: "Телефон:",
    hosting: "Хостинг:",
    hostingBody: "Сайт размещён у хостинг-провайдера, выбранного владельцем.",
    ip: "Интеллектуальная собственность:",
    ipBody:
      "Все материалы сайта (тексты, изображения) являются собственностью владельца, если не указано иное. Любое воспроизведение без разрешения запрещено.",
    cgvTitle: "ОБЩИЕ УСЛОВИЯ ПРОДАЖИ",
    s1: "1. Услуги",
    s1Body: "Услуги оказываются по предварительной записи. Цены указаны в евро.",
    s2: "2. Бронирование",
    s2Body: "Любое бронирование означает согласие с настоящими условиями. Запись подтверждается после утверждения времени.",
    s3: "3. Отмена / Опоздание",
    s3Body:
      "Об отмене необходимо сообщить не менее чем за [ЗАПОЛНИТЬ: 24 часа]. В случае опоздания услуга может быть сокращена или перенесена.",
    s4: "4. Оплата",
    s4Body: "Оплата производится [ЗАПОЛНИТЬ: на месте, наличными / картой] по окончании услуги.",
    s5: "5. Ответственность",
    s5Body: "Клиент обязуется сообщить любую значимую информацию (аллергия, противопоказание, техническое ограничение) до оказания услуги.",
    editorLine: "Владелец:",
    privacyTitle: "ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ",
    controller: "Оператор данных:",
    collected: "Собираемые данные:",
    collectedBody: "При бронировании собираются: имя, телефон и/или эл. почта. Эти данные используются только для управления записью.",
    retention: "Хранение:",
    retentionBody: "Данные хранятся столько, сколько необходимо для управления записями, после чего удаляются.",
    rights: "Ваши права:",
    rightsBody: "Вы можете в любой момент запросить доступ, исправление или удаление ваших данных, написав по адресу: [ЗАПОЛНИТЬ: эл. почта].",
    noResale: "Данные не передаются третьим лицам.",
    complete: "[ЗАПОЛНИТЬ: Имя ФАМИЛИЯ]",
  },
  zh: {
    warning: "⚠ 通用模板——本文件尚未经律师审核。发布前请对照您所在国家/地区的法规进行核实。",
    mentionsTitle: "法律声明",
    editor: "网站所有者：",
    status: "法律形式：",
    id: "工商注册号：",
    address: "地址：",
    email: "电子邮箱：",
    phone: "电话：",
    hosting: "托管：",
    hostingBody: "本网站由所有者选择的托管服务商提供托管服务。",
    ip: "知识产权：",
    ipBody: "本网站的所有内容（文字、图片）均归所有者所有，另有说明者除外。未经许可不得转载或复制。",
    cgvTitle: "销售通用条款",
    s1: "一、服务",
    s1Body: "所提供的服务需预约进行。所示价格以欧元计。",
    s2: "二、预约",
    s2Body: "任何预约均视为接受本条款。预约在时段确认后生效。",
    s3: "三、取消/迟到",
    s3Body: "取消预约须至少提前【待补充：24小时】通知。如迟到，服务可能会被缩短或改期。",
    s4: "四、付款",
    s4Body: "付款方式为【待补充：现场支付，现金/银行卡】，于服务结束时支付。",
    s5: "五、责任",
    s5Body: "客户应在服务前告知任何相关信息（过敏、禁忌、技术限制等）。",
    editorLine: "所有者：",
    privacyTitle: "隐私政策",
    controller: "数据处理负责人：",
    collected: "收集的数据：",
    collectedBody: "预约时收集：姓名、电话和/或电子邮箱，仅用于管理预约。",
    retention: "保留期限：",
    retentionBody: "数据仅在管理预约所需的时间内保留，此后即被删除。",
    rights: "您的权利：",
    rightsBody: "您可随时通过以下方式要求查阅、更正或删除您的数据：【待补充：电子邮箱】。",
    noResale: "任何数据均不会转售给第三方。",
    complete: "【待补充：姓名】",
  },
  ja: {
    warning: "⚠ 汎用テンプレートです。この文書は弁護士による確認を受けていません。公開前に自国の法令に照らして確認してください。",
    mentionsTitle: "特定商取引法に基づく表記",
    editor: "サイト運営者：",
    status: "法的形態：",
    id: "登録番号：",
    address: "住所：",
    email: "メールアドレス：",
    phone: "電話番号：",
    hosting: "ホスティング：",
    hostingBody: "本サイトは運営者が選択したホスティング事業者上で運用されています。",
    ip: "知的財産：",
    ipBody: "本サイトのすべてのコンテンツ（文章・画像）は、特に明記のない限り運営者に帰属します。無断複製を禁じます。",
    cgvTitle: "販売に関する一般条件",
    s1: "1. サービス内容",
    s1Body: "提供するサービスは予約制です。表示価格はユーロ建てです。",
    s2: "2. 予約",
    s2Body: "予約を行うことで本条件に同意したものとみなされます。予約は枠の確定をもって成立します。",
    s3: "3. キャンセル・遅刻",
    s3Body: "キャンセルは少なくとも【要記入：24時間】前にご連絡ください。遅刻の場合、施術時間が短縮または変更される場合があります。",
    s4: "4. お支払い",
    s4Body: "お支払いは施術終了後、【要記入：現地にて、現金／カード】で行います。",
    s5: "5. 責任",
    s5Body: "お客様は施術前に、関連する情報（アレルギー、禁忌事項、技術的な制約等）を必ずお伝えください。",
    editorLine: "運営者：",
    privacyTitle: "プライバシーポリシー",
    controller: "データ管理者：",
    collected: "収集するデータ：",
    collectedBody: "予約時に、氏名・電話番号・メールアドレスを収集します。これらは予約管理のみに使用されます。",
    retention: "保管期間：",
    retentionBody: "データは予約管理に必要な期間のみ保管され、その後削除されます。",
    rights: "お客様の権利：",
    rightsBody: "データへのアクセス、訂正、削除は、次の連絡先までいつでもご請求いただけます：【要記入：メールアドレス】。",
    noResale: "データが第三者に販売されることはありません。",
    complete: "【要記入：氏名】",
  },
  ar: {
    warning: "⚠ نموذج عام — لم تتم مراجعة هذه الوثيقة من قِبل محامٍ. يُرجى التحقق منها وفق تشريعات بلدك قبل النشر.",
    mentionsTitle: "الإشعار القانوني",
    editor: "ناشر الموقع:",
    status: "الشكل القانوني:",
    id: "رقم السجل التجاري:",
    address: "العنوان:",
    email: "البريد الإلكتروني:",
    phone: "الهاتف:",
    hosting: "الاستضافة:",
    hostingBody: "يُستضاف هذا الموقع لدى مزوّد الاستضافة الذي اختاره الناشر.",
    ip: "الملكية الفكرية:",
    ipBody: "جميع محتويات هذا الموقع (نصوص، صور) هي ملك للناشر ما لم يُذكر خلاف ذلك. يُمنع أي نسخ دون إذن.",
    cgvTitle: "الشروط العامة للبيع",
    s1: "١. الخدمات",
    s1Body: "تُقدَّم الخدمات بموعد مسبق. الأسعار المعروضة باليورو.",
    s2: "٢. الحجز",
    s2Body: "أي حجز يعني الموافقة على هذه الشروط. يُؤكَّد الموعد بعد التحقق من الوقت المحدد.",
    s3: "٣. الإلغاء / التأخير",
    s3Body: "يجب الإبلاغ عن الإلغاء قبل [يُستكمل: 24 ساعة] على الأقل. في حال التأخير، قد تُختصر الخدمة أو تُؤجَّل.",
    s4: "٤. الدفع",
    s4Body: "يتم الدفع [يُستكمل: في المكان، نقدًا / بالبطاقة] عند انتهاء الخدمة.",
    s5: "٥. المسؤولية",
    s5Body: "يلتزم العميل بالإفصاح عن أي معلومة ذات صلة (حساسية، مانع، قيد تقني) قبل الخدمة.",
    editorLine: "الناشر:",
    privacyTitle: "سياسة الخصوصية",
    controller: "المسؤول عن معالجة البيانات:",
    collected: "البيانات المجمَّعة:",
    collectedBody: "عند الحجز، تُجمع البيانات التالية: الاسم، الهاتف و/أو البريد الإلكتروني، وتُستخدم فقط لإدارة الموعد.",
    retention: "مدة الاحتفاظ:",
    retentionBody: "تُحفظ البيانات للمدة اللازمة لإدارة المواعيد، ثم تُحذف.",
    rights: "حقوقك:",
    rightsBody: "يمكنك في أي وقت طلب الوصول إلى بياناتك أو تصحيحها أو حذفها بالكتابة إلى: [يُستكمل: البريد الإلكتروني].",
    noResale: "لا تُباع أي بيانات لأطراف ثالثة.",
    complete: "[يُستكمل: الاسم واللقب]",
  },
};

function genericLegal(businessName: string, locale: Exclude<Locale, "fr">): LegalTexts {
  const t = GENERIC[locale];
  const name = businessName || t.complete;
  return {
    mentions: `${t.warning}

${t.mentionsTitle}

${t.editor}
${name}
${t.status}
${t.id}
${t.address}
${t.email} contact@flux-wayne.com
${t.phone}

${t.hosting}
${t.hostingBody}

${t.ip}
${t.ipBody}`,
    cgv: `${t.warning}

${t.cgvTitle}

${t.s1}
${t.s1Body}

${t.s2}
${t.s2Body}

${t.s3}
${t.s3Body}

${t.s4}
${t.s4Body}

${t.s5}
${t.s5Body}

${t.editorLine} ${name}`,
    confidentialite: `${t.warning}

${t.privacyTitle}

${t.controller}
${name} — contact@flux-wayne.com

${t.collected}
${t.collectedBody}

${t.retention}
${t.retentionBody}

${t.rights}
${t.rightsBody}

${t.noResale}`,
  };
}

export function defaultLegal(businessName: string, locale: Locale = "fr"): LegalTexts {
  return locale === "fr" ? frLegal(businessName) : genericLegal(businessName, locale);
}
