import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";

import App from "./app/app";
import { bootGame } from "./game";

void bootGame(document.getElementById("game") as HTMLElement).then((session) =>
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
      <App session={session} />
    </StrictMode>
  )
);
