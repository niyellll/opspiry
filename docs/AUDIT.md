# OPSPIRY — Audit Kritis (FASE 0)

> **Status: AUDIT SAJA — NO-GO PRODUKSI.** Tidak ada source code, konfigurasi Vercel, data pengguna, atau skema Supabase yang diubah oleh audit ini.
>
> Diperiksa: 17 November 2026 (WIB). Snapshot source: [`dac13c6e`](https://github.com/niyellll/opspiry/commit/dac13c6e326bcb55fc2298b7fe82668363fd51e3). Repository: [`niyellll/opspiry`](https://github.com/niyellll/opspiry). **Build Vercel READY** pada snapshot sebelumnya `72deab5`; commit PWA sesudahnya perlu diverifikasi deployment terpisah. Audit berfokus pada kode bukan klaim README.

## 1. Ringkasan eksekutif (5 baris)

1. UI OPSPIRY, transaksi sederhana, daftar persediaan, riwayat pembayaran, aging, cetak faktur A4, ekspor CSV, backup demo, dan PWA shell benar-benar ada.
2. Namun satu dokumen per invoice hanya satu produk, serta pembelian/penjualan langsung memengaruhi stok sebelum penerimaan/pengiriman riil.
3. Setiap akun cloud menyimpan satu blob JSON; last-write-wins mengancam transaksi dari dua perangkat dan tak ada posting atomik/audit trail.
4. Arus piutang, pembayaran, HPP dan nilai persediaan belum dapat dianggap sebagai pembukuan benar; potensi kehilangan uang/data **kritis**.
5. **Keputusan audit:** OPSPIRY hanya boleh dipakai dengan data fiktif. Jangan cutover, migrasi, atau mengaktifkan multiuser riil sebelum fase berikutnya diuji.

## 2. Lingkup, bukti, dan batasan

- Inspeksi terhadap **seluruh 22 file yang tersedia** (file source, doc, SQL, dan aset; PNG terdaftar tetapi isi biner tidak dievaluasi). Referensi file:baris di tabel mengacu ke commit snapshot di atas.
- File utama: `app/page.tsx` (280 baris sangat panjang, ±49 KB), `app/globals.css`, `lib/data.ts`, `lib/cloud.ts`, `lib/reporting.ts`, `supabase/schema.sql`, `components/InvoicePrint.tsx`, manifest dan SW, package, README.
- Metode: review statis source dan alur kode, contoh *counterexample* aritmetika, inspeksi metadata Vercel dan **nama** env yang tampak; tidak membaca kredensial.
- **Tidak dilakukan:** uji browser/Playwright, test fisik PWA, tes RLS cloud, audit keamanan runtime, CI unit test, uji transaksi 2 perangkat sebenarnya, axe/WCAG. Build sukses **bukan** pembuktian keamanan dan fungsi akuntansi.
- Dua perubahan terbaru sudah diperhitungkan: cetak invoice/aging/payment log sudah ada; perbaikan tanggal dari UTC ke local ada tetapi belum zona WIB eksplisit. Commit PWA baru menambahkan PNG 192/512 dan SW v2; kelayakan pemasangan belum diuji.
- Temuan `TERKONFIRMASI` berarti jalur kode mendukung risiko, **bukan** klaim eksploit benar-benar terjadi pada database produksi. `SEBAGIAN` berarti sebagian tuduhan awal kini terbantah karena implementasi terbaru.

## 3. Status klaim README (verifikasi, bukan asumsi)

| Klaim | Kategori | Bukti dan batas |
|---|---|---|
| Dashboard responsif dan metrik | **SUDAH ADA & BENAR untuk demo UI** | `app/page.tsx:217-227` dan CSS breakpoint, tetapi total tanpa periode |
| Validasi oversell | **ADA TAPI SALAH untuk produksi** | `app/page.tsx:144-152`; hanya pemeriksaan klien |
| Product contribution | **SUDAH ADA & BENAR sesuai model sederhana** | `app/page.tsx:254-256`; bukan laba bersih |
| Pencatatan pembayaran & aging | **ADA TAPI SALAH / TIDAK LENGKAP** | `app/page.tsx:176-182,257-259`; tidak jadi ledger utama |
| Cetak faktur | **SUDAH ADA & BENAR sebagai preview** | `components/InvoicePrint.tsx:1-13`; belum faktur resmi/terintegrasi |
| CSV export | **ADA TAPI SALAH** | `lib/data.ts:59-63`; formula injection |
| PWA installable | **ADA TAPI BELUM TERBUKTI** | `public/manifest.webmanifest`, `public/sw.js` dengan PNG baru; perlu install test |
| RLS aman | **ADA TAPI SALAH jika dimaknai keamanan transaksi** | `supabase/schema.sql:19-21`; cuma per user, payload tak dibatasi |
| Multiuser organisasi/cabang | **BELUM ADA** | `supabase/schema.sql:6-22`; tidak ada tenant/RBAC |
| Backup demo | **SUDAH ADA & BENAR terbatas** | `app/page.tsx:68-90`; tanpa schema migration/dry-run/rollback |

## 4. Audit 42 hipotesis awal

| ID | Area | Temuan | Bukti file:baris | Dampak bisnis | Severity | Usaha | Rekomendasi | Status |
|---|---|---|---|---|---|---|---|---|
| H01 | Data | Zona tanggal mengikuti OS, bukan Asia/Jakarta eksplisit | [`lib/data.ts:10-15`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L10-L15) | Tanggal beda di perangkat luar WIB | **Tinggi** | S | date-only WIB dan unit test lintas zona | SEBAGIAN |
| H02 | Data | Nomor transaksi, produk, mitra memakai count+1 | [`app/page.tsx:149-163`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L149-L163) | Bentrok nomor saat import atau paralel | **Kritis** | M | Sequence atomik per org/tahun | TERKONFIRMASI |
| H03 | Bisnis | Laba histori dihitung dari master cost terkini | [`app/page.tsx:127`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L127) | Laba lama berubah saat harga beli berubah | **Kritis** | M | Bekukan HPP di baris posting | TERKONFIRMASI |
| H04 | Bisnis | Satu Order cuma satu productId/qty/price | [`lib/data.ts:3`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L3) | Tidak bisa faktur 5 barang | **Kritis** | L | Header+lines | TERKONFIRMASI |
| H05 | Data | payments ada tetapi saldo bersumber dari paid kumulatif, void/alokasi tak ada | [`lib/data.ts:3-7`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L3-L7) | Selisih kas dan riwayat | **Kritis** | M | Payment ledger+allocation | SEBAGIAN |
| H06 | Bisnis | Tidak ada edit, void, retur, koreksi dokumen | [`app/page.tsx:144-175`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L144-L175) | Salah input sulit dipulihkan | **Tinggi** | L | State machine dan koreksi audit | TERKONFIRMASI |
| H07 | Data | Cek oversell hanya stok di React | [`app/page.tsx:147-152`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L147-L152) | Dua transaksi bisa oversell | **Kritis** | L | Posting RPC dengan lock | TERKONFIRMASI |
| H08 | Bisnis | Pengiriman tanpa qty atau POD dan status bisa mundur | [`lib/data.ts:4`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L4), [`app/page.tsx:252`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L252) | Bukti pemenuhan tidak valid | **Kritis** | L | Delivery lines dan status server | TERKONFIRMASI |
| H09 | Bisnis | Jatuh tempo tidak dicek terhadap tanggal invoice | [`app/page.tsx:144-152`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L144-L152) | Salah periode/tagih | **Tinggi** | S | Validasi tanggal dan period lock | TERKONFIRMASI |
| H10 | Bisnis | Qty hanya integer; tiada konversi satuan | [`app/page.tsx:146-148`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L146-L148) | Barang curah/karton-pcs tidak terlayani | **Tinggi** | M | Unit produk dengan presisi | TERKONFIRMASI |
| H11 | Bisnis | Invoice tanpa diskon, ongkir dan pajak | [`lib/data.ts:3`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L3) | Total transaksi nyata tidak representatif | **Tinggi** | L | Breakdown invoice_lines | TERKONFIRMASI |
| H12 | Bisnis | Batch/expired/FEFO absen | [`lib/data.ts:2-5`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L2-L5) | Barang kedaluwarsa tak terlacak | **Tinggi** | L | Lot tracking selektif | TERKONFIRMASI |
| H13 | Data | Upsert seluruh JSON last-write-wins | [`lib/cloud.ts:18-22`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/cloud.ts#L18-L22) | Tulis lintas perangkat menghapus perubahan | **Kritis** | L | Relasional+RPC | TERKONFIRMASI |
| H14 | UX | Seed demo tampil sebelum auth dan load cloud | [`app/page.tsx:42-43`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L42-L43), [`app/page.tsx:92-99`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L92-L99) | Pengguna melihat data fiktif sementara | **Tinggi** | M | Auth gate fail-closed | TERKONFIRMASI |
| H15 | Data | Load cloud error meninggalkan UI demo aktif | [`app/page.tsx:95-111`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L95-L111) | Pengguna mengira bekerja pada cloud | **Kritis** | M | Error state blokir tulis dan retry | TERKONFIRMASI |
| H16 | Data | Debounce save tanpa retry durable/unsaved guard | [`app/page.tsx:105-111`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L105-L111) | Tab ditutup sebelum save selesai | **Kritis** | M | Queue/idempotensi dan indicator | TERKONFIRMASI |
| H17 | Sec | RLS per akun, bukan tenant/role/gudang | [`supabase/schema.sql:6-22`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/supabase/schema.sql#L6-L22) | Cabang dan peran tidak terisolasi | **Kritis** | L | Tenant RLS + RBAC | TERKONFIRMASI |
| H18 | Sec | Tidak ada audit_log | [`supabase/schema.sql:6-27`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/supabase/schema.sql#L6-L27) | Perubahan uang/stok tidak bisa diaudit | **Kritis** | L | Audit append-only di server | TERKONFIRMASI |
| H19 | Sec | Aturan transaksi berjalan di browser; payload JSON bebas diubah pemilik baris | [`app/page.tsx:144-182`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L144-L182), [`supabase/schema.sql:19-21`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/supabase/schema.sql#L19-L21) | Payload dapat dimanipulasi via API | **Kritis** | L | Validasi dan posting server | TERKONFIRMASI |
| H20 | UX | Navigasi state bukan route URL | [`app/page.tsx:41-42`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L41-L42), [`app/page.tsx:209`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L209) | Back/refresh/deep-link gagal | **Sedang** | M | App Router per modul | TERKONFIRMASI |
| H21 | Bisnis | KPI omzet/laba total sepanjang data, tanpa periode | [`app/page.tsx:121-128`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L121-L128) | Keputusan bulanan bias | **Tinggi** | M | Periode+perbandingan | TERKONFIRMASI |
| H22 | UX | Tabel tiada sort, pagination, empty state | [`app/page.tsx:203-204`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L203-L204) | Lambat dan tak terarah saat banyak baris | **Sedang** | M | Data table reusable | TERKONFIRMASI |
| H23 | A11y | Toast sukses dan gagal berikon sama, hilang 3,8 detik | [`app/page.tsx:112-113`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L112-L113), [`app/page.tsx:269`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L269) | Error terlewat | **Tinggi** | S | Toast typed/persistent | TERKONFIRMASI |
| H24 | A11y | Modal tanpa focus trap/Esc; backdrop membuang draft | [`app/page.tsx:270-277`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L270-L277) | Kehilangan entri dan keyboard tidak aman | **Tinggi** | M | Dialog accessible + dirty guard | TERKONFIRMASI |
| H25 | UX | Input Rupiah angka mentah tanpa grouping ribuan | [`app/page.tsx:271-277`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L271-L277) | Salah input nominal | **Sedang** | M | MoneyInput locale id | TERKONFIRMASI |
| H26 | A11y | Teks 8-10 px dan muted kurang kontras | [`app/globals.css:4-9`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/globals.css#L4-L9) | Sulit dibaca di HP | **Tinggi** | M | WCAG token, min 12 px | TERKONFIRMASI |
| H27 | UX | Mobile tetap tabel horizontal-scroll | [`app/page.tsx:204`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L204), [`app/globals.css:8-9`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/globals.css#L8-L9) | Tugas lapangan sulit | **Sedang** | M | Kartu responsif | TERKONFIRMASI |
| H28 | UX | Dot Hutang & Piutang aktif selama saldo terbuka bukan overdue | [`app/page.tsx:209`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L209) | Alert tidak actionable | **Rendah** | S | Badge overdue | TERKONFIRMASI |
| H29 | Bisnis | Aging sudah ada tetapi AR/AP digabung dan tanpa drill-down per mitra | [`app/page.tsx:237-240`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L237-L240), [`app/page.tsx:257-259`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L257-L259) | Penagihan tak terprioritaskan | **Sedang** | M | Per-mitra aging + followup | SEBAGIAN |
| H30 | A11y | Chart tanpa sumbu angka/tabel alternatif, gradient id statis | [`app/page.tsx:35-40`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L35-L40) | Sulit untuk pembaca layar | **Sedang** | M | Chart+tabular data accessible | TERKONFIRMASI |
| H31 | UX | Ekspor CSV di Pengaturan menghasilkan pelanggan | [`app/page.tsx:184-192`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L184-L192), [`app/page.tsx:215`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L215) | Output menu salah | **Sedang** | S | Sembunyikan export yang tidak relevan | TERKONFIRMASI |
| H32 | UX | Dashboard judul tanpa konteks tanggal/aksi | [`app/page.tsx:215-222`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L215-L222) | Owner tidak dapat prioritaskan | **Sedang** | S | Prioritas tindakan dan periode | TERKONFIRMASI |
| H33 | UX | Reset memakai confirm() native | [`app/page.tsx:265`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L265) | Dampak reset kurang dijelaskan | **Sedang** | S | Confirm dengan backup | TERKONFIRMASI |
| H34 | UX | Pengguna cloud baru menerima emptyData tanpa onboarding | [`app/page.tsx:98-99`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L98-L99) | Pengguna bingung memulai | **Sedang** | S | Wizard langkah awal | TERKONFIRMASI |
| H35 | Bisnis | Cetak faktur A4 sudah ada; surat jalan/kwitansi/PDF backend belum | [`components/InvoicePrint.tsx:1-13`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/components/InvoicePrint.tsx#L1-L13) | Dokumen belum lengkap | **Sedang** | M | Pertahankan print, tambah format lain | SEBAGIAN |
| H36 | Sec | CSV hanya escape quote, tidak sanitize formula | [`lib/data.ts:59-63`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L59-L63) | Formula spreadsheet injection | **Kritis** | S | Prefix safe untuk =,+,-,@,tab,CR | TERKONFIRMASI |
| H37 | Sec | Demo simpan data plaintext localStorage | [`app/page.tsx:93`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L93), [`app/page.tsx:107`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L107) | Data perangkat bersama terbuka | **Tinggi** | S | Tanda demo dan larang data nyata | TERKONFIRMASI |
| H38 | Sec | Auth dasar tanpa reset/MFA/session manager UX | [`app/page.tsx:194-202`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L194-L202) | Risiko pemulihan akun | **Tinggi** | M | Account security controls | TERKONFIRMASI |
| H39 | QA | Manifest sudah punya PNG 192/512 dan SW v2; install lintas platform/offline data belum diuji | [`public/manifest.webmanifest:1-26`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/public/manifest.webmanifest#L1-L26), [`public/sw.js:1-9`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/public/sw.js#L1-L9) | Jangan mengklaim PWA matang | **Sedang** | M | Uji installability/offline clear-state | SEBAGIAN |
| H40 | QA | package.json tak punya test script dan repo tidak punya tests | [`package.json:5-10`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/package.json#L5-L10) | Tidak ada regression guard | **Kritis** | M | Unit harness+CI | TERKONFIRMASI |
| H41 | QA | Tidak ada error boundary/logger terstruktur | [`app/layout.tsx:1-17`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/layout.tsx#L1-L17) | Exception fatal tidak recover | **Tinggi** | M | error.tsx+telemetry | TERKONFIRMASI |
| H42 | Perf | Monolit app/page.tsx 280 baris panjang dan ~49 KB | [`app/page.tsx:41-43`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L41-L43) | Sulit direview/dites | **Tinggi** | L | Pecah routes/domain/UI | SEBAGIAN |

## 5. Temuan tambahan yang tidak cukup dirinci di 42 hipotesis

| ID | Area | Temuan baru | Bukti file:baris | Dampak | Severity | Usaha | Rekomendasi |
|---|---|---|---|---|---|---|---|
| N01 | Data | PO langsung menambah stok sebelum GRN/penerimaan | [`lib/data.ts:18-20`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L18-L20), [`app/page.tsx:151-152`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L151-L152) | Barang yang belum datang tampak tersedia | **Kritis** | M | Stok masuk hanya dari GRN diposting | 
| N02 | Data | Invoice sale langsung mengurangi stok sebelum DO | [`lib/data.ts:18-20`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L18-L20) | Stok fisik dan reserved bercampur | **Kritis** | M | Pisahkan reserve SO dan pengeluaran DO | 
| N03 | Data | Pembayaran awal invoice tidak membuat Payment record | [`app/page.tsx:151-152`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L151-L152), [`app/page.tsx:176-181`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L176-L181) | Riwayat tidak cocok saldo | **Kritis** | S | Pembayaran awal masuk ledger | 
| N04 | Data | Nilai paid dan payments menjadi dua sumber kebenaran | [`lib/data.ts:3-7`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L3-L7) | Selisih nominal tak terdeteksi | **Kritis** | M | Saldo dari alokasi payment | 
| N05 | Sec | Import backup cek nested fields parsial, tidak validasi referensi | [`app/page.tsx:75-87`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L75-L87) | Foreign key logis putus | **Tinggi** | S | Schema validation/dry-run relasi | 
| N06 | Sec | Import backup tidak periksa duplikasi ID/nomor | [`app/page.tsx:81-87`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L81-L87) | Duplikat dokumen diam-diam | **Tinggi** | S | Constraint per entitas | 
| N07 | Sec | Backup cloud berisi data lengkap tanpa enkripsi | [`app/page.tsx:68-74`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L68-L74) | Bocor data dari file yang dibagikan | **Tinggi** | S | Warn+opsi enkripsi | 
| N08 | Data | localStorage.setItem tanpa catch quota error | [`app/page.tsx:105-111`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L105-L111) | Perubahan demo gagal tersimpan | **Tinggi** | S | Catch dan export recovery | 
| N09 | UX | CSV tidak mengikuti pencarian tampilan aktif | [`app/page.tsx:184-193`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L184-L193), [`app/page.tsx:230-248`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L230-L248) | Ekspor lebih banyak daripada di layar | **Sedang** | S | Respect filters / all flag | 
| N10 | Bisnis | KPI Pelanggan Aktif hitung semua master customer | [`app/page.tsx:129`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L129), [`app/page.tsx:222`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L222) | KPI salah label | **Sedang** | S | Pelanggan unik bertransaksi per periode | 
| N11 | UX | Label role Administrator hardcoded tanpa otorisasi | [`app/page.tsx:213`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L213) | Membingungkan pengguna mengenai hak | **Tinggi** | S | Label role nyata atau 'Pengguna' | 
| N12 | Bisnis | Master produk/mitra tanpa deteksi duplikat | [`app/page.tsx:154-164`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L154-L164) | Histori terfragmentasi | **Sedang** | S | Validasi unik sebelum commit | 
| N13 | Bisnis | JS number dan harga tak punya safe integer guard | [`lib/data.ts:13-17`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L13-L17) | Rupiah sangat besar/pecahan tidak presisi | **Tinggi** | S | Integer currency + limits | 
| N14 | Bisnis | remaining() clamp saldo negatif jadi nol | [`lib/data.ts:17`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L17) | Overpayment tersembunyi | **Tinggi** | S | Credit balance ledger | 
| N15 | Data | Payment seed diberi tanggal faktur, bukan tanggal bayar riil | [`lib/data.ts:56-57`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L56-L57) | Simulasi tren kas keliru | **Rendah** | S | Fixture tanggal payment terpisah | 
| N16 | Bisnis | Transaksi terbaru memakai slice tanpa sort | [`app/page.tsx:223-224`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L223-L224) | Import urutan lama tampil sebagai terbaru | **Sedang** | S | Sort tanggal dulu | 
| N17 | UX | Aksi utama pada Laporan/Pengaturan membuat transaksi sales | [`app/page.tsx:215`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L215) | Aksi tidak sesuai konteks | **Sedang** | S | Action context-specific | 
| N18 | Data | Restore backup tak punya preview perubahan/rollback | [`app/page.tsx:75-90`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L75-L90) | Data lama bisa hilang bila salah impor | **Tinggi** | M | Dry-run+backup otomatis | 
| N19 | Sec | Next config tak mendefinisikan security response headers | [`next.config.ts:1-3`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/next.config.ts#L1-L3) | Hardening belum disusun | **Sedang** | S | Review dan terapkan CSP/headers | 
| N20 | QA | Tidak ada package-lock pada tree commit | [`package.json:1-24`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/package.json#L1-L24) | Install transitif tidak deterministik | **Sedang** | S | Commit lockfile+CI frozen | 
| N21 | Data | Delivery tidak punya document number unik | [`lib/data.ts:4`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L4), [`app/page.tsx:166-169`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L166-L169) | Surat jalan tak dapat direkonsiliasi | **Tinggi** | M | Sequence DO | 
| N22 | Bisnis | Status Terkirim tak mensyaratkan penerima dan jam terima | [`lib/data.ts:4`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/lib/data.ts#L4), [`app/page.tsx:252`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L252) | Sengketa POD tanpa bukti | **Tinggi** | M | Proof-of-delivery | 
| N23 | Sec | RLS per user tak memvalidasi isi JSON finansial | [`supabase/schema.sql:19-21`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/supabase/schema.sql#L19-L21) | Account dapat memalsukan payload tanpa jejak | **Kritis** | L | Immutable ledger/RPC | 
| N24 | UX | Tidak ada beforeunload saat sinkronisasi belum selesai | [`app/page.tsx:105-113`](https://github.com/niyellll/opspiry/blob/dac13c6e326bcb55fc2298b7fe82668363fd51e3/app/page.tsx#L105-L113) | Tutup tab dapat hilangkan penulisan | **Tinggi** | S | Unsaved state guard | 

## 6. Counterexample nyata dari rumus dalam kode (bukan hasil unit test)

1. **HPP historis:** invoice 10 karton @Rp100.000, biaya saat penjualan Rp70.000 → seharusnya laba kotor beku Rp300.000. Jika master biaya diubah menjadi Rp90.000, `grossProfit` kini mengembalikan Rp100.000 untuk faktur yang sama. Selisih Rp200.000 tanpa transaksi baru (H03).
2. **Riwayat bayar awal:** `saveOrder()` menulis invoice dengan `paid=500000` tetapi tidak membuat record `Payment`. Saldo faktur menurun, tabel riwayat tetap kosong untuk pembayaran awal itu (N03).
3. **Stok semu:** `productStock` langsung menambah qty dari `kind=purchase`, meski tidak ada GRN; stok pembelian yang belum diterima dapat dijual (N01).
4. **Transaksi bersamaan:** dua klien membaca saldo stok sama. Klien masing-masing lulus cek stok lokal; `upsert` payload cloud tidak memiliki compare-and-swap. Data salah satu sesi berisiko tertimpa (H07/H13).
5. **CSV injection:** nama mitra `=1+1` menjadi `"=1+1"` pada CSV. Petik ganda bukan escape formula spreadsheet. **Jangan uji payload berbahaya pada data nyata** (H36).
6. **Klaim PWA:** ikon PNG 192/512 sudah ditambahkan pada commit terbaru; meskipun begitu implementasi SW hanya fallback halaman root dan tidak memastikan data finansial offline terbaru (H39).

## 7. Peta risiko jika dipakai produksi sekarang

| Risiko | Pemicu | Kerugian yang mungkin | Kontrol yang diperlukan |
|---|---|---|---|
| **R1—Lost update** | Dua akun perangkat mengirim blob JSON bersamaan | Faktur, pembayaran, stok hilang | Relational row-level posting, CAS/idempotensi |
| **R2—Oversell** | Stok hanya dicek saat save di klien | Pesanan melebihi stok tersedia | RPC atomik dengan lock server |
| **R3—Profit palsu** | Master cost berubah | Margin & keputusan jual salah | HPP moving average dibekukan |
| **R4—Kas tak cocok** | Paid kumulatif ≠ payment ledger | Sengketa piutang dan saldo | Ledger pembayaran, void, alokasi |
| **R5—POD tak terbukti** | Status pengiriman editable | Barang tertulis diterima tanpa bukti | Delivery_lines, penerima, foto |
| **R6—Impor rusak** | JSON invalid/duplikat mengganti seluruh data | Rekap rusak, sulit rollback | Dry-run, validasi, backup otomatis |
| **R7—Kebocoran data** | localStorage atau ekspor JSON mentah | Harga, pelanggan tersebar | Enkripsi, akses tenant, peringatan |
| **R8—Spreadsheet formula** | CSV dengan nama diawali =/+/-/@ | Potensi eksekusi formula saat dibuka | Netralisasi CSV setiap sel |

**Rekomendasi tegas:** **NO-GO** untuk transaksi perusahaan, stok fisik, piutang, multi-cabang, dan pelaporan akuntansi hingga FASE 2–4 benar-benar lulus pengujian. GO terbatas untuk demo data contoh.

## 8. Keputusan arsitektur dan opsi yang ditolak

1. Pilih **Postgres relational tenant-scoped** + posting lewat RPC atomik + audit log. **Tolak:** mempertahankan snapshot JSON sebagai ledger bisnis. Optimistic CAS blob pun tidak cukup untuk stok lintas gudang.
2. Pisahkan SO/DO/Faktur/Pembayaran dan PO/GRN/Faktur Pembelian. **Tolak:** transaksi faktur sebagai mutasi fisik instan. Default: stok fisik keluar saat DO diposting; stok masuk saat GRN diposting; SO hanya reservasi.
3. Gunakan **moving average HPP** dan simpan biaya per baris saat posting. **Tolak:** profit historis dari `product.cost` yang dapat berubah.
4. Penomoran lewat document_sequences di server. **Tolak:** `array.length+1` dan counter klien.
5. Tanggal bisnis `Asia/Jakarta` sebagai calendar date. **Tolak:** bergantung timezone perangkat.
6. UI direstrukturisasi menurut alur kerja sales/gudang/driver/finance/owner, bukan hanya menambah kartu dashboard.

## 9. Open Questions untuk owner (maks. 12)

| Urutan | Pertanyaan | Default jika belum dijawab |
|---|---|---|
| 1 | Kapan stok fisik berkurang: DO diposting atau barang diterima? | Saat DO diposting |
| 2 | Moving average atau FIFO? | Moving average; HPP beku |
| 3 | Mulai satu perusahaan atau multi-organisasi langsung? | Multi-tenant skema sejak awal, satu org pertama |
| 4 | Posting boleh diedit langsung? | Tidak; void/koreksi dengan audit |
| 5 | Limit kredit dilanggar: peringatan atau blokir? | Blokir; owner override beralasan |
| 6 | Qty pecahan dan unit conversion? | Presisi per SKU, konversi karton/pcs |
| 7 | Pesanan dapat dipenuhi banyak gudang? | Bisa, posting per gudang |
| 8 | SKU yang perlu batch/expired? | Hanya SKU tertentu; FEFO untuk yang memerlukan |
| 9 | Satu transfer bayar banyak invoice: FIFO atau manual? | Manual, FIFO sebagai opsi |
| 10 | Status PKP & tarif pajak efektif? | Non-PKP awal sambil menunggu verifikasi |
| 11 | Bulan kapan dikunci dan siapa membuka? | Period lock bulanan; owner-only dan audit |
| 12 | Retensi backup & target RPO/RTO? | Backup terenkripsi harian; target diukur setelah skala nyata diketahui |

## 10. Usulan FASE 1 — **belum dilaksanakan**

1. Pasang test harness, CI, dan fixture transaksi; `docs/DOMAIN.md` dengan contoh dan edge case.
2. Pisahkan `lib/date-wib`, `lib/money`, `lib/stock`, `lib/ar-ap`, `lib/tax` + unit tests (integer rupiah, daylight, aging).
3. Amankan CSV, validasi backup, gunakan migrasi non-destruktif/dry-run, backup sebelum mengubah struktur.
4. Refactor routing per modul, primitives form/dialog, aksesibilitas dasar dan desain token tanpa mengubah tema OPSPIRY.
5. Gate sebelum fase berikutnya: build+typecheck+unit E2E terbatas, uji 360×740 dan 1440×900; banding baseline.

**FASE 2 belum boleh dijalankan:** skema relasional, RPC stok, multi-line order, audit, pembayaran, migrasi cloud. Menunggu persetujuan dan pengujian data cadangan.

## 11. Status pengujian (angka nyata, tanpa mengarang)

| Aktivitas | Hasil |
|---|---|
| Hypothesis coverage dari file master | **42/42 dipetakan ke bukti source** |
| Temuan tambahan | **24** |
| File tree dipelajari | **Semua path source terdaftar; aset PNG terdeteksi, tidak dibuka sebagai gambar** |
| Next.js build dari deployment sebelumnya | **READY** pada commit `72deab5` |
| Unit test otomatis | **0 dijalankan (harness belum ada)** |
| E2E/Playwright | **0 dijalankan** |
| Test integrasi RPC stok | **0 dijalankan** |
| Test RLS data OPSPIRY | **0 dijalankan** |
| Audit WCAG/axe perangkat | **0 dijalankan** |
| Kode produksi, Vercel settings, Supabase | **Tidak diubah dalam FASE 0** |

## 12. Skrip verifikasi manual oleh owner (demo fiktif saja)

1. Buka [opspiry.vercel.app](https://opspiry.vercel.app), pastikan banner **Mode simulasi aktif** terlihat.
2. Buat transaksi penjualan dengan **pembayaran awal**. Buka **Hutang & Piutang → Riwayat Pelunasan**; pembayaran awal tidak dibuat sebagai event ledger (N03).
3. Buat pembelian, buka **Persediaan**: stok bertambah tanpa GRN (N01).
4. Ubah **Distribusi** dari Terkirim kembali ke Dijadwalkan; belum ada validasi urutan dan bukti terima (H08).
5. Buka **Laporan**: tidak ada filter bulan, total angka menjumlah semua transaksi (H21).
6. Di **Pengaturan**, tombol Ekspor CSV mengunduh data pelanggan, bukan konfigurasi (H31).
7. Cadangkan JSON demo lalu impor setelah Anda sadar impor akan mengganti isi data demo; jangan masukkan data perusahaan nyata.
8. Buka di layar HP; lihat bagaimana tabel masih harus di-scroll mendatar. Uji keyboard dan accessibility menyeluruh belum tersertifikasi.

## 13. Batasan, pekerjaan yang sengaja ditunda, persetujuan

- Belum: modifikasi source `app/` atau `lib/`, SQL, data Supabase, deployment manual, reset, import data nyata, pemasangan dependency, uji browser.
- Temuan statis tidak membuktikan exploitation terjadi; skema RLS dapat benar **membatasi akun sendiri** bila dideploy, tetapi integritas finansial tetap belum terpenuhi.
- **FASE 0 selesai sebagai laporan audit**. Keputusan diminta: setujui temuan/aturan default, lalu baru jalankan FASE 1, tanpa menyentuh aplikasi golden baseline BBM/GPP/CSB.
