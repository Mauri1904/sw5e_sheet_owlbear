import OBR from "@owlbear-rodeo/sdk";

export type CharacterData = {
  name: string;
  level: number;
};

const CHARACTER_KEY = "com.mauri.sw5e.character";
const DEFAULT_CHARACTER: CharacterData = {
  name: "New Character",
  level: 1,
};

const clampLevel = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_CHARACTER.level;
  }

  return Math.min(20, Math.max(1, Math.round(value)));
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

  return { name, level };
};

export async function getCharacter(): Promise<CharacterData> {
  const metadata = await OBR.player.getMetadata();
  return normalizeCharacter(metadata[CHARACTER_KEY]);
}

export async function setCharacter(data: CharacterData): Promise<void> {
  await OBR.player.setMetadata({
    [CHARACTER_KEY]: data,
  });
}

export function onCharacterChange(
  callback: (data: CharacterData) => void
): () => void {
  return OBR.player.onMetadataChange((metadata) => {
    callback(normalizeCharacter(metadata[CHARACTER_KEY]));
  });
}
