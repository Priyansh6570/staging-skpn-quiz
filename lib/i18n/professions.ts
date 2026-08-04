/**
 * The nineteen professions the trust approved, and the Vidyas and Kalas each one shares a domain
 * with.
 *
 * **The framing is domain correspondence and nothing more.** These entries belong to the same field
 * of study as the modern subject beside them. Nothing here says, or may be written to imply, that
 * one came first or produced the other — no priority claim, in either language, anywhere in this
 * section or on the page built from it.
 *
 * `entries` are keys in Home_v5.VIDYAS and Home_v5.KALAS, and they are the only form the mapping is
 * written in. The trust supplied it as Devanagari names, about a quarter of which differ from the
 * book's own spelling — वास्तु विद्या for वास्तुविद्या, संपाठ्य for सम्पाठ्यम्, मेषकुक्कुट विधि for the full
 * मेषकुक्कुट लावकयुद्ध विधि. Storing those would put a second set of Devanagari names in the repo to
 * drift against lib/i18n; storing the key means the rendered name is always the book's, resolved at
 * build time. Every key below was matched to the supplied name mechanically, not by eye, and
 * `npm run professions` refuses to build if any stops resolving.
 *
 * All 78 entries are covered across these nineteen, in 80 slots. The two entries that appear twice
 * are deliberate, and both are compounds the trust reads as two subjects:
 *   - `Vrikshayurveda` — वृक्षायुर्वेद योग, under `doctor` and `botanical`.
 *   - `Mani-raga-jnana` — मणिरागाकर ज्ञान, मणिराग (gem colour) under `lab` and आकर (mines) under
 *     `space`. Both render under the entry's own name; the split is editorial, not a second entry.
 *
 * The trust's mapping also carried केश मार्जन under `perfumery`. No entry of that name exists — the
 * book reads केशमर्दन, inside उत्सादन-संवाहन-केशमर्दन कुशलता, which is already `doctor`'s `Utsadana`.
 * The trust confirmed on 5 August 2026 that the slot name was wrong and dropped it.
 */
export interface Profession {
  key: string;
  /** Explicit, not slugged: the supplied artwork filenames are inconsistent in case and spacing. */
  image: string;
  entries: string[];
}

export const PROFESSIONS: Profession[] = [
  { key: "space", image: "space.jpg", entries: ["Jyotisha", "Yantra-matrika", "Mani-raga-jnana", "Nimitta-jnana"] },
  { key: "engineer", image: "engineer.jpg", entries: ["Vastu-vidya", "Takshana", "Takshakarma"] },
  { key: "doctor", image: "doctor.jpg", entries: ["Vrikshayurveda", "Utsadana", "Vyayamiki"] },
  { key: "lab", image: "lab.jpg", entries: ["Dhatu-vada", "Rupya-ratna-pariksha", "Mani-raga-jnana"] },
  { key: "botanical", image: "botanical.jpg", entries: ["Vrikshayurveda", "Malya-grathana", "Pushpastarana"] },
  { key: "painter", image: "painter.jpg", entries: ["Alekhya", "Chitra-yoga", "Manibhumika-karma"] },
  { key: "musician", image: "musician.jpg", entries: ["Geet", "Vadya", "Nritya", "Vina-damaruka"] },
  { key: "teacher", image: "teacher.jpg", entries: ["Vyakarana", "Nirukta", "Nyaya", "Dharana-matrika"] },
  {
    key: "literature",
    image: "Literature & linguistics.jpg",
    entries: ["Pustaka-vachana", "Natika-akhyayika", "Kavya-samasya-purana", "Pratimala", "Prahelika", "Durvachaka-yoga", "Abhidhana-kosha", "Chhando-jnana", "Manasi-kavya-kriya", "Chhanda"],
  },
  { key: "languages", image: "Languages & translation.jpg", entries: ["Mlechchhita-kala", "Desha-bhasha-jnana", "Akshara-mushtika", "Sampathya"] },
  {
    key: "textiles",
    image: "Textiles & fashion.jpg",
    entries: ["Suchi-vana-karma", "Sutra-krida", "Nepathya-yoga", "Dashana-vasana-raga", "Vastra-gopana", "Pattika-vetra-vana"],
  },
  { key: "jewellery", image: "Jewellery & gemcraft.jpg", entries: ["Bhushana-yojana", "Karnapatra-bhanga", "Shekharaka-yojana"] },
  { key: "culinary", image: "Culinary arts & nutrition.jpg", entries: ["Vichitra-bhakshya", "Panaka-rasa-yojana"] },
  { key: "perfumery", image: "Perfumery & cosmetics.jpg", entries: ["Gandha-yukti", "Visheshakachchhedya", "Tandula-kusuma"] },
  { key: "interior", image: "Interior & event design.jpg", entries: ["Shayana-rachana", "Pushpa-shakatika", "Udaka-vadya"] },
  { key: "sport", image: "Sport, games & recreation.jpg", entries: ["Udaka-ghata", "Balakridanaka", "Akarsha-krida", "Dyuta-vishesha"] },
  { key: "veterinary", image: "Veterinary & animal science.jpg", entries: ["Mesha-kukkuta-vidhi", "Shuka-sarika-pralapana", "Vaijayiki-vidya"] },
  {
    key: "vedic",
    image: "Vedic scholarship & philosophy.jpg",
    entries: ["Rigveda", "Yajurveda", "Samaveda", "Atharvaveda", "Shiksha", "Kalpa", "Dharmashastra", "Purana", "Mimamsa", "Vainayiki-vidya", "Kriya-vikalpa"],
  },
  { key: "performance", image: "PERFORMANCE AND ILLUSION.jpg", entries: ["Aindrajala", "Kauchumara-yoga", "Hasta-laghava", "Chhalitaka-yoga"] },
];

/**
 * Supplied by the trust with the artwork, in both languages, and copied in verbatim.
 *
 * `eyebrow` and `headline` are the professions page's own masthead and the home section's opening,
 * supplied on 5 August 2026. They replace the headings the design mockup carried, which were
 * improvised and are not used anywhere. `title` and `subtitle` are the older pair, still the heading
 * over the grid itself and the lede on the home section.
 */
export const professionCopy = {
  hi: {
    eyebrow: "14 विद्याएँ और 64 कलाएँ प्रेरणा बनीं",
    headline: "पुरातन और आधुनिक युग की शक्ति",
    title: "ये कलाएँ आज कहाँ हैं",
    subtitle: "चौदह विद्याएँ और चौंसठ कलाएँ आज के विषयों और व्यवसायों में इसी रूप में जीवित हैं",
    labels: {
      space: "अंतरिक्ष एवं वैमानिकी",
      engineer: "वास्तु एवं निर्माण",
      doctor: "चिकित्सा",
      lab: "रसायन एवं धातु विज्ञान",
      botanical: "वनस्पति विज्ञान",
      painter: "चित्रकला एवं डिज़ाइन",
      musician: "संगीत एवं नृत्य",
      teacher: "शिक्षा एवं शोध",
      literature: "साहित्य एवं भाषाविज्ञान",
      languages: "भाषा एवं अनुवाद",
      textiles: "वस्त्र एवं परिधान",
      jewellery: "आभूषण एवं रत्नकला",
      culinary: "पाककला एवं पोषण",
      perfumery: "सुगंध एवं सौंदर्य",
      interior: "सज्जा एवं आयोजन",
      sport: "खेल एवं मनोरंजन",
      veterinary: "पशु चिकित्सा एवं विज्ञान",
      vedic: "वैदिक अध्ययन एवं दर्शन",
      performance: "मंचकला एवं इंद्रजाल",
    },
  },
  en: {
    eyebrow: "The 14 Vidyas and 64 Kalas became an inspiration",
    headline: "A strength for both the ancient and the modern age",
    title: "Where these arts live today",
    subtitle: "The fourteen Vidyas and sixty-four Kalas survive in today's subjects and professions",
    labels: {
      space: "Space & aeronautics",
      engineer: "Architecture & construction",
      doctor: "Medicine",
      lab: "Chemistry & metallurgy",
      botanical: "Botany",
      painter: "Art & design",
      musician: "Music & dance",
      teacher: "Education & research",
      literature: "Literature & linguistics",
      languages: "Languages & translation",
      textiles: "Textiles & fashion",
      jewellery: "Jewellery & gemcraft",
      culinary: "Culinary arts & nutrition",
      perfumery: "Perfumery & cosmetics",
      interior: "Interior & event design",
      sport: "Sport, games & recreation",
      veterinary: "Veterinary & animal science",
      vedic: "Vedic scholarship & philosophy",
      performance: "Performance & illusion",
    },
  },
} as const;
