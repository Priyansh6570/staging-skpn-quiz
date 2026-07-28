/**
 * DLT approval is pending, so registration, student sign-in and the quiz are closed. The flag is
 * read here and nowhere else.
 *
 * Server-side only — never NEXT_PUBLIC_, which would compile it into the client bundle. Anything
 * other than the literal "true" is closed, so a missing, empty or misspelt variable fails shut
 * rather than opening registration to five lakh students by accident.
 */
export const competitionOpen = (): boolean => process.env.COMPETITION_OPEN === "true";
