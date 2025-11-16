// --- Inisialisasi Aplikasi ---
        
// Kunci untuk localStorage
const APP_KEY = 'fokusMasaDepanDB';

// State global aplikasi (Database)
let db = {
    saldo: 0,
    dream: {
        title: 'Membeli Motor Baru',
        targetAmount: 10000000,
        targetDate: '2026-12-31'
    },
    settings: {
        limitBulanan: 2000000,
        motivasi: {
            kuning: 'Hati-hati, pengeluaranmu banyak!',
            merah: 'STOP! Kamu sudah boros!'
        },
        kategori: [
            '🍔 Makanan',
            '🚌 Transportasi',
            '💡 Tagihan',
            '🏠 Sewa/Cicilan',
            '🎬 Hiburan',
            '👕 Belanja',
            'Lainnya'
        ],
        notifikasi: {
            aktif: false,
            waktu: '09:00'
        }
    },
    transactions: [] // { id, type: 'pemasukan'/'pengeluaran', amount, category, note, date }
};

// Variabel state sementara
let currentTxType = 'pengeluaran'; // 'pemasukan' atau 'pengeluaran'
let myAnalysisChart = null; // Instance untuk Chart.js

// --- Event Listener Utama ---
document.addEventListener('DOMContentLoaded', () => {
    loadDB();
    renderDashboard();
    populateCategorySelects();
    navigateTo('page-dashboard'); // Mulai dari dashboard
    
    // Set tanggal di form transaksi ke hari ini
    document.getElementById('form-tx-tanggal').value = getISODate(new Date());
});

// --- Manajemen Database (localStorage) ---

function loadDB() {
    const data = localStorage.getItem(APP_KEY);
    if (data) {
        db = JSON.parse(data);
        // Migrasi data lama jika ada penambahan properti baru
        if (!db.settings.motivasi) {
            db.settings.motivasi = { kuning: 'Hati-hati!', merah: 'STOP!' };
        }
        if (!db.settings.notifikasi) {
            db.settings.notifikasi = { aktif: false, waktu: '09:00' };
        }
    } else {
        // Jika data tidak ada, simpan data default
        saveDB();
    }
}

function saveDB() {
    try {
        localStorage.setItem(APP_KEY, JSON.stringify(db));
    } catch (error) {
        console.error("Gagal menyimpan ke localStorage:", error);
        showToast("Gagal menyimpan data. Mungkin penyimpanan penuh.", 'error');
    }
}

// --- Navigasi Halaman & Modal ---

function navigateTo(pageId) {
    // Sembunyikan semua halaman
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Tampilkan halaman yang dituju
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        // Scroll ke atas
        window.scrollTo(0, 0);
        
        // Panggil fungsi render spesifik untuk halaman tsb
        if (pageId === 'page-dashboard') {
            renderDashboard();
        } else if (pageId === 'page-history') {
            renderHistoryPage();
        } else if (pageId === 'page-analysis') {
            renderAnalysisPage();
        } else if (pageId === 'page-settings-limit') {
            renderSettingsLimitPage();
        } else if (pageId === 'page-settings-kategori') {
            renderSettingsKategoriPage();
        } else if (pageId === 'page-settings-motivasi') {
            renderSettingsMotivasiPage();
        } else if (pageId === 'page-settings-notifikasi') {
            renderSettingsNotifikasiPage();
        }

    } else {
        console.error(`Halaman dengan ID "${pageId}" tidak ditemukan.`);
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        
        // Isi form modal dengan data yang ada
        if (modalId === 'modal-edit-dream') {
            document.getElementById('form-dream-title').value = db.dream.title;
            document.getElementById('form-dream-target').value = db.dream.targetAmount;
            document.getElementById('form-dream-date').value = db.dream.targetDate;
        } else if (modalId === 'modal-add-tx') {
            // Reset form
            document.getElementById('form-tx-nominal').value = '';
            document.getElementById('form-tx-alasan').value = '';
            document.getElementById('form-tx-tanggal').value = getISODate(new Date());
            switchTxType('pengeluaran'); // Default ke pengeluaran
        }
    }
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// --- ALUR 1: Tambah Transaksi ---

function switchTxType(type) {
    currentTxType = type;
    const tabPengeluaran = document.getElementById('tab-pengeluaran');
    const tabPemasukan = document.getElementById('tab-pemasukan');
    const kategoriGroup = document.getElementById('form-tx-kategori-group');
    
    if (type === 'pengeluaran') {
        tabPengeluaran.className = 'flex-1 py-2 text-center font-semibold border-b-2 border-primary text-primary';
        tabPemasukan.className = 'flex-1 py-2 text-center font-semibold text-gray-500';
        kategoriGroup.style.display = 'block';
    } else {
        tabPemasukan.className = 'flex-1 py-2 text-center font-semibold border-b-2 border-primary text-primary';
        tabPengeluaran.className = 'flex-1 py-2 text-center font-semibold text-gray-500';
        kategoriGroup.style.display = 'none'; // Sembunyikan kategori untuk pemasukan
    }
}

function saveTransaction() {
    // 1. Ambil data dari form
    const amount = parseFloat(document.getElementById('form-tx-nominal').value);
    const category = (currentTxType === 'pengeluaran') ? document.getElementById('form-tx-kategori').value : 'Pemasukan';
    const note = document.getElementById('form-tx-alasan').value;
    const date = document.getElementById('form-tx-tanggal').value;

    // 2. Validasi
    if (!amount || amount <= 0) {
        showToast("Nominal harus diisi dan lebih dari 0", 'error');
        return;
    }
    if (!date) {
        showToast("Tanggal harus diisi", 'error');
        return;
    }

    // 3. Buat objek transaksi
    const newTx = {
        id: Date.now().toString(),
        type: currentTxType,
        amount: amount,
        category: category,
        note: note,
        date: date
    };

    // 4. Update database
    db.transactions.push(newTx);
    if (currentTxType === 'pengeluaran') {
        db.saldo -= amount;
    } else {
        db.saldo += amount;
    }
    
    // 5. Simpan & update UI
    saveDB();
    hideModal('modal-add-tx');
    showToast("Transaksi berhasil disimpan!", 'success');
    
    // Render ulang dashboard untuk update saldo, indikator, dan histori
    renderDashboard();
}

// --- ALUR 2: Halaman Histori ---

function renderHistoryPage() {
    const filter = document.getElementById('history-filter-time').value;
    const filteredTx = filterTransactions(db.transactions, filter);
    
    const listEl = document.getElementById('history-full-list');
    const totalInEl = document.getElementById('hist-total-in');
    const totalOutEl = document.getElementById('hist-total-out');
    
    let totalIn = 0;
    let totalOut = 0;
    let html = '';

    // Urutkan kronologis (terbaru di atas)
    filteredTx.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredTx.length === 0) {
        listEl.innerHTML = '<p class="text-center text-gray-500 py-8">Tidak ada transaksi untuk periode ini.</p>';
    } else {
        filteredTx.forEach(tx => {
            let amountHtml = '';
            if (tx.type === 'pemasukan') {
                totalIn += tx.amount;
                amountHtml = `<span class="font-bold text-success">+${formatRupiah(tx.amount)}</span>`;
            } else {
                totalOut += tx.amount;
                amountHtml = `<span class="font-bold text-danger">-${formatRupiah(tx.amount)}</span>`;
            }
            
            html += `
                <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-gray-800">${tx.category}</p>
                            <p class="text-sm text-gray-500">${tx.note || formatDate(tx.date)}</p>
                        </div>
                        <div class="text-right">
                            ${amountHtml}
                            <p class="text-xs text-gray-400">${(tx.note) ? formatDate(tx.date) : ''}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        listEl.innerHTML = html;
    }
    
    // Update Ringkasan
    totalInEl.textContent = formatRupiah(totalIn);
    totalOutEl.textContent = formatRupiah(totalOut);
}


// --- ALUR 3: Halaman Analisis ---

function renderAnalysisPage() {
    const filter = document.getElementById('analysis-filter-time').value;
    // Filter hanya pengeluaran
    const allPengeluaran = db.transactions.filter(tx => tx.type === 'pengeluaran');
    const filteredTx = filterTransactions(allPengeluaran, filter);

    // 1. Ringkasan Budget
    const limit = db.settings.limitBulanan; // Asumsi limit bulanan
    const terpakai = filteredTx.reduce((sum, tx) => sum + tx.amount, 0);
    const sisa = limit - terpakai;
    
    document.getElementById('analysis-limit').textContent = formatRupiah(limit);
    document.getElementById('analysis-terpakai').textContent = formatRupiah(terpakai);
    document.getElementById('analysis-sisa').textContent = formatRupiah(sisa);

    // 2. Visualisasi Data (Chart)
    const spendingByCategory = filteredTx.reduce((acc, tx) => {
        if (!acc[tx.category]) {
            acc[tx.category] = 0;
        }
        acc[tx.category] += tx.amount;
        return acc;
    }, {});

    const labels = Object.keys(spendingByCategory);
    const data = Object.values(spendingByCategory);

    const ctx = document.getElementById('analysis-chart').getContext('2d');
    
    // Hancurkan chart lama jika ada, untuk mencegah overlay
    if (myAnalysisChart) {
        myAnalysisChart.destroy();
    }

    if (labels.length > 0) {
        myAnalysisChart = new Chart(ctx, {
            type: 'pie', // Bisa diganti 'bar'
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pengeluaran per Kategori',
                    data: data,
                    backgroundColor: [ // Sediakan beberapa warna
                        '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6',
                        '#ec4899', '#f97316', '#06b6d4', '#14b8a6', '#65a30d'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 10 }
                        }
                    }
                }
            }
        });
    } else {
        // Tampilkan pesan jika tidak ada data
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#9ca3af';
        ctx.font = '16px Inter';
        ctx.fillText('Tidak ada data pengeluaran', ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
}

// --- ALUR 4: Halaman Pengaturan ---

function renderSettingsLimitPage() {
    document.getElementById('setting-limit-bulanan').value = db.settings.limitBulanan;
}

function saveSettingsLimit() {
    const limit = parseFloat(document.getElementById('setting-limit-bulanan').value);
    if (limit && limit >= 0) {
        db.settings.limitBulanan = limit;
        saveDB();
        showToast("Limit berhasil disimpan!", 'success');
        navigateTo('page-settings');
    } else {
        showToast("Limit tidak valid", 'error');
    }
}

function renderSettingsKategoriPage() {
    const listEl = document.getElementById('settings-kategori-list');
    listEl.innerHTML = ''; // Kosongkan list
    db.settings.kategori.forEach((kategori, index) => {
        listEl.innerHTML += `
            <div class="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                <span class="text-gray-800">${kategori}</span>
                <button onclick="deleteCategory(${index})" class="text-red-500 hover:text-red-700 font-medium">Hapus</button>
            </div>
        `;
    });
}

function addCategory() {
    const inputEl = document.getElementById('setting-kategori-baru');
    const newKategori = inputEl.value.trim();
    if (newKategori) {
        db.settings.kategori.push(newKategori);
        saveDB();
        renderSettingsKategoriPage(); // Render ulang list
        populateCategorySelects(); // Update juga dropdown di form
        inputEl.value = ''; // Kosongkan input
        showToast("Kategori ditambahkan!", 'success');
    }
}

function deleteCategory(index) {
    // Konfirmasi sederhana (karena window.confirm tidak boleh)
    // Di aplikasi nyata, ini seharusnya modal kustom
    const kategori = db.settings.kategori[index];
    showToast(`Kategori "${kategori}" dihapus.`);
    
    db.settings.kategori.splice(index, 1);
    saveDB();
    renderSettingsKategoriPage(); // Render ulang list
    populateCategorySelects(); // Update juga dropdown di form
}

function renderSettingsMotivasiPage() {
    document.getElementById('setting-motivasi-kuning').value = db.settings.motivasi.kuning;
    document.getElementById('setting-motivasi-merah').value = db.settings.motivasi.merah;
}

function saveSettingsMotivasi() {
    db.settings.motivasi.kuning = document.getElementById('setting-motivasi-kuning').value;
    db.settings.motivasi.merah = document.getElementById('setting-motivasi-merah').value;
    saveDB();
    showToast("Motivasi berhasil disimpan!", 'success');
    navigateTo('page-settings');
}

function renderSettingsNotifikasiPage() {
    document.getElementById('setting-notif-aktif').checked = db.settings.notifikasi.aktif;
    document.getElementById('setting-notif-waktu').value = db.settings.notifikasi.waktu;
}

function saveSettingsNotifikasi() {
    db.settings.notifikasi.aktif = document.getElementById('setting-notif-aktif').checked;
    db.settings.notifikasi.waktu = document.getElementById('setting-notif-waktu').value;
    saveDB();
    showToast("Pengaturan notifikasi disimpan!", 'success');
    navigateTo('page-settings');
}

// --- ALUR 5: Ubah Impian ---

function saveDream() {
    // 1. Ambil data
    const title = document.getElementById('form-dream-title').value;
    const targetAmount = parseFloat(document.getElementById('form-dream-target').value);
    const targetDate = document.getElementById('form-dream-date').value;

    // 2. Validasi
    if (!title || !targetAmount || !targetDate) {
        showToast("Semua field impian harus diisi", 'error');
        return;
    }

    // 3. Update database
    db.dream.title = title;
    db.dream.targetAmount = targetAmount;
    db.dream.targetDate = targetDate;
    
    // 4. Simpan & update UI
    saveDB();
    hideModal('modal-edit-dream');
    showToast("Impian berhasil disimpan!", 'success');
    
    // Render ulang dashboard untuk update kartu impian
    renderDashboard();
}


// --- Fungsi Render Utama ---

function renderDashboard() {
    // 1. Render Saldo
    document.getElementById('dash-saldo').textContent = formatRupiah(db.saldo);
    
    // 2. Render Impian (Alur 5)
    const { title, targetAmount, targetDate } = db.dream;
    const progress = (db.saldo / targetAmount) * 100;
    const progressPercent = Math.min(Math.max(progress, 0), 100); // Batasi 0-100%
    
    document.getElementById('dash-dream-title').textContent = title;
    document.getElementById('dash-dream-target-amount').textContent = formatRupiah(targetAmount);
    document.getElementById('dash-dream-target-date').textContent = formatDate(targetDate, { month: 'short', year: 'numeric' });
    document.getElementById('dash-dream-progress').style.width = `${progressPercent}%`;
    document.getElementById('dash-dream-progress-percent').textContent = `${progressPercent.toFixed(1)}%`;
    
    // 3. Render Budget (Alur 1)
    const limit = db.settings.limitBulanan;
    // Hitung pengeluaran bulan ini
    const pengeluaranBulanIni = filterTransactions(
        db.transactions.filter(tx => tx.type === 'pengeluaran'),
        'month'
    ).reduce((sum, tx) => sum + tx.amount, 0);
    
    const sisa = limit - pengeluaranBulanIni;
    const sisaPercent = (sisa / limit) * 100;
    
    document.getElementById('dash-budget-limit').textContent = formatRupiah(limit);
    document.getElementById('dash-budget-sisa').textContent = formatRupiah(sisa);
    
    const indicatorEl = document.getElementById('dash-budget-indicator');
    const warningEl = document.getElementById('dash-budget-warning');
    
    if (sisaPercent > 40) { // Hijau
        indicatorEl.className = 'px-3 py-1 rounded-full text-sm font-semibold text-white bg-success';
        indicatorEl.textContent = 'Aman';
        warningEl.textContent = '';
    } else if (sisaPercent > 10) { // Kuning
        indicatorEl.className = 'px-3 py-1 rounded-full text-sm font-semibold text-white bg-warning';
        indicatorEl.textContent = 'Hati-hati';
        warningEl.textContent = db.settings.motivasi.kuning;
    } else { // Merah
        indicatorEl.className = 'px-3 py-1 rounded-full text-sm font-semibold text-white bg-danger';
        indicatorEl.textContent = 'Bahaya';
        warningEl.textContent = db.settings.motivasi.merah;
    }
    
    // 4. Render Histori Singkat
    const listEl = document.getElementById('dash-history-list');
    const recentTx = [...db.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5); // Ambil 5 terbaru
    
    if (recentTx.length === 0) {
        listEl.innerHTML = '<p class="text-center text-gray-500 py-4">Belum ada transaksi.</p>';
    } else {
        let html = '';
        recentTx.forEach(tx => {
            const amountHtml = tx.type === 'pemasukan'
                ? `<span class="font-bold text-success">+${formatRupiah(tx.amount)}</span>`
                : `<span class="font-bold text-danger">-${formatRupiah(tx.amount)}</span>`;
                
            html += `
                <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                    <div>
                        <p class="font-semibold text-gray-800">${tx.category}</p>
                        <p class="text-sm text-gray-500">${formatDate(tx.date)}</p>
                    </div>
                    ${amountHtml}
                </div>
            `;
        });
        listEl.innerHTML = html;
    }
}

// --- Fungsi Helper (Utility) ---

function formatRupiah(number) {
    if (isNaN(number)) number = 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

function formatDate(dateString, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
    try {
        const date = new Date(dateString + 'T00:00:00'); // Atasi masalah timezone
        return new Intl.DateTimeFormat('id-ID', options).format(date);
    } catch (e) {
        return dateString;
    }
}

function getISODate(date) {
    // Mengembalikan format YYYY-MM-DD
    return date.getFullYear() + '-' +
           ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
           ('0' + date.getDate()).slice(-2);
}

function populateCategorySelects() {
    const selectEl = document.getElementById('form-tx-kategori');
    selectEl.innerHTML = ''; // Kosongkan
    db.settings.kategori.forEach(kategori => {
        const option = document.createElement('option');
        option.value = kategori;
        option.textContent = kategori;
        selectEl.appendChild(option);
    });
}

function filterTransactions(transactions, filter) {
    const now = new Date();
    const today = getISODate(now);
    
    // Awal minggu ini (Minggu)
    const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfWeek = getISODate(firstDayOfWeek);
    
    // Awal bulan ini
    const startOfMonth = getISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    
    // Awal tahun ini
    const startOfYear = getISODate(new Date(now.getFullYear(), 0, 1));
    
    switch (filter) {
        case 'today':
            return transactions.filter(tx => tx.date === today);
        case 'week':
            return transactions.filter(tx => tx.date >= startOfWeek && tx.date <= today);
        case 'month':
            return transactions.filter(tx => tx.date >= startOfMonth && tx.date <= today);
        case 'year':
            return transactions.filter(tx => tx.date >= startOfYear && tx.date <= today);
        case 'all':
        default:
            return transactions;
    }
}

function showToast(message, type = 'default') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    // Atur warna berdasarkan tipe
    if (type === 'success') {
        toast.style.backgroundColor = '#22c55e'; // green-500
    } else if (type === 'error') {
        toast.style.backgroundColor = '#ef4444'; // red-500
    } else {
        toast.style.backgroundColor = '#333';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000); // Sembunyikan setelah 3 detik
}