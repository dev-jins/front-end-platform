/** Error codes shared by every game family. Full table: docs/Test Game Front API.md, "Game API errors". */
export const ERROR_CODE = {
    generalError: 1,
    notEnoughMoney: 3,
    betLimitReached: 4,
    currencyNotSupported: 9,
    sessionClosed: 109,
    countryRestricted: 111,
    openedOnOtherDevice: 112,
    nickname: 140,
    languageNotSupported: 300,
} as const;
