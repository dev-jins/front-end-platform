import { render } from "@testing-library/react";

import Hud from "./hud";

describe("Hud", () => {
  it("should render successfully", () => {
    const { baseElement } = render(<Hud />);
    expect(baseElement).toBeTruthy();
  });
});
