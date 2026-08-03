/**
 * Whether registration, student sign-in and the quiz are open. The flag is read here and nowhere
 * else. It gated the wait for DLT approval and stays as the kill switch: one variable closes the
 * whole student side without a deploy.
 *
 * There is no date in it deliberately. The opening date is announced copy, not a gate — a clock
 * comparison on five lakh clients in different timezones opens the paper early for some of them.
 *
 * Server-side only — never NEXT_PUBLIC_, which would compile it into the client bundle. Anything
 * other than the literal "true" is closed, so a missing, empty or misspelt variable fails shut
 * rather than opening registration to five lakh students by accident.
 */
export const competitionOpen = (): boolean => process.env.COMPETITION_OPEN === "true";
