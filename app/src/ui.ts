import type { CharacterData, CharacterSheet } from "./state";

type ChangeHandler = (sheetId: string, data: CharacterData) => void;
type DeleteHandler = (sheetId: string) => Promise<void>;

type CreateHandler = () => Promise<CharacterSheet>;

export type SheetUI = {
  setSheets: (sheets: CharacterSheet[]) => void;
};

const clampLevel = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(20, Math.max(1, Math.round(value)));
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export function renderApp(
  root: HTMLElement,
  initialSheets: CharacterSheet[],
  isGM: boolean,
  onCreateSheet: CreateHandler,
  onDeleteSheet: DeleteHandler,
  onChange: ChangeHandler
): SheetUI {
  root.innerHTML = `
    <main class="sheet" aria-live="polite">
      <header class="sheet__header">
        <p class="sheet__eyebrow">Room sheets</p>
        <h1>sw5e character sheet</h1>
      </header>
      <div class="sheet__content"></div>
    </main>
  `;

  const content = root.querySelector<HTMLDivElement>(".sheet__content");

  if (!content) {
    throw new Error("Sheet UI failed to render.");
  }

  let sheets = initialSheets;
  let selectedSheetId: string | null = null;
  let draft: CharacterData | null = null;
  let isDirty = false;
  let lastDeleteError = "";

  const getSelectedSheet = (): CharacterSheet | null => {
    if (!selectedSheetId) {
      return null;
    }

    return sheets.find((sheet) => sheet.id === selectedSheetId) ?? null;
  };

  const syncDraft = (sheet: CharacterSheet) => {
    draft = {
      name: sheet.name,
      level: sheet.level,
      classes: sheet.classes ?? "",
      species: sheet.species ?? "",
      alignment: sheet.alignment ?? "",
      background: sheet.background ?? "",
      playerName: sheet.playerName ?? "",
      experience: sheet.experience ?? 0,
      xpNext: sheet.xpNext ?? 0,
    };
    isDirty = false;
  };

  const renderSelection = () => {
    content.innerHTML = `
      <section class="sheet__selection">
        <p class="sheet__intro">select sheet or create a new one</p>
        <div class="sheet__list" role="list"></div>
        <button class="sheet__button sheet__button--primary" type="button" data-action="new-sheet">
          New Sheet
        </button>
      </section>
    `;

    const list = content.querySelector<HTMLDivElement>(".sheet__list");
    const newSheetButton = content.querySelector<HTMLButtonElement>(
      '[data-action="new-sheet"]'
    );

    if (!list || !newSheetButton) {
      throw new Error("Sheet selection UI failed to render.");
    }

    list.innerHTML = sheets
      .map(
        (sheet) => `
          <button class="sheet__button sheet__button--sheet" type="button" data-sheet-id="${sheet.id}">
            <span class="sheet__button-title">${escapeHtml(sheet.name)}</span>
            <span class="sheet__button-meta">Level ${sheet.level}</span>
          </button>
        `
      )
      .join("");

    list.querySelectorAll<HTMLButtonElement>("[data-sheet-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedSheetId = button.dataset.sheetId ?? null;
        renderEditor();
      });
    });

    newSheetButton.addEventListener("click", async () => {
      const sheet = await onCreateSheet();
      sheets = [...sheets, sheet];
      selectedSheetId = sheet.id;
      syncDraft(sheet);
      renderEditor();
    });
  };

  const renderEditor = () => {
    const sheet = getSelectedSheet();

    if (!sheet) {
      selectedSheetId = null;
      draft = null;
      isDirty = false;
      renderSelection();
      return;
    }

    if (!draft || !selectedSheetId || selectedSheetId !== sheet.id) {
      syncDraft(sheet);
    }

    content.innerHTML = `
      <section class="sheet__editor">
        <div class="sheet__toolbar">
          <button class="sheet__button sheet__button--ghost" type="button" data-action="back">
            Back to sheets
          </button>
          <p class="sheet__status">${escapeHtml(sheet.name)}${isDirty ? " • Unsaved changes" : ""}</p>
          <button class="sheet__button sheet__button--primary sheet__button--save" type="button" data-action="save">
            Save edits
          </button>
        </div>
        ${
          lastDeleteError
            ? `<p class="sheet__status sheet__status--error">${escapeHtml(lastDeleteError)}</p>`
            : ""
        }
        <section class="sheet__body">
          <label class="field" for="character-name">
            <span class="field__label">Character name</span>
            <input id="character-name" name="character-name" type="text" placeholder="Name" value="${escapeHtml((draft ?? sheet).name)}" />
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
              value="${String((draft ?? sheet).level)}"
            />
          </label>
          <label class="field" for="character-experience">
            <span class="field__label">Experience Points</span>
            <input id="character-experience" name="character-experience" type="number" inputmode="numeric" min="0" step="1" value="${String((draft ?? sheet).experience ?? 0)}" />
          </label>
          <label class="field" for="character-xp-next">
            <span class="field__label">XP Next Level</span>
            <input id="character-xp-next" name="character-xp-next" type="number" inputmode="numeric" min="0" step="1" value="${String((draft ?? sheet).xpNext ?? 0)}" />
          </label>
          <label class="field" for="character-classes">
            <span class="field__label">Class(es)</span>
            <input id="character-classes" name="character-classes" type="text" placeholder="Class(es)" value="${escapeHtml((draft ?? sheet).classes ?? "")}" />
          </label>
          <label class="field" for="character-species">
            <span class="field__label">Species</span>
            <input id="character-species" name="character-species" type="text" placeholder="Species" value="${escapeHtml((draft ?? sheet).species ?? "")}" />
          </label>
          <label class="field" for="character-alignment">
            <span class="field__label">Alignment</span>
            <input id="character-alignment" name="character-alignment" type="text" placeholder="Alignment" value="${escapeHtml((draft ?? sheet).alignment ?? "")}" />
          </label>
          <label class="field" for="character-background">
            <span class="field__label">Background</span>
            <input id="character-background" name="character-background" type="text" placeholder="Background" value="${escapeHtml((draft ?? sheet).background ?? "")}" />
          </label>
          <label class="field" for="character-player">
            <span class="field__label">Player's Name</span>
            <input id="character-player" name="character-player" type="text" placeholder="Player's Name" value="${escapeHtml((draft ?? sheet).playerName ?? "")}" />
          </label>
        </section>
        ${
          isGM
            ? `
          <section class="sheet__danger-zone">
            <p class="sheet__danger-title">Delete character</p>
            <p class="sheet__danger-copy">Type DELETE to confirm permanent removal of this sheet.</p>
            <div class="sheet__danger-row">
              <input id="delete-confirm" name="delete-confirm" type="text" placeholder="DELETE" autocomplete="off" />
              <button class="sheet__button sheet__button--danger" type="button" data-action="delete" disabled>
                Delete character
              </button>
            </div>
          </section>
        `
            : ""
        }
      </section>
    `;

    const nameInput = content.querySelector<HTMLInputElement>("#character-name");
    const levelInput = content.querySelector<HTMLInputElement>("#character-level");
    const classesInput = content.querySelector<HTMLInputElement>("#character-classes");
    const speciesInput = content.querySelector<HTMLInputElement>("#character-species");
    const alignmentInput = content.querySelector<HTMLInputElement>("#character-alignment");
    const backgroundInput = content.querySelector<HTMLInputElement>("#character-background");
    const playerInput = content.querySelector<HTMLInputElement>("#character-player");
    const experienceInput = content.querySelector<HTMLInputElement>("#character-experience");
    const xpNextInput = content.querySelector<HTMLInputElement>("#character-xp-next");
    const backButton = content.querySelector<HTMLButtonElement>('[data-action="back"]');
    const saveButton = content.querySelector<HTMLButtonElement>('[data-action="save"]');
    const deleteInput = isGM ? content.querySelector<HTMLInputElement>("#delete-confirm") : null;
    const deleteButton = isGM ? content.querySelector<HTMLButtonElement>('[data-action="delete"]') : null;

    if (!nameInput || !levelInput || !backButton || !saveButton || (isGM && (!deleteInput || !deleteButton))) {
      throw new Error("Sheet editor UI failed to render.");
    }

    const applyDraft = (next: CharacterData) => {
      draft = next;
      nameInput.value = next.name;
      levelInput.value = String(next.level);
      if (classesInput) classesInput.value = next.classes ?? "";
      if (speciesInput) speciesInput.value = next.species ?? "";
      if (alignmentInput) alignmentInput.value = next.alignment ?? "";
      if (backgroundInput) backgroundInput.value = next.background ?? "";
      if (playerInput) playerInput.value = next.playerName ?? "";
      if (experienceInput) experienceInput.value = String(next.experience ?? 0);
      if (xpNextInput) xpNextInput.value = String(next.xpNext ?? 0);
      isDirty = true;
      saveButton.disabled = false;
      saveButton.textContent = "Save edits";
    };

    const getNameInput = () => nameInput.value.trim() || "New Character";

    const getLevelInput = () => {
      const parsed = Number.parseInt(levelInput.value, 10);
      return clampLevel(Number.isFinite(parsed) ? parsed : sheet.level);
    };

    const getExperienceInput = () => {
      const parsed = Number.parseInt(experienceInput?.value ?? "0", 10);
      if (!Number.isFinite(parsed) || parsed < 0) return (sheet as any).experience ?? 0;
      return Math.max(0, Math.floor(parsed));
    };

    const getXpNextInput = () => {
      const parsed = Number.parseInt(xpNextInput?.value ?? "0", 10);
      if (!Number.isFinite(parsed) || parsed < 0) return (sheet as any).xpNext ?? 0;
      return Math.max(0, Math.floor(parsed));
    };

    nameInput.addEventListener("input", () => {
      if (!selectedSheetId || !draft) {
        return;
      }

      applyDraft({
        ...draft,
        name: getNameInput(),
      });
    });

    levelInput.addEventListener("input", () => {
      if (!selectedSheetId || !draft) {
        return;
      }

      applyDraft({
        ...draft,
        level: getLevelInput(),
      });
    });

    if (experienceInput) {
      experienceInput.addEventListener("input", () => {
        if (!selectedSheetId || !draft) return;
        applyDraft({ ...draft, experience: getExperienceInput() });
      });

      experienceInput.addEventListener("blur", () => {
        experienceInput.value = String(getExperienceInput());
      });
    }

    if (xpNextInput) {
      xpNextInput.addEventListener("input", () => {
        if (!selectedSheetId || !draft) return;
        applyDraft({ ...draft, xpNext: getXpNextInput() });
      });

      xpNextInput.addEventListener("blur", () => {
        xpNextInput.value = String(getXpNextInput());
      });
    }

    if (classesInput) {
      classesInput.addEventListener("input", () => {
        if (!selectedSheetId || !draft) return;
        applyDraft({ ...draft, classes: classesInput.value.trim() });
      });
    }

    if (speciesInput) {
      speciesInput.addEventListener("input", () => {
        if (!selectedSheetId || !draft) return;
        applyDraft({ ...draft, species: speciesInput.value.trim() });
      });
    }

    if (alignmentInput) {
      alignmentInput.addEventListener("input", () => {
        if (!selectedSheetId || !draft) return;
        applyDraft({ ...draft, alignment: alignmentInput.value.trim() });
      });
    }

    if (backgroundInput) {
      backgroundInput.addEventListener("input", () => {
        if (!selectedSheetId || !draft) return;
        applyDraft({ ...draft, background: backgroundInput.value.trim() });
      });
    }

    if (playerInput) {
      playerInput.addEventListener("input", () => {
        if (!selectedSheetId || !draft) return;
        applyDraft({ ...draft, playerName: playerInput.value.trim() });
      });
    }

    levelInput.addEventListener("blur", () => {
      levelInput.value = String(getLevelInput());
    });

    saveButton.addEventListener("click", async () => {
      if (!selectedSheetId || !draft) {
        return;
      }

      await onChange(selectedSheetId, draft);
      isDirty = false;
      saveButton.disabled = true;
      saveButton.textContent = "Saved";
    });

    if (isGM && deleteInput && deleteButton) {
      deleteInput.addEventListener("input", () => {
        deleteButton.disabled = deleteInput.value !== "DELETE";
        if (deleteInput.value !== "DELETE") {
          deleteButton.textContent = "Delete character";
        }
      });

      deleteButton.addEventListener("click", async () => {
        if (!selectedSheetId) {
          return;
        }

        if (deleteInput.value !== "DELETE") {
          lastDeleteError = "Type DELETE to confirm deletion.";
          renderEditor();
          return;
        }

        await onDeleteSheet(selectedSheetId);
        selectedSheetId = null;
        draft = null;
        isDirty = false;
        lastDeleteError = "";
        renderSelection();
      });
    }

    backButton.addEventListener("click", () => {
      selectedSheetId = null;
      draft = null;
      isDirty = false;
      lastDeleteError = "";
      renderSelection();
    });

    saveButton.disabled = true;
    if (isGM && deleteButton && deleteInput) {
      deleteButton.disabled = deleteInput.value !== "DELETE";
    }
  };

  renderSelection();

  return {
    setSheets: (nextSheets) => {
      sheets = nextSheets;

      if (selectedSheetId && !sheets.some((sheet) => sheet.id === selectedSheetId)) {
        selectedSheetId = null;
        draft = null;
        isDirty = false;
        renderSelection();
        return;
      }

      if (selectedSheetId) {
        renderEditor();
        return;
      }

      renderSelection();
    },
  };
}
