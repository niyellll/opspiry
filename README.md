# OPSPIRY — Distribution Operating System

**Distribusi lebih terkontrol, bisnis lebih terukur.**

A responsive Next.js 16 / React 19 web application inspired by the supplied red-and-white OPSPIRY design. The feature layout follows common distribution/finance workflows without copying or depending on the BBM Finance databases.

## Implemented in v0.1

- Responsive dashboard: invoice turnover, estimated gross profit, receivables, inventory valuation, 7-day trend and quick actions.
- Sales and purchases: create invoices with product, counterparty, quantity, due date and partial payment; basic oversell validation.
- Inventory: stock from opening + purchases - sales + adjustments, minimum-stock warnings, movement history.
- A/R and A/P: outstanding balances, partial/full payments, methods, reference numbers and payment history.\n- Printable purchase/sales documents with marked preview/simulation status.\n- A/R and A/P aging (not due, 1–30, 31–60, >60 days) and payment-history CSV export.
- Master data: products, customers and suppliers.
- Distribution: delivery orders with driver, vehicle, destination and three shipment statuses.
- Reports: simple financial metrics and product contribution; CSV exports.
- Browser-based demo data with localStorage persistence, reset, responsive navigation and PWA manifest/service worker.
- Optional **personal** Supabase login and per-user JSON workspace persistence when a dedicated backend is configured.

**Important**: All seeded records are fictitious. The initial preview is a demo, **not** a production accounting system. No historical BBM, CSB or GPP data is read or changed. The reported gross profit is only a simple estimate of revenue less each product's current unit cost; it is not audited accounting profit.

## Development

Use Node 22 or newer.

~~~bash
npm install
npm run dev
npm run typecheck
npm run build
~~~

Open http://localhost:3000.

## Cloud setup (optional, isolated)

1. Create a **new** Supabase project exclusively for OPSPIRY, separate from BBM, CSB and GPP.
2. Run the SQL in [supabase/schema.sql](supabase/schema.sql) on that new project. Keep RLS enabled and verify policies.
3. Set the project's URL and **publishable** key in Vercel (Production, Preview, Development) or local \`.env.local\`: \`NEXT_PUBLIC_SUPABASE_URL\`, \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\`.
4. Redeploy, then use Pengaturan > Daftar Akun Baru / Masuk Cloud to access a private workspace. For email confirmation, complete the confirmation before login.
5. Run the Supabase security advisors before loading any real company data.

Never use a service_role / secret API key in public frontend env vars. Do not point OPSPIRY to another application's live database.

## Roadmap before production

- Dedicated database normalized per tenant, branch isolation, membership roles and scoped permissions.
- Transaction-safe database posting, inventory reservations, lock periods and audit log.
- Real financial ledgers, invoice print/PDF, returns, tax, payments, cost-of-goods-sold accounting.
- Multi-line invoices, import templates and validation, approval flows, transfer antar gudang.
- Multi-user real-time conflict resolution, automated tests and independent backup/recovery.
- PNG 192/512 PWA artwork and complete installability checks on target devices.

## Deployment

Link this repository to a **separate OPSPIRY** Vercel project. No BBM/GPP/CSB Vercel deployment or Supabase database should be reused.

## Penerimaan barang dan sinkronisasi cloud

Dari **Pembelian → Penerimaan Barang**, pilih **Terima barang** dan masukkan jumlah fisik yang diterima. Penerimaan bisa sebagian hingga jumlah pesanan terpenuhi. Stok dan riwayat mutasi berubah setelah penerimaan tersimpan. Pesanan sebelum fitur ini tetap dihitung sudah masuk stok, sesuai pencatatan lama.

Untuk cloud, rilis ini memerlukan migrasi `supabase/migrations/20261125130825_stock_receiving_and_revision.sql` pada Supabase Postgres 16 atau lebih baru. Workspace tetap per akun. Dua perangkat pada akun yang sama menggunakan revisi yang sama sampai salah satu menyimpan. Saat terjadi konflik, aplikasi memuat data terbaru dan mempertahankan isian yang masih terbuka. Tombol **Coba simpan lagi** mengirim ulang ID perubahan yang sama ketika respons cloud belum terkonfirmasi.

### Rilis cloud

1. Cocokkan project ref Supabase di konfigurasi deployment dengan proyek khusus aplikasi ini. Uji terlebih dahulu di lingkungan terisolasi. Untuk database kosong, pasang skema dasar `supabase/schema.sql` sebelum migrasi.
2. Ambil backup sebelum cutover dan pastikan bisa dipulihkan. Jadwalkan cutover skema dan aplikasi bersama. Setelah migrasi, klien lama kehilangan akses tulis langsung sehingga perangkat harus memuat versi aplikasi terbaru.
3. Setelah cutover, uji dua sesi pada akun uji yang sama, penjualan melebihi stok, serta penerimaan sebagian dan penuh. Periksa saldo stok dan riwayat mutasi sebelum pemakaian harian.
4. Jika cutover gagal, jeda penulisan cloud dan ambil snapshot database terbaru sebelum tindakan pemulihan. Bila transaksi sudah masuk melalui penerimaan, pertahankan data dan perbaiki ke depan dengan klien yang kompatibel. Klien lama menghitung pembelian baru sebagai stok masuk, sehingga rollback aplikasi saja tidak kompatibel dengan data tersebut.
