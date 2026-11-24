import { clone, docExamples } from "../../tests/doc-examples.js";
import { tournamentsResponseSchema } from "./schemas.js";

const [tournamentsExample] = docExamples("Tournaments request") as [{ tournaments: Record<string, unknown>[] }];

describe("tournamentsResponseSchema", () => {
  it("parses the doc example", () => {
    const { tournaments } = tournamentsResponseSchema.parse(tournamentsExample);
    expect(tournaments[0]?.leaderboard[2]?.username).toBeNull();
  });

  it('accepts "-" as a place', () => {
    const example = clone(tournamentsExample);
    (example.tournaments[0] as { userData: { place: unknown } }).userData.place = "-";
    expect(tournamentsResponseSchema.parse(example).tournaments[0]?.userData.place).toBe("-");
  });
});
