// =================================================================
// services/supabase.ts
// Alpro Budgeting System - Supabase Client & Core API Functions
//
// MIGRASI DARI: services/api.ts (Google Apps Script via REST)
// MIGRASI KE  : Supabase (PostgreSQL + RLS + Auth)
//
// Sprint 1: Client init, types, auth helpers, checkBudgetCap
// Sprint 2: submitMultipleBudgets → atomic via RPC submit_budget_batch
// =================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BudgetItem, BudgetStatus } from '../types';

// -----------------------------------------------------------------
// KONFIGURASI
// Ambil dari environment variables. JANGAN hardcode di sini.
// Di Vite: buat file .env.local dengan dua baris berikut:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...
// -----------------------------------------------------------------
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error(
        '[supabase.ts] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan. ' +
        'Pastikan file .env.local sudah dikonfigurasi dengan benar.'
    );
}

// Singleton client — aman di-import dari mana saja di dalam aplikasi
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
        // Simpan sesi di localStorage agar user tidak logout tiap refresh
        persistSession: true,
        autoRefreshToken: true,
    },
});


// =================================================================
// TYPE DEFINITIONS (selaras dengan skema SQL baru)
// =================================================================

/** Payload untuk satu budget request per vendor yang akan di-submit */
export interface BudgetRequestPayload {
    userId: string;
    userName: string;
    department: string;
    outletId: string;           // NEW: wajib ada di skema baru
    items: BudgetItem[];
    total: number;
    vendorId: string | null;
    managerApproverId?: string;
    bodApproverId?: string;
}

/** Hasil dari pengecekan plafon */
export interface BudgetCapCheckResult {
    remainingCap: number;
    isOver: boolean;
    capAmount: number;
}


// =================================================================
// SPRINT 2: submitMultipleBudgets (Atomic via RPC)
//
// Seluruh logika validasi plafon + INSERT sekarang didelegasikan ke
// fungsi PostgreSQL `submit_budget_batch` yang berjalan dalam satu
// transaksi database. Client HANYA bertanggung jawab untuk:
//   1. Membangun payload dengan benar.
//   2. Menangani error code yang dikembalikan RPC dan menampilkannya
//      ke user dalam bahasa yang manusiawi.
//
// TIDAK ada lagi cap check terpisah di client — race condition dieliminasi.
// =================================================================

/** Hasil sukses dari RPC submit_budget_batch */
export interface SubmitBatchResult {
    success: boolean;
    count: number;
    inserted_ids: string[];
}

/**
 * Peta error code dari RPC ke pesan yang ramah untuk ditampilkan di UI.
 * Sumber kebenaran: submit_budget_batch.sql (RAISE EXCEPTION ... USING errcode)
 */
const RPC_ERROR_MESSAGES: Record<string, string> = {
    'P0001': 'Pengajuan gagal: Tidak ada item yang bisa disubmit.',
    'P0002': 'Pengajuan gagal: Akun Anda belum terdaftar di outlet manapun. Hubungi Admin.',
    'P0003': 'Pengajuan gagal: Hanya staff outlet yang dapat mengajukan budget.',
    'P0004': 'Pengajuan gagal: Data pengajuan tidak lengkap (outlet_id hilang).',
    'P0005': 'Akses ditolak: Data outlet dalam pengajuan tidak sesuai dengan akun Anda.',
    'P0006': 'Pengajuan ditolak: Plafon budget bulan ini belum ditetapkan untuk outlet Anda. Hubungi Admin.',
    'P0007': 'Pengajuan ditolak: Total pengajuan melebihi sisa plafon budget bulan ini.',
};

/**
 * Submit satu atau lebih budget request dalam SATU transaksi database.
 *
 * Mendelegasikan semua logika ke RPC `submit_budget_batch` (Sprint 2):
 *   - Validasi kepemilikan outlet (server-side, tidak mempercayai payload)
 *   - Pengecekan plafon (Budget Cap)
 *   - Bulk INSERT atomik (all-or-nothing)
 *
 * @param requests - Array payload pengajuan, satu per vendor
 * @returns SubmitBatchResult — jumlah dan ID record yang berhasil dibuat
 */
export async function submitMultipleBudgets(
    requests: BudgetRequestPayload[]
): Promise<SubmitBatchResult> {

    if (requests.length === 0) {
        throw new Error('Tidak ada request untuk disubmit.');
    }

    // Mapping camelCase TypeScript → snake_case kolom SQL
    // Status TIDAK dimasukkan ke payload — RPC selalu set ke 'Pending Admin Review'
    const rpcPayload = requests.map((req) => ({
        user_id:             req.userId,
        user_name:           req.userName,
        department:          req.department,
        outlet_id:           req.outletId,
        items:               req.items,
        total:               req.total,
        vendor_id:           req.vendorId ?? null,
        manager_approver_id: req.managerApproverId ?? null,
        bod_approver_id:     req.bodApproverId ?? null,
    }));

    let data: SubmitBatchResult | null = null;
    let error: { code?: string; message: string } | null = null;

    try {
        // Satu panggilan RPC = satu transaksi PostgreSQL.
        // Jika RPC RAISE EXCEPTION, Supabase JS membungkusnya sebagai error object.
        const result = await supabase.rpc('submit_budget_batch', {
            p_requests: rpcPayload,
        });
        data  = result.data as SubmitBatchResult | null;
        error = result.error as typeof error;
    } catch (networkErr: unknown) {
        // Tangkap kegagalan jaringan (timeout, offline) — bukan error dari RPC
        const msg = networkErr instanceof Error ? networkErr.message : 'Unknown network error';
        console.error('[submitMultipleBudgets] Network error:', msg);
        throw new Error(
            'Koneksi ke server gagal. Periksa koneksi internet Anda dan coba kembali. ' +
            'Data Anda belum tersimpan.'
        );
    }

    if (error) {
        console.error('[submitMultipleBudgets] RPC error:', error.code, error.message);

        // Coba petakan error code ke pesan yang ramah
        const friendlyMessage =
            (error.code && RPC_ERROR_MESSAGES[error.code])
                // Fallback: tampilkan pesan asli dari PostgreSQL
                ?? `Pengajuan gagal: ${error.message}`;

        throw new Error(friendlyMessage);
    }

    if (!data || !data.success) {
        throw new Error('Pengajuan gagal: Server tidak memberikan konfirmasi. Coba kembali.');
    }

    return data;
}


// =================================================================
// AUTH HELPERS
// Pembungkus tipis atas Supabase Auth — digunakan di AuthContext.tsx
// =================================================================

/**
 * Login menggunakan email & password.
 * Mengganti logika getUsers() + password compare di App.tsx yang lama.
 * Keamanan meningkat drastis karena password tidak pernah dikirim ke client.
 */
export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
}

/** Logout dan invalidate sesi */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
}

/**
 * Mengambil profil user yang sedang login dari tabel public.users.
 * Dipanggil setelah signIn berhasil di AuthProvider.
 */
export async function getCurrentUserProfile() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    const { data: profile, error } = await supabase
        .from('users')
        .select('*, outlets(outlet_code, outlet_name, city)')
        .eq('id', authUser.id)
        .single();

    if (error) {
        console.error('[getCurrentUserProfile] Error:', error.message);
        return null;
    }

    return profile;
}
