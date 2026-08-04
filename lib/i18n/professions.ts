/**
 * The eight professions the trust approved, and the Vidyas and Kalas each one shares a domain with.
 *
 * **The framing is domain correspondence and nothing more.** These entries belong to the same field
 * of study as the modern subject beside them. Nothing here says, or may be written to imply, that
 * one came first or produced the other — no priority claim, in either language, anywhere in this
 * section.
 *
 * `entries` are keys in Home_v5.VIDYAS and Home_v5.KALAS. Every one was checked against those two
 * lists before being written here; `npm run professions` refuses to build if any stops resolving, so
 * a renamed entry fails at the build rather than rendering a dead link.
 *
 * The keys live here once rather than under `hi` and `en` separately: they are structure, not copy,
 * and a second copy is what drifts.
 */
export interface Profession {
  /** Also the artwork's filename in design/professions and public/professions. */
  key: string;
  entries: string[];
}

export const PROFESSIONS: Profession[] = [
  { key: "space", entries: ["Jyotisha", "Yantra-matrika"] },
  { key: "engineer", entries: ["Vastu-vidya", "Takshana", "Takshakarma", "Yantra-matrika"] },
  { key: "doctor", entries: ["Vrikshayurveda", "Utsadana", "Vyayamiki"] },
  { key: "lab", entries: ["Dhatu-vada", "Rupya-ratna-pariksha", "Mani-raga-jnana"] },
  { key: "botanical", entries: ["Vrikshayurveda", "Malya-grathana", "Pushpastarana"] },
  { key: "painter", entries: ["Alekhya", "Chitra-yoga", "Manibhumika-karma"] },
  { key: "musician", entries: ["Geet", "Vadya", "Nritya", "Vina-damaruka"] },
  { key: "teacher", entries: ["Vyakarana", "Nirukta", "Nyaya", "Dharana-matrika"] },
];

/**
 * Supplied by the trust with the artwork, in both languages, and copied in verbatim.
 *
 * One name in the supplied mapping has no entry to point at: `space` was given a third, आकरज्ञान,
 * and no Vidya or Kala carries that name. The only entry containing आकर in the sense of a source or
 * mine is मणिरागाकर ज्ञान (`Mani-raga-jnana`), which the same mapping already assigns to `lab`, and
 * the only other आकर is आकर्षक्रीड़ा (`Akarsha-krida`), which is a game with magnets. It is left out
 * rather than guessed at. See HANDOFF.md.
 */
export const professionCopy = {
  hi: {
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
    },
  },
  en: {
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
    },
  },
} as const;
