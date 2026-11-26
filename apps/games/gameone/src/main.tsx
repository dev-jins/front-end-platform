import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";

import App from "./app/app";
import { bootGame } from "./game";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

bootGame(document.getElementById("game") as HTMLElement).then(
    (session) =>
        root.render(
            <StrictMode>
                <App session={session} />
            </StrictMode>
        ),
    (error: unknown) => root.render(<p role="alert">{error instanceof Error ? error.message : String(error)}</p>)
);
