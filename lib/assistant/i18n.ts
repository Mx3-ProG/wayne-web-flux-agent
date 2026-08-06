import type { Locale } from "@/lib/i18n/config";
import type { AssistantDestination } from "./types";
import type { FluxGuidanceMessage } from "./guidance";

export type AssistantCopy = {
  launcher: string; open: string; close: string; closeTip: string; guide: string;
  question: string; heading: string; storefrontHeading: string; intro: string; storefrontIntro: string;
  placeholder: string; storefrontPlaceholder: string; searchAria: string; find: string;
  results: string; noResult: string; noResultHint: string; quick: string; useful: string;
  view3d: string; backToHelp: string; mascot3d: string; mascot3dAria: string;
  pause: string; hour: string; day: string; week: string; disable: string;
  choose: string; stopQuestion: string; stopBody: string; keep: string;
  guides: string; takeMe: string; other: string;
  heroAria: string; heroOpen: string; heroHello: string; heroQuestion: string; heroCta: string;
  tipAria: string; hideTip: string; planHelp: string; recommendation: string; seePlan: string;
  preferencesTitle: string; preferencesBody: string; preferencesPaused: string; saved: string;
  enabled: string; disabled: string; resume: string;
  pageDescription: string; onboardingTitle: string; onboardingBody: string;
  appTitle: string; appBody: string; journeyTitle: string; journeyBody: string;
  marketingTitle: string; marketingBody: string;
};

const fr: AssistantCopy = {
  launcher:"Besoin d’aide ?",open:"Ouvrir l’assistant FLUX",close:"Fermer",closeTip:"Fermer le conseil",guide:"Ton guide",question:"Une question suffit",heading:"Je suis FLUX. Où veux-tu aller ?",storefrontHeading:"Comment puis-je vous aider ?",intro:"Écris simplement ce que tu cherches. Je t’emmène vers la bonne page, sans utiliser tes crédits.",storefrontIntro:"Décrivez ce que vous cherchez, je vous conduis au bon endroit.",placeholder:"Ex. ajouter mes horaires",storefrontPlaceholder:"Ex. prendre rendez-vous",searchAria:"Ce que tu cherches",find:"Trouver",results:"Voici les pages les plus proches",noResult:"Je n’ai pas trouvé de page assez proche.",noResultHint:"Essaie avec des mots simples comme « horaires », « commandes », « tarifs » ou « contact ».",quick:"Accès rapides",useful:"Utile maintenant",view3d:"Voir FLUX en personnage 3D",backToHelp:"Revenir à l’aide",mascot3d:"FLUX en trois dimensions",mascot3dAria:"Personnage FLUX en 3D, tu peux le faire tourner",pause:"Mettre les conseils en pause",hour:"1 heure",day:"1 jour",week:"7 jours",disable:"Désactiver",choose:"À toi de choisir",stopQuestion:"Tu ne veux plus de ces conseils ?",stopBody:"Tu as fermé ce conseil trois fois. Je peux arrêter les relances spontanées.",keep:"Garder FLUX",guides:"FLUX te guide",takeMe:"M’y emmener",other:"Autre chose",heroAria:"FLUX, ton guide pour découvrir l’application",heroOpen:"Ouvrir FLUX, le guide du site",heroHello:"Bonjour, je suis FLUX",heroQuestion:"Tu veux que je t’aide ?",heroCta:"Clique, je te guide simplement",tipAria:"Conseil de FLUX",hideTip:"Masquer ce conseil",planHelp:"Aide au choix de la formule",recommendation:"FLUX te recommande la formule",seePlan:"Voir cette formule",preferencesTitle:"Assistant FLUX",preferencesBody:"FLUX peut te proposer la prochaine étape et t’orienter dans le logiciel.",preferencesPaused:"Les conseils sont actuellement en pause.",saved:"Préférence enregistrée",enabled:"Activé",disabled:"Désactivé",resume:"Reprendre maintenant",pageDescription:"Ouvre cette page et FLUX te guidera vers la bonne action.",onboardingTitle:"Je te guide dans cette étape.",onboardingBody:"Complète les informations affichées. Ton avancée est sauvegardée et tu pourras toujours revenir en arrière.",appTitle:"Voici l’action principale de cette page.",appBody:"Je t’explique où aller et quoi faire, sans modifier tes données.",journeyTitle:"Voici ta prochaine étape utile.",journeyBody:"Cette action fait avancer ton parcours. Tu restes libre de la faire maintenant ou plus tard.",marketingTitle:"Je te montre le chemin le plus simple.",marketingBody:"Choisis ton objectif et je t’emmène vers la bonne page."
};

export const ASSISTANT_COPY: Record<Locale, AssistantCopy> = {
  fr,
  en:{launcher:"Need help?",open:"Open the FLUX assistant",close:"Close",closeTip:"Close this tip",guide:"Your guide",question:"One question is enough",heading:"I'm FLUX. Where would you like to go?",storefrontHeading:"How can I help you?",intro:"Simply write what you're looking for. I'll take you to the right page without using your credits.",storefrontIntro:"Describe what you're looking for and I'll take you to the right place.",placeholder:"E.g. add my opening hours",storefrontPlaceholder:"E.g. book an appointment",searchAria:"What you're looking for",find:"Find",results:"These are the closest pages",noResult:"I couldn't find a close enough page.",noResultHint:"Try simple words such as “hours”, “orders”, “pricing” or “contact”.",quick:"Quick links",useful:"Useful now",view3d:"View FLUX as a 3D character",backToHelp:"Back to help",mascot3d:"FLUX in 3D",mascot3dAria:"3D FLUX character; you can rotate it",pause:"Pause tips",hour:"1 hour",day:"1 day",week:"7 days",disable:"Disable",choose:"Your choice",stopQuestion:"Don't want these tips anymore?",stopBody:"You closed this tip three times. I can stop spontaneous reminders.",keep:"Keep FLUX",guides:"FLUX guides you",takeMe:"Take me there",other:"Something else",heroAria:"FLUX, your guide to the app",heroOpen:"Open FLUX, the site guide",heroHello:"Hi, I'm FLUX",heroQuestion:"Would you like some help?",heroCta:"Click and I'll guide you simply",tipAria:"Tip from FLUX",hideTip:"Hide this tip",planHelp:"Help choosing a plan",recommendation:"FLUX recommends the plan",seePlan:"View this plan",preferencesTitle:"FLUX assistant",preferencesBody:"FLUX can suggest your next step and guide you through the software.",preferencesPaused:"Tips are currently paused.",saved:"Preference saved",enabled:"Enabled",disabled:"Disabled",resume:"Resume now",pageDescription:"Open this page and FLUX will guide you to the right action.",onboardingTitle:"I'll guide you through this step.",onboardingBody:"Complete the information shown. Your progress is saved and you can always go back.",appTitle:"Here is the main action on this page.",appBody:"I'll explain where to go and what to do without changing your data.",journeyTitle:"Here is your next useful step.",journeyBody:"This action moves your journey forward. You can do it now or later.",marketingTitle:"I'll show you the simplest path.",marketingBody:"Choose your goal and I'll take you to the right page."},
  es:{launcher:"¿Necesitas ayuda?",open:"Abrir el asistente FLUX",close:"Cerrar",closeTip:"Cerrar este consejo",guide:"Tu guía",question:"Una pregunta es suficiente",heading:"Soy FLUX. ¿Adónde quieres ir?",storefrontHeading:"¿Cómo puedo ayudarle?",intro:"Escribe simplemente lo que buscas. Te llevaré a la página correcta sin usar tus créditos.",storefrontIntro:"Describa lo que busca y le llevaré al lugar correcto.",placeholder:"Ej. añadir mis horarios",storefrontPlaceholder:"Ej. reservar una cita",searchAria:"Lo que buscas",find:"Buscar",results:"Estas son las páginas más cercanas",noResult:"No he encontrado una página suficientemente cercana.",noResultHint:"Prueba palabras sencillas como «horarios», «pedidos», «precios» o «contacto».",quick:"Accesos rápidos",useful:"Útil ahora",view3d:"Ver a FLUX como personaje 3D",backToHelp:"Volver a la ayuda",mascot3d:"FLUX en tres dimensiones",mascot3dAria:"Personaje FLUX en 3D; puedes girarlo",pause:"Pausar los consejos",hour:"1 hora",day:"1 día",week:"7 días",disable:"Desactivar",choose:"Tú eliges",stopQuestion:"¿Ya no quieres estos consejos?",stopBody:"Has cerrado este consejo tres veces. Puedo detener los recordatorios espontáneos.",keep:"Conservar FLUX",guides:"FLUX te guía",takeMe:"Llévame allí",other:"Otra cosa",heroAria:"FLUX, tu guía para descubrir la aplicación",heroOpen:"Abrir FLUX, la guía del sitio",heroHello:"Hola, soy FLUX",heroQuestion:"¿Quieres que te ayude?",heroCta:"Haz clic y te guiaré fácilmente",tipAria:"Consejo de FLUX",hideTip:"Ocultar este consejo",planHelp:"Ayuda para elegir un plan",recommendation:"FLUX te recomienda el plan",seePlan:"Ver este plan",preferencesTitle:"Asistente FLUX",preferencesBody:"FLUX puede sugerirte el siguiente paso y orientarte por el programa.",preferencesPaused:"Los consejos están en pausa.",saved:"Preferencia guardada",enabled:"Activado",disabled:"Desactivado",resume:"Reanudar ahora",pageDescription:"Abre esta página y FLUX te guiará hacia la acción correcta.",onboardingTitle:"Te guío en este paso.",onboardingBody:"Completa la información mostrada. Tu progreso se guarda y siempre podrás volver atrás.",appTitle:"Esta es la acción principal de esta página.",appBody:"Te explico adónde ir y qué hacer sin modificar tus datos.",journeyTitle:"Este es tu siguiente paso útil.",journeyBody:"Esta acción hace avanzar tu recorrido. Puedes hacerla ahora o más tarde.",marketingTitle:"Te mostraré el camino más sencillo.",marketingBody:"Elige tu objetivo y te llevaré a la página correcta."},
  de:{launcher:"Brauchst du Hilfe?",open:"FLUX-Assistent öffnen",close:"Schließen",closeTip:"Hinweis schließen",guide:"Dein Guide",question:"Eine Frage genügt",heading:"Ich bin FLUX. Wohin möchtest du?",storefrontHeading:"Wie kann ich Ihnen helfen?",intro:"Schreib einfach, wonach du suchst. Ich bringe dich ohne Credits zur richtigen Seite.",storefrontIntro:"Beschreiben Sie, wonach Sie suchen, und ich bringe Sie zur richtigen Stelle.",placeholder:"Z. B. Öffnungszeiten hinzufügen",storefrontPlaceholder:"Z. B. Termin buchen",searchAria:"Was du suchst",find:"Finden",results:"Das sind die passendsten Seiten",noResult:"Ich habe keine ausreichend passende Seite gefunden.",noResultHint:"Versuche einfache Wörter wie „Öffnungszeiten“, „Bestellungen“, „Preise“ oder „Kontakt“.",quick:"Schnellzugriff",useful:"Jetzt hilfreich",view3d:"FLUX als 3D-Figur ansehen",backToHelp:"Zurück zur Hilfe",mascot3d:"FLUX in 3D",mascot3dAria:"3D-Figur FLUX; du kannst sie drehen",pause:"Hinweise pausieren",hour:"1 Stunde",day:"1 Tag",week:"7 Tage",disable:"Deaktivieren",choose:"Du entscheidest",stopQuestion:"Möchtest du diese Hinweise nicht mehr?",stopBody:"Du hast diesen Hinweis dreimal geschlossen. Ich kann spontane Erinnerungen stoppen.",keep:"FLUX behalten",guides:"FLUX führt dich",takeMe:"Dorthin",other:"Etwas anderes",heroAria:"FLUX, dein Guide durch die App",heroOpen:"FLUX, den Website-Guide, öffnen",heroHello:"Hallo, ich bin FLUX",heroQuestion:"Soll ich dir helfen?",heroCta:"Klicke und ich führe dich einfach",tipAria:"Tipp von FLUX",hideTip:"Diesen Tipp ausblenden",planHelp:"Hilfe bei der Tarifwahl",recommendation:"FLUX empfiehlt den Tarif",seePlan:"Diesen Tarif ansehen",preferencesTitle:"FLUX-Assistent",preferencesBody:"FLUX kann den nächsten Schritt vorschlagen und dich durch die Software führen.",preferencesPaused:"Die Hinweise sind derzeit pausiert.",saved:"Einstellung gespeichert",enabled:"Aktiviert",disabled:"Deaktiviert",resume:"Jetzt fortsetzen",pageDescription:"Öffne diese Seite und FLUX führt dich zur richtigen Aktion.",onboardingTitle:"Ich führe dich durch diesen Schritt.",onboardingBody:"Vervollständige die angezeigten Angaben. Dein Fortschritt wird gespeichert und du kannst jederzeit zurück.",appTitle:"Das ist die Hauptaktion dieser Seite.",appBody:"Ich erkläre dir, wohin du gehen und was du tun sollst, ohne deine Daten zu ändern.",journeyTitle:"Das ist dein nächster sinnvoller Schritt.",journeyBody:"Diese Aktion bringt deinen Weg voran. Du kannst sie jetzt oder später erledigen.",marketingTitle:"Ich zeige dir den einfachsten Weg.",marketingBody:"Wähle dein Ziel und ich bringe dich zur richtigen Seite."},
  it:{launcher:"Hai bisogno di aiuto?",open:"Apri l'assistente FLUX",close:"Chiudi",closeTip:"Chiudi il consiglio",guide:"La tua guida",question:"Basta una domanda",heading:"Sono FLUX. Dove vuoi andare?",storefrontHeading:"Come posso aiutarla?",intro:"Scrivi semplicemente cosa cerchi. Ti porto alla pagina giusta senza usare i tuoi crediti.",storefrontIntro:"Descriva cosa cerca e la porterò nel posto giusto.",placeholder:"Es. aggiungere gli orari",storefrontPlaceholder:"Es. prenotare un appuntamento",searchAria:"Cosa stai cercando",find:"Trova",results:"Ecco le pagine più vicine",noResult:"Non ho trovato una pagina abbastanza vicina.",noResultHint:"Prova parole semplici come “orari”, “ordini”, “prezzi” o “contatti”.",quick:"Accessi rapidi",useful:"Utile ora",view3d:"Vedi FLUX come personaggio 3D",backToHelp:"Torna all'aiuto",mascot3d:"FLUX in tre dimensioni",mascot3dAria:"Personaggio FLUX in 3D; puoi ruotarlo",pause:"Metti in pausa i consigli",hour:"1 ora",day:"1 giorno",week:"7 giorni",disable:"Disattiva",choose:"Scegli tu",stopQuestion:"Non vuoi più questi consigli?",stopBody:"Hai chiuso questo consiglio tre volte. Posso interrompere i promemoria spontanei.",keep:"Mantieni FLUX",guides:"FLUX ti guida",takeMe:"Portami lì",other:"Altro",heroAria:"FLUX, la tua guida all'app",heroOpen:"Apri FLUX, la guida del sito",heroHello:"Ciao, sono FLUX",heroQuestion:"Vuoi che ti aiuti?",heroCta:"Fai clic e ti guiderò con semplicità",tipAria:"Consiglio di FLUX",hideTip:"Nascondi questo consiglio",planHelp:"Aiuto nella scelta del piano",recommendation:"FLUX consiglia il piano",seePlan:"Vedi questo piano",preferencesTitle:"Assistente FLUX",preferencesBody:"FLUX può suggerirti il prossimo passo e guidarti nel software.",preferencesPaused:"I consigli sono in pausa.",saved:"Preferenza salvata",enabled:"Attivato",disabled:"Disattivato",resume:"Riprendi ora",pageDescription:"Apri questa pagina e FLUX ti guiderà all'azione giusta.",onboardingTitle:"Ti guido in questo passaggio.",onboardingBody:"Completa le informazioni mostrate. I progressi vengono salvati e puoi sempre tornare indietro.",appTitle:"Questa è l'azione principale della pagina.",appBody:"Ti spiego dove andare e cosa fare senza modificare i tuoi dati.",journeyTitle:"Ecco il prossimo passo utile.",journeyBody:"Questa azione fa avanzare il tuo percorso. Puoi farla ora o più tardi.",marketingTitle:"Ti mostro il percorso più semplice.",marketingBody:"Scegli il tuo obiettivo e ti porterò alla pagina giusta."},
  ru:{launcher:"Нужна помощь?",open:"Открыть помощника FLUX",close:"Закрыть",closeTip:"Закрыть подсказку",guide:"Ваш помощник",question:"Достаточно одного вопроса",heading:"Я FLUX. Куда вы хотите перейти?",storefrontHeading:"Чем я могу вам помочь?",intro:"Просто напишите, что вы ищете. Я открою нужную страницу без расхода кредитов.",storefrontIntro:"Опишите, что вы ищете, и я покажу нужное место.",placeholder:"Например, добавить часы работы",storefrontPlaceholder:"Например, записаться на прием",searchAria:"Что вы ищете",find:"Найти",results:"Наиболее подходящие страницы",noResult:"Мне не удалось найти достаточно подходящую страницу.",noResultHint:"Попробуйте простые слова: «часы», «заказы», «цены» или «контакты».",quick:"Быстрый доступ",useful:"Полезно сейчас",view3d:"Посмотреть FLUX в виде 3D-персонажа",backToHelp:"Вернуться к помощи",mascot3d:"FLUX в 3D",mascot3dAria:"3D-персонаж FLUX; его можно вращать",pause:"Приостановить подсказки",hour:"1 час",day:"1 день",week:"7 дней",disable:"Отключить",choose:"Вы решаете",stopQuestion:"Больше не нужны эти подсказки?",stopBody:"Вы закрыли эту подсказку три раза. Я могу прекратить автоматические напоминания.",keep:"Оставить FLUX",guides:"FLUX помогает",takeMe:"Перейти",other:"Другое",heroAria:"FLUX — ваш помощник в приложении",heroOpen:"Открыть FLUX, помощника сайта",heroHello:"Здравствуйте, я FLUX",heroQuestion:"Хотите, я помогу?",heroCta:"Нажмите — я помогу разобраться",tipAria:"Совет от FLUX",hideTip:"Скрыть совет",planHelp:"Помощь в выборе тарифа",recommendation:"FLUX рекомендует тариф",seePlan:"Посмотреть тариф",preferencesTitle:"Помощник FLUX",preferencesBody:"FLUX может предложить следующий шаг и помочь ориентироваться в программе.",preferencesPaused:"Подсказки приостановлены.",saved:"Настройка сохранена",enabled:"Включено",disabled:"Отключено",resume:"Возобновить",pageDescription:"Откройте эту страницу, и FLUX подскажет нужное действие.",onboardingTitle:"Я помогу пройти этот шаг.",onboardingBody:"Заполните показанные данные. Прогресс сохраняется, и вы всегда можете вернуться назад.",appTitle:"Вот главное действие на этой странице.",appBody:"Я объясню, куда перейти и что сделать, не изменяя ваши данные.",journeyTitle:"Вот следующий полезный шаг.",journeyBody:"Это действие продвигает вас вперед. Его можно выполнить сейчас или позже.",marketingTitle:"Я покажу самый простой путь.",marketingBody:"Выберите цель, и я открою нужную страницу."},
  zh:{launcher:"需要帮助吗？",open:"打开 FLUX 助手",close:"关闭",closeTip:"关闭提示",guide:"你的向导",question:"一个问题就够了",heading:"我是 FLUX。你想去哪里？",storefrontHeading:"我能为您做什么？",intro:"直接写下你要找的内容。我会带你到正确页面，而且不会消耗额度。",storefrontIntro:"请描述您要找的内容，我会带您到正确位置。",placeholder:"例如：添加营业时间",storefrontPlaceholder:"例如：预约",searchAria:"你要找的内容",find:"查找",results:"最相关的页面",noResult:"我没有找到足够匹配的页面。",noResultHint:"请尝试“营业时间”“订单”“价格”或“联系”等简单词语。",quick:"快速入口",useful:"现在有用",view3d:"查看 3D FLUX 角色",backToHelp:"返回帮助",mascot3d:"3D FLUX",mascot3dAria:"可旋转的 3D FLUX 角色",pause:"暂停提示",hour:"1 小时",day:"1 天",week:"7 天",disable:"停用",choose:"由你决定",stopQuestion:"不再需要这些提示吗？",stopBody:"你已关闭此提示三次。我可以停止主动提醒。",keep:"保留 FLUX",guides:"FLUX 为你指引",takeMe:"带我去",other:"其他内容",heroAria:"FLUX，你的应用向导",heroOpen:"打开网站向导 FLUX",heroHello:"你好，我是 FLUX",heroQuestion:"需要我帮忙吗？",heroCta:"点击后我会简单地为你指引",tipAria:"FLUX 提示",hideTip:"隐藏此提示",planHelp:"帮助选择方案",recommendation:"FLUX 推荐方案",seePlan:"查看此方案",preferencesTitle:"FLUX 助手",preferencesBody:"FLUX 可以建议下一步并帮助你使用软件。",preferencesPaused:"提示目前已暂停。",saved:"偏好已保存",enabled:"已启用",disabled:"已停用",resume:"立即恢复",pageDescription:"打开此页面，FLUX 会引导你完成正确操作。",onboardingTitle:"我会引导你完成这一步。",onboardingBody:"填写显示的信息。进度会保存，你可以随时返回。",appTitle:"这是本页的主要操作。",appBody:"我会说明去哪里、做什么，但不会修改你的数据。",journeyTitle:"这是你接下来最有用的一步。",journeyBody:"此操作会推进你的流程。你可以现在或稍后完成。",marketingTitle:"我会展示最简单的路径。",marketingBody:"选择目标，我会带你到正确页面。"},
  ja:{launcher:"お困りですか？",open:"FLUXアシスタントを開く",close:"閉じる",closeTip:"ヒントを閉じる",guide:"あなたのガイド",question:"質問はひとつで十分です",heading:"FLUXです。どこへ行きますか？",storefrontHeading:"どのようにお手伝いできますか？",intro:"探していることをそのまま入力してください。クレジットを使わず、正しいページへ案内します。",storefrontIntro:"お探しの内容を入力すると、適切な場所へご案内します。",placeholder:"例：営業時間を追加",storefrontPlaceholder:"例：予約する",searchAria:"探していること",find:"探す",results:"最も近いページ",noResult:"十分に近いページが見つかりませんでした。",noResultHint:"「営業時間」「注文」「料金」「連絡先」など簡単な言葉をお試しください。",quick:"クイックアクセス",useful:"今役立つこと",view3d:"3DキャラクターのFLUXを見る",backToHelp:"ヘルプに戻る",mascot3d:"3DのFLUX",mascot3dAria:"回転できる3D FLUXキャラクター",pause:"ヒントを一時停止",hour:"1時間",day:"1日",week:"7日",disable:"無効にする",choose:"あなたが選べます",stopQuestion:"このヒントはもう不要ですか？",stopBody:"このヒントを3回閉じました。自動のお知らせを停止できます。",keep:"FLUXを残す",guides:"FLUXが案内します",takeMe:"そこへ移動",other:"ほかのこと",heroAria:"FLUX、アプリのガイド",heroOpen:"サイトガイドFLUXを開く",heroHello:"こんにちは、FLUXです",heroQuestion:"お手伝いしましょうか？",heroCta:"クリックすると分かりやすく案内します",tipAria:"FLUXからのヒント",hideTip:"このヒントを隠す",planHelp:"プラン選びをサポート",recommendation:"FLUXのおすすめプラン",seePlan:"このプランを見る",preferencesTitle:"FLUXアシスタント",preferencesBody:"FLUXは次のステップを提案し、ソフトの操作をご案内します。",preferencesPaused:"ヒントは一時停止中です。",saved:"設定を保存しました",enabled:"有効",disabled:"無効",resume:"今すぐ再開",pageDescription:"このページを開くと、FLUXが適切な操作をご案内します。",onboardingTitle:"このステップをご案内します。",onboardingBody:"表示された情報を入力してください。進捗は保存され、いつでも戻れます。",appTitle:"このページの主な操作です。",appBody:"データを変更せず、移動先と操作方法をご説明します。",journeyTitle:"次に役立つステップです。",journeyBody:"この操作で進行できます。今でも後でも実行できます。",marketingTitle:"最も簡単な道をご案内します。",marketingBody:"目的を選ぶと、正しいページへ移動します。"},
  ar:{launcher:"هل تحتاج إلى مساعدة؟",open:"فتح مساعد FLUX",close:"إغلاق",closeTip:"إغلاق النصيحة",guide:"دليلك",question:"يكفي سؤال واحد",heading:"أنا FLUX. إلى أين تريد الذهاب؟",storefrontHeading:"كيف يمكنني مساعدتك؟",intro:"اكتب ببساطة ما تبحث عنه. سأوصلك إلى الصفحة الصحيحة دون استهلاك رصيدك.",storefrontIntro:"صِف ما تبحث عنه وسأوصلك إلى المكان الصحيح.",placeholder:"مثال: إضافة ساعات العمل",storefrontPlaceholder:"مثال: حجز موعد",searchAria:"ما تبحث عنه",find:"بحث",results:"هذه أقرب الصفحات",noResult:"لم أجد صفحة قريبة بما يكفي.",noResultHint:"جرّب كلمات بسيطة مثل «الساعات» أو «الطلبات» أو «الأسعار» أو «الاتصال».",quick:"وصول سريع",useful:"مفيد الآن",view3d:"عرض FLUX كشخصية ثلاثية الأبعاد",backToHelp:"العودة إلى المساعدة",mascot3d:"FLUX ثلاثي الأبعاد",mascot3dAria:"شخصية FLUX ثلاثية الأبعاد قابلة للتدوير",pause:"إيقاف النصائح مؤقتًا",hour:"ساعة واحدة",day:"يوم واحد",week:"7 أيام",disable:"تعطيل",choose:"الاختيار لك",stopQuestion:"لم تعد تريد هذه النصائح؟",stopBody:"أغلقت هذه النصيحة ثلاث مرات. يمكنني إيقاف التذكيرات التلقائية.",keep:"الاحتفاظ بـ FLUX",guides:"FLUX يرشدك",takeMe:"خذني إلى هناك",other:"شيء آخر",heroAria:"FLUX، دليلك في التطبيق",heroOpen:"فتح FLUX، دليل الموقع",heroHello:"مرحبًا، أنا FLUX",heroQuestion:"هل تريد أن أساعدك؟",heroCta:"انقر وسأرشدك ببساطة",tipAria:"نصيحة من FLUX",hideTip:"إخفاء هذه النصيحة",planHelp:"مساعدة في اختيار الباقة",recommendation:"يوصي FLUX بباقة",seePlan:"عرض هذه الباقة",preferencesTitle:"مساعد FLUX",preferencesBody:"يمكن لـ FLUX اقتراح الخطوة التالية وإرشادك داخل البرنامج.",preferencesPaused:"النصائح متوقفة مؤقتًا.",saved:"تم حفظ التفضيل",enabled:"مفعّل",disabled:"معطّل",resume:"استئناف الآن",pageDescription:"افتح هذه الصفحة وسيرشدك FLUX إلى الإجراء الصحيح.",onboardingTitle:"سأرشدك خلال هذه الخطوة.",onboardingBody:"أكمل المعلومات المعروضة. يُحفظ تقدمك ويمكنك الرجوع دائمًا.",appTitle:"هذا هو الإجراء الرئيسي في هذه الصفحة.",appBody:"سأشرح لك أين تذهب وماذا تفعل دون تغيير بياناتك.",journeyTitle:"هذه هي خطوتك المفيدة التالية.",journeyBody:"يدفع هذا الإجراء مسارك إلى الأمام. يمكنك تنفيذه الآن أو لاحقًا.",marketingTitle:"سأريك أبسط طريق.",marketingBody:"اختر هدفك وسأوصلك إلى الصفحة الصحيحة."}
};

const LABELS: Record<Locale, string[]> = {
  fr:["Voir ce qu’il me reste à faire","Gérer mes projets","Créer un nouveau projet","Modifier ma vitrine","Configurer la voix de FLUX","Ajouter un produit","Gérer mes produits","Ajouter une offre","Gérer mes offres","Configurer mon agenda","Créer un contenu","Retrouver mes contenus","Voir mes commandes","Voir mes statistiques","Installer l’application","Gérer mon profil","Voir ma facturation","Changer de formule","Voir mes crédits","Continuer la configuration","Créer mon espace gratuitement","Me connecter à mon espace","Comprendre les tarifs","Découvrir les outils","Contacter l’équipe","Revenir à l’accueil","Voir les prestations","Voir les produits","Voir les offres","Réserver un rendez-vous","Trouver les coordonnées"],
  en:["See what I still need to do","Manage my projects","Create a new project","Edit my storefront","Set up FLUX's voice","Add a product","Manage my products","Add an offer","Manage my offers","Set up my calendar","Create content","Find my content","View my orders","View my analytics","Install the app","Manage my profile","View my billing","Change plan","View my credits","Continue setup","Create my space for free","Sign in to my space","Understand pricing","Explore the tools","Contact the team","Back to home","View services","View products","View offers","Book an appointment","Find contact details"],
  es:["Ver lo que me queda por hacer","Gestionar mis proyectos","Crear un nuevo proyecto","Editar mi escaparate","Configurar la voz de FLUX","Añadir un producto","Gestionar mis productos","Añadir una oferta","Gestionar mis ofertas","Configurar mi agenda","Crear contenido","Encontrar mis contenidos","Ver mis pedidos","Ver mis estadísticas","Instalar la aplicación","Gestionar mi perfil","Ver mi facturación","Cambiar de plan","Ver mis créditos","Continuar la configuración","Crear mi espacio gratis","Iniciar sesión en mi espacio","Entender los precios","Descubrir las herramientas","Contactar con el equipo","Volver al inicio","Ver los servicios","Ver los productos","Ver las ofertas","Reservar una cita","Encontrar los datos de contacto"],
  de:["Offene Schritte ansehen","Projekte verwalten","Neues Projekt erstellen","Schaufenster bearbeiten","FLUX-Stimme einrichten","Produkt hinzufügen","Produkte verwalten","Angebot hinzufügen","Angebote verwalten","Kalender einrichten","Inhalt erstellen","Meine Inhalte finden","Bestellungen ansehen","Statistiken ansehen","App installieren","Profil verwalten","Abrechnung ansehen","Tarif wechseln","Credits ansehen","Einrichtung fortsetzen","Kostenlos starten","Anmelden","Preise verstehen","Tools entdecken","Team kontaktieren","Zur Startseite","Leistungen ansehen","Produkte ansehen","Angebote ansehen","Termin buchen","Kontaktdaten finden"],
  it:["Vedi cosa resta da fare","Gestisci i progetti","Crea un nuovo progetto","Modifica la vetrina","Configura la voce di FLUX","Aggiungi un prodotto","Gestisci i prodotti","Aggiungi un'offerta","Gestisci le offerte","Configura l'agenda","Crea un contenuto","Trova i miei contenuti","Vedi gli ordini","Vedi le statistiche","Installa l'app","Gestisci il profilo","Vedi la fatturazione","Cambia piano","Vedi i crediti","Continua la configurazione","Crea gratis il mio spazio","Accedi al mio spazio","Scopri i prezzi","Scopri gli strumenti","Contatta il team","Torna all'inizio","Vedi i servizi","Vedi i prodotti","Vedi le offerte","Prenota un appuntamento","Trova i contatti"],
  ru:["Посмотреть оставшиеся шаги","Управлять проектами","Создать новый проект","Изменить витрину","Настроить голос FLUX","Добавить товар","Управлять товарами","Добавить предложение","Управлять предложениями","Настроить календарь","Создать контент","Найти мои материалы","Посмотреть заказы","Посмотреть статистику","Установить приложение","Управлять профилем","Посмотреть счета","Сменить тариф","Посмотреть кредиты","Продолжить настройку","Создать пространство бесплатно","Войти","Узнать цены","Открыть инструменты","Связаться с командой","На главную","Посмотреть услуги","Посмотреть товары","Посмотреть предложения","Записаться","Найти контакты"],
  zh:["查看剩余事项","管理项目","新建项目","编辑店铺页面","设置 FLUX 的语气","添加产品","管理产品","添加优惠","管理优惠","设置日程","创建内容","查找我的内容","查看订单","查看统计数据","安装应用","管理个人资料","查看账单","更换方案","查看额度","继续设置","免费创建空间","登录我的空间","了解价格","探索工具","联系团队","返回首页","查看服务","查看产品","查看优惠","预约","查找联系方式"],
  ja:["残りの作業を見る","プロジェクトを管理","新しいプロジェクトを作成","店舗ページを編集","FLUXの話し方を設定","商品を追加","商品を管理","オファーを追加","オファーを管理","予定を設定","コンテンツを作成","コンテンツを探す","注文を見る","統計を見る","アプリをインストール","プロフィールを管理","請求を確認","プランを変更","クレジットを見る","設定を続ける","無料でスペースを作成","ログイン","料金を確認","ツールを見る","チームに連絡","ホームに戻る","サービスを見る","商品を見る","オファーを見る","予約する","連絡先を探す"],
  ar:["عرض ما تبقى من خطوات","إدارة مشاريعي","إنشاء مشروع جديد","تعديل واجهتي","إعداد صوت FLUX","إضافة منتج","إدارة المنتجات","إضافة عرض","إدارة العروض","إعداد الجدول","إنشاء محتوى","العثور على محتواي","عرض الطلبات","عرض الإحصاءات","تثبيت التطبيق","إدارة الملف الشخصي","عرض الفواتير","تغيير الباقة","عرض الرصيد","متابعة الإعداد","إنشاء مساحتي مجانًا","تسجيل الدخول","فهم الأسعار","استكشاف الأدوات","الاتصال بالفريق","العودة للرئيسية","عرض الخدمات","عرض المنتجات","عرض العروض","حجز موعد","العثور على بيانات الاتصال"]
};

const TERMS: Record<Locale, string> = {fr:"aide page action parcours",en:"help page action setup",es:"ayuda página acción configuración",de:"Hilfe Seite Aktion Einrichtung",it:"aiuto pagina azione configurazione",ru:"помощь страница действие настройка",zh:"帮助 页面 操作 设置",ja:"ヘルプ ページ 操作 設定",ar:"مساعدة صفحة إجراء إعداد"};

type DestinationTerms = { aliases: string[]; keywords: string[] };

/**
 * Vocabulaire de recherche propre à chaque destination, par langue.
 *
 * `LABELS` est indexé par position ; ici on indexe par `id`, parce qu'un
 * vocabulaire attribué à la mauvaise destination est bien plus difficile à
 * repérer qu'un libellé décalé. Un test de parité (search.test.ts) garantit
 * que chaque langue présente ici couvre tout le catalogue.
 *
 * Ce n'est pas de la traduction mot à mot du français : ce sont les termes que
 * l'utilisateur tape réellement dans sa langue. D'où les doublets orthographiques
 * (colour/color, catalogue/catalog) et les tournures familières
 * («how much does it cost», «put it on my phone»).
 *
 * Les langues absentes retombent sur `TERMS`, un repli générique où seul le
 * libellé discrimine — la recherche y reste pauvre tant qu'elles ne sont pas
 * traitées à leur tour.
 */
const SEARCH_TERMS: Partial<Record<Locale, Record<string, DestinationTerms>>> = {
  en: {
    "app-home": {
      aliases: ["home", "dashboard", "next step", "what should i do", "where am i"],
      keywords: ["journey", "progress", "help", "start", "goal", "todo", "overview"],
    },
    projects: {
      aliases: ["my projects", "switch project", "another business", "change project"],
      keywords: ["project", "business", "company", "switch", "select", "storefront"],
    },
    "project-new": {
      aliases: ["new project", "new storefront", "add a business", "start another site"],
      keywords: ["project", "create", "new", "business", "storefront", "add"],
    },
    "storefront-editor": {
      aliases: ["edit my site", "change my page", "my storefront", "edit my website"],
      keywords: ["site", "website", "page", "photo", "image", "text", "colour", "color", "logo", "design", "layout"],
    },
    voice: {
      aliases: ["set up flux voice", "my tone", "the way i speak", "flux ai", "get to know me"],
      keywords: ["voice", "tone", "values", "story", "personalise", "personalize", "context", "style", "ai"],
    },
    products: {
      aliases: ["add a product", "new product", "create a product", "sell something"],
      keywords: ["product", "price", "stock", "inventory", "catalogue", "catalog", "item", "sell"],
    },
    "products-manage": {
      aliases: ["my products", "edit a product", "manage stock", "product list"],
      keywords: ["product", "catalogue", "catalog", "stock", "inventory", "edit", "disable"],
    },
    offers: {
      aliases: ["add an offer", "new offer", "create a promotion", "add a deal"],
      keywords: ["offer", "promotion", "promo", "discount", "deal", "package", "price"],
    },
    "offers-manage": {
      aliases: ["my offers", "edit an offer", "manage promotions", "offer list"],
      keywords: ["offer", "promotion", "discount", "deal", "package", "edit", "disable"],
    },
    agenda: {
      aliases: ["add my opening hours", "my appointments", "my availability", "open a slot", "set my hours"],
      keywords: ["calendar", "agenda", "schedule", "opening", "hours", "slot", "booking", "availability", "appointment", "diary"],
    },
    content: {
      aliases: ["create a post", "write a post", "content tool", "make a publication"],
      keywords: ["content", "post", "instagram", "publication", "social", "media", "caption", "text", "write"],
    },
    results: {
      aliases: ["my content", "my creations", "find a post", "my vault", "past results"],
      keywords: ["result", "content", "history", "creation", "vault", "saved", "library"],
    },
    orders: {
      aliases: ["where are my orders", "customer order", "new order", "my sales"],
      keywords: ["order", "sale", "customer", "payment", "cart", "checkout", "purchase"],
    },
    statistics: {
      aliases: ["my statistics", "see my results", "how many visits", "my analytics"],
      keywords: ["statistics", "stats", "analytics", "visit", "traffic", "click", "result", "performance", "numbers"],
    },
    install: {
      aliases: ["install flux", "put it on my phone", "mobile app", "add to home screen"],
      keywords: ["install", "app", "application", "phone", "mobile", "shortcut", "pwa"],
    },
    account: {
      aliases: ["my account", "my profile", "change my password", "account settings"],
      keywords: ["account", "profile", "security", "password", "billing", "subscription", "email", "settings"],
    },
    billing: {
      aliases: ["my invoices", "my billing", "subscription renewal", "payment history"],
      keywords: ["invoice", "billing", "subscription", "payment", "renewal", "receipt", "vat"],
    },
    plans: {
      aliases: ["change plan", "my subscription", "upgrade", "flux plans"],
      keywords: ["plan", "subscription", "tier", "price", "upgrade", "downgrade", "package"],
    },
    credits: {
      aliases: ["my credits", "top up", "buy credits", "my balance"],
      keywords: ["credit", "credits", "balance", "topup", "pack", "payment", "refill", "buy"],
    },
    "onboarding-resume": {
      aliases: ["continue", "resume", "finish my signup", "next step"],
      keywords: ["setup", "signup", "onboarding", "journey", "continue", "resume", "finish"],
    },
    "marketing-start": {
      aliases: ["get started", "try it", "create an account", "sign up"],
      keywords: ["free", "signup", "trial", "start", "account", "register"],
    },
    "marketing-login": {
      aliases: ["log in", "sign in", "find my account", "my space"],
      keywords: ["login", "account", "workspace", "password", "resume"],
    },
    "marketing-pricing": {
      aliases: ["how much does it cost", "price", "pricing", "subscription cost"],
      keywords: ["price", "pricing", "cost", "plan", "credit", "subscription", "payment", "fee"],
    },
    "marketing-features": {
      aliases: ["what does flux do", "features", "the tools", "what is it for"],
      keywords: ["tool", "feature", "site", "seo", "content", "calendar", "sales", "capability"],
    },
    "marketing-contact": {
      aliases: ["contact", "talk to someone", "i need help", "email the team"],
      keywords: ["help", "support", "contact", "question", "team", "assistance"],
    },
    "storefront-home": {
      aliases: ["home", "top", "back to top", "start"],
      keywords: ["home", "top", "start", "storefront", "beginning"],
    },
    "storefront-services": {
      aliases: ["services", "what do you offer", "rates", "treatments"],
      keywords: ["service", "services", "price", "rate", "book", "offering"],
    },
    "storefront-products": {
      aliases: ["shop", "products", "catalogue", "buy"],
      keywords: ["product", "item", "price", "order", "buy", "shop", "store"],
    },
    "storefront-offers": {
      aliases: ["promotions", "offers", "deals", "discounts"],
      keywords: ["offer", "promotion", "deal", "discount", "price", "package"],
    },
    "storefront-booking": {
      aliases: ["book an appointment", "make a booking", "see the hours", "available slots"],
      keywords: ["booking", "appointment", "reserve", "hours", "slot", "availability", "schedule"],
    },
    "storefront-contact": {
      aliases: ["contact", "phone", "address", "where are you"],
      keywords: ["contact", "address", "phone", "email", "directions", "location"],
    },
  },
};

/** Langues dont le vocabulaire de recherche est traduit destination par destination. */
export const LOCALES_WITH_SEARCH_TERMS = Object.keys(SEARCH_TERMS) as Locale[];

/** Ids couverts par le vocabulaire traduit d'une langue (vide = repli générique). */
export function searchTermIds(locale: Locale): string[] {
  return Object.keys(SEARCH_TERMS[locale] ?? {});
}

export function localizeDestinations(destinations: AssistantDestination[], locale: Locale) {
  if (locale === "fr") return destinations;
  const localeTerms = SEARCH_TERMS[locale];
  return destinations.map((destination, index) => {
    const label = LABELS[locale][index] ?? destination.label;
    const terms = localeTerms?.[destination.id];
    return {
      ...destination,
      label,
      description: ASSISTANT_COPY[locale].pageDescription,
      aliases: [label, ...(terms ? terms.aliases : TERMS[locale].split(" "))],
      keywords: terms
        ? terms.keywords
        : [...TERMS[locale].split(" "), destination.id.replaceAll("-", " ")],
    };
  });
}

export function localizeGuidance(message: FluxGuidanceMessage, locale: Locale, destinations: AssistantDestination[]): FluxGuidanceMessage {
  if (locale === "fr") return message;
  const copy = ASSISTANT_COPY[locale];
  const journey = message.trigger === "journey";
  const onboarding = message.surface === "onboarding";
  const app = message.surface === "app";
  const translatedAction = message.action ? destinations.find((item) => item.href === message.action?.href) : undefined;
  return {
    ...message,
    eyebrow: journey ? copy.guides : onboarding ? copy.guide : app ? copy.guides : copy.heroHello,
    title: journey ? copy.journeyTitle : onboarding ? copy.onboardingTitle : app ? copy.appTitle : copy.marketingTitle,
    body: journey ? copy.journeyBody : onboarding ? copy.onboardingBody : app ? copy.appBody : copy.marketingBody,
    action: message.action ? { ...message.action, label: translatedAction?.label ?? copy.takeMe } : undefined,
  };
}
