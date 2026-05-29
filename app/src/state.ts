import OBR from "@owlbear-rodeo/sdk";

export type CharacterData = {
  name: string;
  level: number;
  classes: string;
  species: string;
  alignment: string;
  background: string;
  playerName: string;
  experience: number;
  xpNext: number;
};

export type CharacterSheet = CharacterData & {
  id: string;
};

export type SheetStore = {
  sheets: CharacterSheet[];
};

const SHEETS_KEY = "com.mauri.sw5e.sheets";
const DEFAULT_CHARACTER: CharacterData = {
  name: "New Character",
  level: 1,
  classes: "",
  species: "",
  alignment: "",
  background: "",
  playerName: "",
  experience: 0,
  xpNext: 0,
};

const clampLevel = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_CHARACTER.level;
  }

  return Math.min(20, Math.max(1, Math.round(value)));
};

const createSheetId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeCharacter = (value: unknown): CharacterData => {
  if (!value || typeof value !== "object") {
    return DEFAULT_CHARACTER;
  }

  const record = value as Record<string, unknown>;
  const name =
    typeof record.name === "string" && record.name.trim().length > 0
      ? record.name
      : DEFAULT_CHARACTER.name;
  const level = clampLevel(Number(record.level));
  const classes = typeof record.classes === "string" ? record.classes : DEFAULT_CHARACTER.classes;
  const species = typeof record.species === "string" ? record.species : DEFAULT_CHARACTER.species;
  const alignment = typeof record.alignment === "string" ? record.alignment : DEFAULT_CHARACTER.alignment;
  const background = typeof record.background === "string" ? record.background : DEFAULT_CHARACTER.background;
  const playerName = typeof record.playerName === "string" ? record.playerName : DEFAULT_CHARACTER.playerName;
  const experienceRaw = Number(record.experience);
  const experience = Number.isFinite(experienceRaw) && experienceRaw >= 0 ? Math.floor(experienceRaw) : DEFAULT_CHARACTER.experience;
  const xpNextRaw = Number(record.xpNext);
  const xpNext = Number.isFinite(xpNextRaw) && xpNextRaw >= 0 ? Math.floor(xpNextRaw) : DEFAULT_CHARACTER.xpNext;

  return { name, level, classes, species, alignment, background, playerName, experience, xpNext };
};

const normalizeSheet = (value: unknown): CharacterSheet | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id =
    typeof record.id === "string" && record.id.trim().length > 0
      ? record.id
      : createSheetId();

  return {
    id: id,
    ...normalizeCharacter(record),
  };
};

const normalizeStore = (value: unknown): SheetStore => {
  if (!value || typeof value !== "object") {
    return { sheets: [] };
  }

  const record = value as Record<string, unknown>;
  const sheets = Array.isArray(record.sheets)
    ? record.sheets
      .map((sheet) => normalizeSheet(sheet))
      .filter((sheet): sheet is CharacterSheet => sheet !== null)
    : [];

  return { sheets };
};

const readStore = async (): Promise<SheetStore> => {
  const metadata = await OBR.room.getMetadata();
  return normalizeStore(metadata[SHEETS_KEY]);
};

const writeStore = async (store: SheetStore): Promise<void> => {
  await OBR.room.setMetadata({
    [SHEETS_KEY]: store,
  });
};

export async function getSheets(): Promise<CharacterSheet[]> {
  const store = await readStore();
  return store.sheets;
}

export async function createSheet(): Promise<CharacterSheet> {
  const store = await readStore();
  const sheet: CharacterSheet = {
    id: createSheetId(),
    ...DEFAULT_CHARACTER,
  };

  await writeStore({
    sheets: [...store.sheets, sheet],
  });

  return sheet;
}

export async function updateSheet(
  sheetId: string,
  data: CharacterData
): Promise<void> {
  const store = await readStore();
  const nextSheets = store.sheets.map((sheet) =>
    sheet.id === sheetId ? { ...sheet, ...data } : sheet
  );

  await writeStore({
    sheets: nextSheets,
  });
}

export async function deleteSheet(sheetId: string): Promise<void> {
  const store = await readStore();
  const nextSheets = store.sheets.filter((sheet) => sheet.id !== sheetId);

  await writeStore({
    sheets: nextSheets,
  });
}

export function onSheetsChange(
  callback: (data: CharacterSheet[]) => void
): () => void {
  return OBR.room.onMetadataChange((metadata) => {
    callback(normalizeStore(metadata[SHEETS_KEY]).sheets);
  });
}
