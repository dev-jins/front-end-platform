import type { ReactNode } from "react";

import styles from "./dialog.module.css";

/** Modal over the game: error, session over, popups. */
export function Dialog({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className={styles.backdrop}>
            <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-label={title}>
                <h2>{title}</h2>
                {children}
            </div>
        </div>
    );
}
