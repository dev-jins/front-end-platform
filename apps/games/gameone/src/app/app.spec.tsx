import { act, fireEvent, render, screen } from "@testing-library/react";

import { createSlotSession, standardStateAdapter } from "@fep/game-core/slot";

import { createMockTransport } from "../dev/mock-transport";
import App from "./app";

async function startedSession() {
  const transport = createMockTransport();
  const session = createSlotSession({
    sessionKey: "mock",
    createTransport: () => transport,
    adapter: standardStateAdapter,
  });
  await session.start();
  return session;
}

describe("App", () => {
  it("renders before init has landed", () => {
    const session = createSlotSession({
      sessionKey: "mock",
      createTransport: createMockTransport,
      adapter: standardStateAdapter,
    });
    render(<App session={session} />);
    expect(screen.getByText("Balance …")).toBeTruthy();
  });

  it("shows balance and spins with the selected bet", async () => {
    const session = await startedSession();
    render(<App session={session} />);
    expect(screen.getByText("Balance 10000 USD")).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "100" } });
    await act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Spin" }));
      return vi.waitFor(() => expect(session.store.getState().balance).not.toBe("10000"));
    });
    expect(Number(session.store.getState().balance)).toBeLessThanOrEqual(10000 - 1000 + 500);
  });

  it("shows an ALERT and closes it", async () => {
    const session = await startedSession();
    act(() => session.store.setState({ error: { code: 3, level: "ALERT", message: "Not enough money" } }));
    render(<App session={session} />);

    expect(screen.getByRole("alertdialog").textContent).toContain("Not enough money");
    expect((screen.getByRole("button", { name: "Spin" }) as HTMLButtonElement).disabled).toBe(true);
    await act(() => {
      fireEvent.click(screen.getByRole("button", { name: "OK" }));
      return Promise.resolve();
    });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("shows session over without a way to continue", async () => {
    const session = await startedSession();
    act(() =>
      session.store.setState({ phase: "over", error: { code: 109, level: "CRITICAL", message: "Session is closed" } })
    );
    render(<App session={session} />);
    expect(screen.getByRole("alertdialog").textContent).toContain("Session over: Session is closed");
    expect(screen.queryByRole("button", { name: "OK" })).toBeNull();
  });
});
