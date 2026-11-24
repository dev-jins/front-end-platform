/** Slot error codes: a step / bet / mode the current state does not allow. Shared codes: `ERROR_CODE`. */
export const SLOT_ERROR_CODE = {
  avalancheNotAvailable: 100,
  bonusNotAvailable: 101,
  buyNotAvailable: 102,
  freespinNotAvailable: 103,
  jackpotNotAvailable: 104,
  respinNotAvailable: 105,
  wrongBet: 106,
  spinNotAvailable: 107,
  wrongLines: 108,
  previousStateNotAvailable: 110,
  wrongMode: 115,
} as const;
