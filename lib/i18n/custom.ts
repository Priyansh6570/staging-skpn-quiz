/**
 * Copy that has no source in the design export.
 *
 * Everything else in lib/i18n is extracted from design/*.dc.html and verified byte-identical.
 * These strings are not: they are either supplied by the client in a change request, or written
 * here because a screen the export never had needs words. The Hindi in this file has NOT been
 * through the designer or the department — it needs a native proofread before launch. That is the
 * one thing this file cannot verify about itself.
 */

export interface CustomStrings {
  /** The floating notice, the only place the closed state is stated in words. */
  competitionNoticeBanner: string;
  /** Kept for when the closed state is reverted; nothing renders these two today. */
  competitionPendingNotice: string;
  competitionPendingDate: string;
  home: {
    perStudent: string;
  };
  pratiyogita: {
    examTitle: string;
    examNames: string[];
  };
  register: {
    consent: string;
    consentRulesLink: string;
    consentPrivacyLink: string;
    guardianWhy: string;
  };
  quiz: {
    beforeYouStart: string;
  };
  errors: {
    network: string;
    server: string;
    sessionExpired: string;
    rateLimited: string;
    saveFailed: string;
    invalidInput: string;
    notRegistered: string;
    /** TODO(hi) — a different account already holds this email address. */
    emailTaken: string;
  };
  certificate: {
    retry: string;
    downloaded: string;
    loadFailed: string;
  };
  notFound: {
    title: string;
    body: string;
  };
  /**
   * The SMS code step. The design export predates it, so there is no source copy for any of it.
   * Six of these were supplied by the client on 4 August 2026 and are Devanagari; the rest are
   * still the English text in both locales, for the same reason as vidyaKala below. Every one of
   * those sits in the middle of sign-in and registration, at the one point a student cannot skip.
   */
  otp: {
    title: string;
    codeLabel: string;
    verify: string;
    resend: string;
    /** TODO(hi) — "{s}" is replaced with the whole seconds remaining. */ resendIn: string;
    changeNumber: string;
    /** TODO(hi) */ wrongCode: string;
    /** TODO(hi) */ expired: string;
    /** TODO(hi) */ exhausted: string;
    /** TODO(hi) */ sendFailed: string;
    /** TODO(hi) */ unavailable: string;
    /** TODO(hi) */ quotaExceeded: string;
    /** TODO(hi) — the proof of ownership timed out before the form was submitted. */ verificationExpired: string;
    /** TODO(hi) — status text while the code is being sent. */ sending: string;
    /** TODO(hi) — status text while the code is being checked. */ verifying: string;
    /** followed by the number, once the code is on its way. */ sentTo: string;
    /** TODO(hi) — followed by the number, once the code for it has been accepted. */ verified: string;
  };
  /**
   * /vidya-kala. The Devanagari for two of these is NOT yet written: the values below are the
   * English text in both locales, deliberately, because no Hindi source exists for them and
   * inventing Devanagari for a government page is not something this build will do. Every other
   * label on those pages is reused from lib/i18n. Supply Hindi here before launch.
   */
  vidyaKala: {
    /** TODO(hi): search field label over the 64 kalas. */
    searchLabel: string;
    /** Supplied by the client in the change request: "विस्तार से देखें" / "Browse". */
    browseAll: string;
    /** Composed from Home_v5.S.tabVidyas + the conjunction + tabKalas — never retyped. */
    countLine: string;
    /** TODO(hi): shown where an entry has no English description and the Hindi is displayed. */
    hindiOnly: string;
    /**
     * The entry page's back link when the reader arrived from /vyavasaya. Supplied by the client on
     * 5 August 2026: "वापस जाएं". Arrivals from the index keep the list's own name instead, so this
     * is the generic wording used only where naming the destination would say nothing useful.
     */
    back: string;
  };
  /**
   * The collection dropdown, grouped under one nav item rather than added as three more top-level
   * ones. Supplied by the client on 5 August 2026.
   *
   * Only two labels live here. The other two entries in the menu are the two tabs of /vidya-kala,
   * and the client's wording for them — "14 विद्याएँ" and "64 कलाएँ" — is byte-identical to
   * Home_v5.S.tabVidyas and tabKalas, which the tabs themselves already render. Those are read
   * straight from there rather than copied: a second copy of a Devanagari string is a second thing
   * to keep in step, and a nav item that disagreed with the tab it lands on would be worse than
   * either wording alone.
   */
  nav: {
    group: string;
    vyavasaya: string;
  };
}

const OTP_EN: CustomStrings["otp"] = {
  title: "Enter the code",
  codeLabel: "Six-digit code",
  verify: "Verify",
  resend: "Send it again",
  resendIn: "Send it again in {s}s",
  changeNumber: "Change number",
  wrongCode: "That code is not correct.",
  expired: "That code has expired. Ask for a new one.",
  exhausted: "Too many incorrect attempts. Ask for a new code.",
  sendFailed: "The code could not be sent. Please try again in a moment.",
  unavailable: "Codes cannot be sent at the moment. Please try again later.",
  quotaExceeded: "Too many codes have been requested for this number. Please try again later.",
  verificationExpired: "The verification timed out. Please request a new code.",
  sending: "Sending the code",
  verifying: "Checking the code",
  sentTo: "Code sent to",
  verified: "Verified",
};

/**
 * Six supplied by the client on 4 August 2026 and copied in verbatim. The remaining eleven still
 * have no Hindi, and they read from OTP_EN rather than repeating its text: one English string in
 * one place, so a Hindi value replaces it here and nowhere else, and there is no second copy to
 * drift out of step while it waits.
 */
const OTP_HI: CustomStrings["otp"] = {
  title: "कोड दर्ज करें",
  codeLabel: "छह अंकों का कोड",
  verify: "सत्यापित करें",
  resend: "पुनः भेजें",
  changeNumber: "नंबर बदलें",
  sentTo: "कोड भेजा गया",
  resendIn: OTP_EN.resendIn,
  wrongCode: OTP_EN.wrongCode,
  expired: OTP_EN.expired,
  exhausted: OTP_EN.exhausted,
  sendFailed: OTP_EN.sendFailed,
  unavailable: OTP_EN.unavailable,
  quotaExceeded: OTP_EN.quotaExceeded,
  verificationExpired: OTP_EN.verificationExpired,
  sending: OTP_EN.sending,
  verifying: OTP_EN.verifying,
  verified: OTP_EN.verified,
};

export const customHi: CustomStrings = {
  competitionNoticeBanner: "भगवान श्रीकृष्ण मेधावी छात्रवृत्ति प्रतियोगिता की तिथि शीघ्र घोषित की जाएगी",
  competitionPendingNotice: "पंजीयन शीघ्र प्रारंभ होगा · तिथि शीघ्र घोषित की जाएगी",
  competitionPendingDate: "तिथि शीघ्र घोषित की जाएगी",
  home: {
    perStudent: "प्रति छात्र छात्रवृत्ति",
  },
  pratiyogita: {
    examTitle: "प्रवेश परीक्षाओं की तैयारी कर रहे विद्यार्थी भी भाग ले सकते हैं",
    examNames: ["NEET", "JEE", "CLAT", "CAT"],
  },
  register: {
    consent: "मुझे प्रतियोगिता के नियम स्वीकार हैं और मैं गोपनीयता सूचना से सहमत हूँ।",
    consentRulesLink: "नियम",
    consentPrivacyLink: "गोपनीयता सूचना",
    guardianWhy: "आपकी आयु 18 वर्ष से कम है, इसलिए अभिभावक का नाम आवश्यक है।",
  },
  quiz: {
    beforeYouStart: "प्रारंभ करने से पूर्व",
  },
  errors: {
    network: "सर्वर से संपर्क नहीं हो सका। कृपया अपना कनेक्शन जाँचें और पुनः प्रयास करें।",
    server: "कुछ त्रुटि हुई है। कृपया पुनः प्रयास करें।",
    sessionExpired: "आपका सत्र समाप्त हो गया है। कृपया पुनः साइन इन करें।",
    rateLimited: "बहुत अधिक प्रयास हुए हैं। कृपया कुछ क्षण प्रतीक्षा करें।",
    saveFailed: "आपका पिछला उत्तर सुरक्षित नहीं हो सका। यह स्वतः पुनः भेजा जाएगा।",
    invalidInput: "कुछ जानकारी अधूरी अथवा अमान्य है। कृपया चिह्नित फ़ील्ड जाँचें।",
    notRegistered: "इस नंबर से कोई पंजीकरण नहीं मिला",
    emailTaken: "This email address is already registered to another account.",
  },
  certificate: {
    retry: "पुनः प्रयास करें",
    downloaded: "डाउनलोड हो गया",
    loadFailed: "प्रमाण पत्र लोड नहीं हो सका।",
  },
  notFound: {
    title: "यह पृष्ठ नहीं मिला",
    body: "संभव है कि पता गलत लिखा गया हो, अथवा यह पृष्ठ स्थानांतरित हो गया हो।",
  },
  otp: OTP_HI,
  vidyaKala: {
    searchLabel: "Search the 64 Kalas",
    browseAll: "विस्तार से देखें",
    countLine: "14 विद्याएँ और 64 कलाएँ",
    hindiOnly: "Hindi only",
    back: "वापस जाएं",
  },
  nav: {
    group: "ज्ञान परंपरा",
    vyavasaya: "आधुनिक युग",
  },
};

export const customEn: CustomStrings = {
  competitionNoticeBanner:
    "The date of the Bhagwan Shri Krishna Medhavi Chhatravritti Pratiyogita will be announced shortly",
  competitionPendingNotice: "Registration opens shortly · Date to be announced",
  competitionPendingDate: "Date to be announced",
  home: {
    perStudent: "Scholarship per student",
  },
  pratiyogita: {
    examTitle: "Students preparing for entrance examinations may also take part",
    examNames: ["NEET", "JEE", "CLAT", "CAT"],
  },
  register: {
    consent: "I accept the rules of the competition and agree to the privacy notice.",
    consentRulesLink: "Rules",
    consentPrivacyLink: "Privacy notice",
    guardianWhy: "You are under 18, so a guardian's name is required.",
  },
  quiz: {
    beforeYouStart: "Before you begin",
  },
  errors: {
    network: "Could not reach the server. Check your connection and try again.",
    server: "Something went wrong. Please try again.",
    sessionExpired: "Your session has ended. Please sign in again.",
    rateLimited: "Too many attempts. Please wait a moment and try again.",
    saveFailed: "Your last answer could not be saved. It will be retried automatically.",
    invalidInput: "Some details are missing or not valid. Please check the highlighted fields.",
    notRegistered: "No registration found for this number",
    emailTaken: "This email address is already registered to another account.",
  },
  certificate: {
    retry: "Try again",
    downloaded: "Downloaded",
    loadFailed: "The certificate could not be loaded.",
  },
  notFound: {
    title: "This page could not be found",
    body: "The address may be mistyped, or the page may have moved.",
  },
  otp: OTP_EN,
  vidyaKala: {
    searchLabel: "Search the 64 Kalas",
    browseAll: "Browse",
    countLine: "14 Vidyas and 64 Kalas",
    hindiOnly: "Hindi only",
    back: "Back",
  },
  nav: {
    group: "Knowledge Tradition",
    vyavasaya: "The Modern Age",
  },
};
