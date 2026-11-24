import { docExamples } from "../../tests/doc-examples.js";
import { ERROR_CODE, toGameApiError } from "./errors.js";

const [businessError, validationError, parseError] = docExamples("Game API errors");

describe("toGameApiError", () => {
  it("maps every documented error channel", () => {
    expect(toGameApiError(422, businessError).detail).toEqual({
      kind: "business",
      code: ERROR_CODE.notEnoughMoney,
      level: "ALERT",
      message: "Not enough money",
    });
    expect(toGameApiError(400, validationError).detail).toMatchObject({
      kind: "validation",
      violations: [{ field: "bet" }, { field: "lines" }],
    });
    expect(toGameApiError(422, parseError).detail).toEqual({ kind: "parse", message: "Syntax error" });
    expect(toGameApiError(404, { message: "Session not found" }).detail).toEqual({ kind: "not-found" });
    expect(toGameApiError(500, null).detail).toEqual({ kind: "unexpected", body: null });
  });

  it("uses code and message for business errors", () => {
    expect(toGameApiError(422, businessError).message).toBe("3 Not enough money");
    expect(toGameApiError(500, null).message).toBe("Game API 500 (unexpected)");
  });
});
