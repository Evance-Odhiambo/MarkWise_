import type { Lecturer } from "../types/lecturer";

interface ParseResult {
  headers: string[];
  lecturers: Lecturer[];
}

export function parseLecturerCsv(csvText: string): ParseResult {
  const lines = csvText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  const headers = parseCsvLine(lines[0]);

  const requiredColumns = ["name", "staffNumber"];

  const missing = requiredColumns.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(
      `Missing required columns: ${missing.join(", ")}. Required columns: ${requiredColumns.join(", ")}`,
    );
  }

  const headerIndex = new Map(headers.map((h, i) => [h, i]));

  const lecturers: Lecturer[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    const name = values[headerIndex.get("name")!];
    const staffNumber = values[headerIndex.get("staffNumber")!];

    if (!name || !staffNumber) continue;

    lecturers.push({
      id: `lecturer-${i}`,
      name,
      staffNumber,
    });
  }

  return {
    headers,
    lecturers,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
