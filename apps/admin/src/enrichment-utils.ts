export function parseReasonsInput(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function formatReasonsForEdit(reasons: string[]): string {
  return reasons.join("\n");
}

export function parseExtraImagesInput(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function formatExtraImagesForEdit(urls: string[]): string {
  return urls.join("\n");
}
