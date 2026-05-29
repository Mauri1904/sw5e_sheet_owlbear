import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
import { createSheet, deleteSheet, getSheets, onSheetsChange, updateSheet } from "./state";
import { renderApp } from "./ui";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app container.");
}

OBR.onReady(async () => {
  const isGM = (await OBR.player.getRole()) === "GM";
  const initial = await getSheets();
  const ui = renderApp(
    root,
    initial,
    isGM,
    async () => createSheet(),
    async (sheetId) => {
      await deleteSheet(sheetId);
    },
    async (sheetId, next) => {
      await updateSheet(sheetId, next);
    }
  );

  onSheetsChange((next) => {
    ui.setSheets(next);
  });
});
