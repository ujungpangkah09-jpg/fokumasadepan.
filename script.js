/* ==========================================================
   FOKUS MASA DEPAN — SCRIPT.JS (FULL FINAL VERSION)
   Semua fitur sudah diperbaiki, dirapikan, dan distandarkan.
   ========================================================== */

// Kunci LocalStorage
const APP_KEY = 'fokusMasaDepanDB';

// Database default
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
    transactions: [] // {id, type, amount, category, note, date}
};

let currentTxType = "pengeluaran";
let myAnalysisChart = null;

/* ==========================================================
   1. INITIAL LOAD
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
    loadDB();
    renderDashboard();
    populateCategorySelects();
    navigateTo("page-dashboard");

    document.getElementById("form-tx-tanggal").value = getISODate(new Date());
});

/* ==========================================================
   2. DATABASE SYSTEM
   ========================================================== */

function loadDB() {
    const data = localStorage.getItem(APP_KEY);
    if (data) {
        db = JSON.parse(data);

        // Tambahan check kesesuaian struktur (migrasi)
        if (!db.settings.motivasi) {
            db.settings.motivasi = {
                kuning: "Hati-hati, pengeluaranmu banyak!",
                merah: "STOP! Kamu sudah boros!"
            };
        }
        if (!db.transactions) {
            db.transactions = [];
        }
    } else {
        saveDB();
    }
}

function saveDB() {
    localStorage.setItem(APP_KEY, JSON.stringify(db));
}

/* ==========================================================
   3. NAVIGASI HALAMAN
   ========================================================== */

function navigateTo(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    const page = document.getElementById(pageId);
    if (!page) return;
    page.classList.add("active");

    window.scrollTo(0, 0);

    // Per halaman
    if (pageId === "page-dashboard") renderDashboard();
    if (pageId === "page-history") renderHistoryPage();
    if (pageId === "page-analysis") renderAnalysisPage();
    if (pageId === "page-settings-limit") renderSettingsLimitPage();
    if (pageId === "page-settings-kategori") renderSettingsKategoriPage();
    if (pageId === "page-settings-motivasi") renderSettingsMotivasiPage();
    if (pageId === "page-settings-notifikasi") renderSettingsNotifikasiPage();
}

/* ==========================================================
   4. MODAL sistem
   ========================================================== */

function showModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("active");

    if (id === "modal-edit-dream") {
        document.getElementById("form-dream-title").value = db.dream.title;
        document.getElementById("form-dream-target").value = db.dream.targetAmount;
        document.getElementById("form-dream-date").value = db.dream.targetDate;
    }

    if (id === "modal-add-tx") {
        document.getElementById("form-tx-nominal").value = "";
        document.getElementById("form-tx-alasan").value = "";
        document.getElementById("form-tx-tanggal").value = getISODate(new Date());
        switchTxType("pengeluaran");
    }
}

function hideModal(id) {
    document.getElementById(id).classList.remove("active");
}

/* ==========================================================
   5. TAMBAH TRANSAKSI
   ========================================================== */

function switchTxType(type) {
    currentTxType = type;

    const tabOut = document.getElementById("tab-pengeluaran");
    const tabIn = document.getElementById("tab-pemasukan");
    const kategoriGroup = document.getElementById("form-tx-kategori-group");

    if (type === "pengeluaran") {
        tabOut.className = "flex-1 py-2 text-center font-semibold border-b-2 border-primary text-primary";
        tabIn.className = "flex-1 py-2 text-center font-semibold text-gray-500";
        kategoriGroup.style.display = "block";
    } else {
        tabIn.className = "flex-1 py-2 text-center font-semibold border-b-2 border-primary text-primary";
        tabOut.className = "flex-1 py-2 text-center font-semibold text-gray-500";
        kategoriGroup.style.display = "none";
    }
}

function saveTransaction() {
    const amount = parseFloat(document.getElementById("form-tx-nominal").value);
    const category =
        currentTxType === "pengeluaran"
            ? document.getElementById("form-tx-kategori").value
            : "Pemasukan";

    const note = document.getElementById("form-tx-alasan").value;
    const date = document.getElementById("form-tx-tanggal").value;

    if (!amount || amount <= 0) return showToast("Nominal harus lebih dari 0", "error");
    if (!date) return showToast("Tanggal harus diisi", "error");

    const tx = {
        id: Date.now().toString(),
        type: currentTxType,
        amount,
        category,
        note,
        date
    };

    if (currentTxType === "pengeluaran") db.saldo -= amount;
    else db.saldo += amount;

    db.transactions.push(tx);
    saveDB();

    hideModal("modal-add-tx");
    renderDashboard();
    showToast("Transaksi berhasil disimpan!", "success");
}

/* ==========================================================
   6. HALAMAN HISTORI
   ========================================================== */

function renderHistoryPage() {
    const filter = document.getElementById("history-filter-time").value;
    const txList = filterTransactions(db.transactions, filter);

    const listEl = document.getElementById("history-full-list");
    const totalInEl = document.getElementById("hist-total-in");
    const totalOutEl = document.getElementById("hist-total-out");

    listEl.innerHTML = "";
    let totalIn = 0, totalOut = 0;

    const sorted = [...txList].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 py-6">Tidak ada transaksi.</p>`;
    } else {
        sorted.forEach(tx => {
            if (tx.type === "pemasukan") totalIn += tx.amount;
            else totalOut += tx.amount;

            listEl.innerHTML += `
                <div class="p-4 bg-white rounded-lg shadow-sm mb-3 flex justify-between">
                    <div>
                        <p class="font-semibold">${tx.category}</p>
                        <p class="text-gray-500 text-sm">${formatDate(tx.date)}</p>
                    </div>
                    <div class="font-bold ${tx.type === "pemasukan" ? "text-success" : "text-danger"}">
                        ${tx.type === "pemasukan" ? "+" : "-"}${formatRupiah(tx.amount)}
                    </div>
                </div>`;
        });
    }

    totalInEl.textContent = formatRupiah(totalIn);
    totalOutEl.textContent = formatRupiah(totalOut);
}

/* ==========================================================
   7. HALAMAN ANALISIS
   ========================================================== */

function renderAnalysisPage() {
    const filter = document.getElementById("analysis-filter-time").value;
    const allOut = db.transactions.filter(tx => tx.type === "pengeluaran");
    const filtered = filterTransactions(allOut, filter);

    const limit = db.settings.limitBulanan;
    const terpakai = filtered.reduce((a, b) => a + b.amount, 0);
    const sisa = limit - terpakai;

    document.getElementById("analysis-limit").textContent = formatRupiah(limit);
    document.getElementById("analysis-terpakai").textContent = formatRupiah(terpakai);
    document.getElementById("analysis-sisa").textContent = formatRupiah(sisa);

    const kategoriTotal = {};
    filtered.forEach(tx => {
        kategoriTotal[tx.category] = (kategoriTotal[tx.category] || 0) + tx.amount;
    });

    const labels = Object.keys(kategoriTotal);
    const data = Object.values(kategoriTotal);

    const ctx = document.getElementById("analysis-chart").getContext("2d");

    if (myAnalysisChart) myAnalysisChart.destroy();

    if (labels.length === 0) {
        ctx.font = "16px Inter";
        ctx.fillStyle = "#999";
        ctx.fillText("Tidak ada data", 120, 120);
        return;
    }

    myAnalysisChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [
                {
                    data,
                    backgroundColor: [
                        "#ef4444", "#f59e0b", "#22c55e", "#3b82f6",
                        "#8b5cf6", "#ec4899", "#f97316"
                    ]
                }
            ]
        }
    });
}

/* ==========================================================
   8. HALAMAN PENGATURAN
   ========================================================== */

function renderSettingsLimitPage() {
    document.getElementById("setting-limit-bulanan").value =
        db.settings.limitBulanan;
}

function saveSettingsLimit() {
    const val = parseFloat(document.getElementById("setting-limit-bulanan").value);
    if (!val || val < 0) return showToast("Limit tidak valid", "error");

    db.settings.limitBulanan = val;
    saveDB();
    showToast("Berhasil disimpan!", "success");
    navigateTo("page-settings");
}

function renderSettingsKategoriPage() {
    const listEl = document.getElementById("settings-kategori-list");
    listEl.innerHTML = "";

    db.settings.kategori.forEach((kat, i) => {
        listEl.innerHTML += `
        <div class="p-3 bg-gray-100 rounded-lg flex justify-between mb-2">
            <span>${kat}</span>
            <button onclick="deleteCategory(${i})" class="text-red-500">Hapus</button>
        </div>`;
    });
}

function addCategory() {
    const input = document.getElementById("setting-kategori-baru");
    const val = input.value.trim();
    if (!val) return;

    db.settings.kategori.push(val);
    saveDB();
    populateCategorySelects();
    renderSettingsKategoriPage();
    input.value = "";
    showToast("Kategori ditambahkan!", "success");
}

function deleteCategory(i) {
    db.settings.kategori.splice(i, 1);
    saveDB();
    populateCategorySelects();
    renderSettingsKategoriPage();
    showToast("Kategori dihapus", "success");
}

function renderSettingsMotivasiPage() {
    document.getElementById("setting-motivasi-kuning").value =
        db.settings.motivasi.kuning;
    document.getElementById("setting-motivasi-merah").value =
        db.settings.motivasi.merah;
}

function saveSettingsMotivasi() {
    db.settings.motivasi.kuning =
        document.getElementById("setting-motivasi-kuning").value;
    db.settings.motivasi.merah =
        document.getElementById("setting-motivasi-merah").value;

    saveDB();
    showToast("Motivasi disimpan!", "success");
    navigateTo("page-settings");
}

function renderSettingsNotifikasiPage() {
    document.getElementById("setting-notif-aktif").checked =
        db.settings.notifikasi.aktif;
    document.getElementById("setting-notif-waktu").value =
        db.settings.notifikasi.waktu;
}

function saveSettingsNotifikasi() {
    db.settings.notifikasi.aktif =
        document.getElementById("setting-notif-aktif").checked;
    db.settings.notifikasi.waktu =
        document.getElementById("setting-notif-waktu").value;

    saveDB();
    showToast("Notifikasi disimpan!", "success");
    navigateTo("page-settings");
}

/* ==========================================================
   9. DREAM / IMPIAN
   ========================================================== */

function saveDream() {
    const title = document.getElementById("form-dream-title").value;
    const targetAmount = parseFloat(document.getElementById("form-dream-target").value);
    const date = document.getElementById("form-dream-date").value;

    if (!title || !targetAmount || !date)
        return showToast("Semua field wajib diisi", "error");

    db.dream.title = title;
    db.dream.targetAmount = targetAmount;
    db.dream.targetDate = date;

    saveDB();
    hideModal("modal-edit-dream");
    renderDashboard();
    showToast("Impian diperbarui!", "success");
}

/* ==========================================================
   10. RENDER DASHBOARD
   ========================================================== */

function renderDashboard() {
    document.getElementById("dash-saldo").textContent = formatRupiah(db.saldo);

    const d = db.dream;
    const progress = Math.min((db.saldo / d.targetAmount) * 100, 100);

    document.getElementById("dash-dream-title").textContent = d.title;
    document.getElementById("dash-dream-target-amount").textContent =
        formatRupiah(d.targetAmount);
    document.getElementById("dash-dream-target-date").textContent =
        formatDate(d.targetDate);
    document.getElementById("dash-dream-progress").style.width = progress + "%";
    document.getElementById("dash-dream-progress-percent").textContent =
        progress.toFixed(1) + "%";

    const limit = db.settings.limitBulanan;
    const pengeluaran = filterTransactions(
        db.transactions.filter(t => t.type === "pengeluaran"),
        "month"
    ).reduce((a, b) => a + b.amount, 0);

    const sisa = limit - pengeluaran;
    const sisaPercent = (sisa / limit) * 100;

    const indicator = document.getElementById("dash-budget-indicator");
    const warning = document.getElementById("dash-budget-warning");

    document.getElementById("dash-budget-limit").textContent = formatRupiah(limit);
    document.getElementById("dash-budget-sisa").textContent = formatRupiah(sisa);

    if (sisaPercent > 40) {
        indicator.className =
            "px-3 py-1 bg-success text-white rounded-full text-sm font-semibold";
        indicator.textContent = "Aman";
        warning.textContent = "";
    } else if (sisaPercent > 10) {
        indicator.className =
            "px-3 py-1 bg-warning text-white rounded-full text-sm font-semibold";
        indicator.textContent = "Hati-hati";
        warning.textContent = db.settings.motivasi.kuning;
    } else {
        indicator.className =
            "px-3 py-1 bg-danger text-white rounded-full text-sm font-semibold";
        indicator.textContent = "Bahaya";
        warning.textContent = db.settings.motivasi.merah;
    }

    renderRecentHistory();
}

function renderRecentHistory() {
    const list = document.getElementById("dash-history-list");
    const sorted = [...db.transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (sorted.length === 0) {
        list.innerHTML = `<p class="text-center text-gray-500 py-4">Belum ada transaksi.</p>`;
        return;
    }

    list.innerHTML = sorted
        .map(tx => {
            return `
        <div class="bg-white p-4 rounded-xl shadow-sm flex justify-between mb-2">
            <div>
                <p class="font-semibold">${tx.category}</p>
                <p class="text-sm text-gray-500">${formatDate(tx.date)}</p>
            </div>
            <div class="${tx.type === "pemasukan"
                ? "text-success"
                : "text-danger"} font-bold">
                ${tx.type === "pemasukan" ? "+" : "-"}${formatRupiah(tx.amount)}
            </div>
        </div>`;
        })
        .join("");
}

/* ==========================================================
   11. HELPER FUNCTIONS
   ========================================================== */

function formatRupiah(num) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(num);
}

function formatDate(str) {
    const d = new Date(str + "T00:00");
    return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getISODate(date) {
    return (
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0")
    );
}

function populateCategorySelects() {
    const sel = document.getElementById("form-tx-kategori");
    sel.innerHTML = "";
    db.settings.kategori.forEach(k => {
        const op = document.createElement("option");
        op.value = op.textContent = k;
        sel.appendChild(op);
    });
}

function filterTransactions(list, filter) {
    const now = new Date();
    const today = getISODate(now);

    const startMonth = getISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    const startYear = getISODate(new Date(now.getFullYear(), 0, 1));

    const startWeek = getISODate(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    );

    if (filter === "today") return list.filter(tx => tx.date === today);
    if (filter === "week") return list.filter(tx => tx.date >= startWeek);
    if (filter === "month") return list.filter(tx => tx.date >= startMonth);
    if (filter === "year") return list.filter(tx => tx.date >= startYear);
    return list;
}

/* ==========================================================
   12. TOAST
   ========================================================== */

function showToast(msg, type = "default") {
    const t = document.getElementById("toast");
    t.textContent = msg;

    if (type === "success") t.style.background = "#22c55e";
    else if (type === "error") t.style.background = "#ef4444";
    else t.style.background = "#333";

    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
}

/* ==========================================================
   13. RESET SISTEM (POPUP + RESET DATABASE)
   ========================================================== */

function openResetPopup() {
    document.getElementById("resetPopup").classList.remove("hidden");
}

function closeResetPopup() {
    document.getElementById("resetPopup").classList.add("hidden");
}

function confirmResetData() {
    const defaultDB = {
        saldo: 0,
        dream: {
            title: "Membeli Motor Baru",
            targetAmount: 10000000,
            targetDate: "2026-12-31"
        },
        settings: {
            limitBulanan: 2000000,
            motivasi: {
                kuning: "Hati-hati, pengeluaranmu banyak!",
                merah: "STOP! Kamu sudah boros!"
            },
            kategori: [
                "🍔 Makanan",
                "🚌 Transportasi",
                "💡 Tagihan",
                "🏠 Sewa/Cicilan",
                "🎬 Hiburan",
                "👕 Belanja",
                "Lainnya"
            ],
            notifikasi: {
                aktif: false,
                waktu: "09:00"
            }
        },
        transactions: []
    };

    localStorage.setItem(APP_KEY, JSON.stringify(defaultDB));

    closeResetPopup();
    showToast("Data berhasil direset!", "success");

    setTimeout(() => location.reload(), 800);
            }
