'use server';
import type { TitheRecord } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { revalidatePath } from 'next/cache';

const TITHES_DB_FILE = 'tithes-db.json';

export async function getAllTitheRecords(): Promise<TitheRecord[]> {
    return readDbFile<TitheRecord>(TITHES_DB_FILE, []);
}

export async function setTitheStatus(memberId: string, year: number, month: number, didTithe: boolean): Promise<{ success: boolean; message: string }> {
    try {
        const allRecords = await getAllTitheRecords();
        const recordExists = allRecords.some(r => r.memberId === memberId && r.year === year && r.month === month);

        let updatedRecords: TitheRecord[];

        if (didTithe && !recordExists) {
            // Add a new record
            const newRecord: TitheRecord = {
                id: `${memberId}-${year}-${month}`, // Simple unique ID for this context
                memberId,
                year,
                month,
            };
            updatedRecords = [...allRecords, newRecord];
        } else if (!didTithe && recordExists) {
            // Remove the existing record
            updatedRecords = allRecords.filter(r => !(r.memberId === memberId && r.year === year && r.month === month));
        } else {
            // No change needed
            return { success: true, message: "No change needed." };
        }

        await writeDbFile<TitheRecord>(TITHES_DB_FILE, updatedRecords);
        revalidatePath('/tithes');
        return { success: true, message: "Estado de diezmo actualizado." };
    } catch (error: any) {
        console.error("Error setting tithe status:", error);
        return { success: false, message: `Error al actualizar: ${error.message}` };
    }
}
