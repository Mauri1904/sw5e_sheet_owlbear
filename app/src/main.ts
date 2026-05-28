import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
import { getCharacter, onCharacterChange, setCharacter } from "./state";
import { renderApp } from "./ui";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app container.");
}

OBR.onReady(async () => {
  const initial = await getCharacter();
  const ui = renderApp(root, initial, async (next) => {
    await setCharacter(next);
  });

  onCharacterChange((next) => {
    ui.setCharacter(next);
  });
});
