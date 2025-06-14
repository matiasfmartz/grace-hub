
'use server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DB_FOLDER_PATH = path.join(process.cwd(), 'src/lib');

// Ensure the directory exists, Next.js might run this in different contexts
// For simplicity in this prototype, we assume the 'src/lib' directory exists.
// In a real scenario, you might want to ensure it's created:
// try {
//   await fs.mkdir(DB_FOLDER_PATH, { recursive: true });
// } catch (e) {
//   // ignore if already exists
// }


export async function readDbFile<T>(filePath: string, defaultData: T[] = []): Promise<T[]> {
  try {
    const fullPath = path.join(DB_FOLDER_PATH, filePath);
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(fileContent) as T[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, write default data and return it
      await writeDbFile(filePath, defaultData);
      return defaultData;
    }
    console.error(`Failed to read ${filePath}:`, error);
    // Fallback to default data on other errors to prevent app crash
    return defaultData; 
  }
}

export async function writeDbFile<T>(filePath: string, data: T[]): Promise<void> {
  try {
    const fullPath = path.join(DB_FOLDER_PATH, filePath);
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to write to ${filePath}:`, error);
    throw error; // Re-throw to be handled by calling function
  }
}
