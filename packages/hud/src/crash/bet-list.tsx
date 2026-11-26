import type { CrashBet } from "@fep/protocol/crash";

import styles from "./crash-hud.module.css";

/** Players' bets: name, amount, and the cash-out multiplier and win once they have one. */
export function BetList({ title, bets, money }: { title: string; bets: CrashBet[]; money(amount: string): string }) {
    return (
        <section aria-label={title}>
            <span className={styles.label}>{title}</span>
            {bets.length === 0 ? (
                <p>—</p>
            ) : (
                <ul className={styles.bets}>
                    {bets.map((bet) => (
                        <li key={bet.id} className={bet.win ? styles.won : undefined}>
                            <span>{bet.username ?? "Player"}</span>
                            <span>{money(bet.amount)}</span>
                            <span>{bet.multiplier && bet.win ? `${bet.multiplier}x · ${money(bet.win)}` : ""}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
