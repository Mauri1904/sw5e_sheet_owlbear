import type { CharacterData } from "./state";

type ChangeHandler = (data: CharacterData) => void;

export type SheetUI = {
  setCharacter: (data: CharacterData) => void;
};

const clampLevel = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(20, Math.max(1, Math.round(value)));
};

export function renderApp(
  root: HTMLElement,
  initial: CharacterData,
  onChange: ChangeHandler
): SheetUI {
  root.innerHTML = `
    <main class="sheet" aria-live="polite">
      <header class="sheet__header">
        <h1>sw5e character sheet</h1>
      </header>
      <section class="sheet__body">
        <label class="field" for="character-name">
          <span class="field__label">Character name</span>
          <input id="character-name" name="character-name" type="text" placeholder="Name" />
        </label>
        <label class="field" for="character-level">
          <span class="field__label">Level</span>
          <input
            id="character-level"
            name="character-level"
            type="number"
            inputmode="numeric"
            min="1"
            max="20"
            step="1"
          />
        </label>
      </section>
    </main>
  `;

  const nameInput = root.querySelector<HTMLInputElement>("#character-name");
  const levelInput = root.querySelector<HTMLInputElement>("#character-level");

  if (!nameInput || !levelInput) {
    throw new Error("Sheet UI failed to render.");
  }

  let current = initial;

  const applyCharacter = (next: CharacterData) => {
    current = next;
    nameInput.value = next.name;
    levelInput.value = String(next.level);
  };

  const getNameInput = () => nameInput.value.trim() || "New Character";

  const getLevelInput = () => {
    const parsed = Number.parseInt(levelInput.value, 10);
    return clampLevel(Number.isFinite(parsed) ? parsed : current.level);
  };

  nameInput.addEventListener("input", () => {
    onChange({
      ...current,
      name: getNameInput(),
    });
  });

  levelInput.addEventListener("input", () => {
    onChange({
      ...current,
      level: getLevelInput(),
    });
  });

  levelInput.addEventListener("blur", () => {
    levelInput.value = String(getLevelInput());
  });

  applyCharacter(initial);

  return {
    setCharacter: applyCharacter,
  };
}
