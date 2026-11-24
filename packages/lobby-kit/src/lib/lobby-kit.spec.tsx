import { render } from "@testing-library/react";

import LobbyKit from "./lobby-kit";

describe("LobbyKit", () => {
  it("should render successfully", () => {
    const { baseElement } = render(<LobbyKit />);
    expect(baseElement).toBeTruthy();
  });
});
