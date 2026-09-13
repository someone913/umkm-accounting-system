(() => {
  "use strict";

  const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const DEFAULT_ITEMS = [
    { id: "item-01", name: "Jenang Pati Garut", category: "Produk", unit: "porsi", active: true },
    { id: "item-02", name: "Keripik Kimpul", category: "Produk", unit: "bungkus", active: true },
    { id: "item-03", name: "Kue Bawang", category: "Produk", unit: "bungkus", active: true },
    { id: "item-04", name: "Bahan Baku Produksi", category: "Bahan", unit: "paket", active: true },
    { id: "item-05", name: "Kemasan", category: "Bahan", unit: "paket", active: true }
  ];

  function periodFrom(value) {
    const safe = /^\d{4}-\d{2}$/.test(value || "") ? value : "2026-09";
    const [year, month] = safe.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { value: safe, start: `${safe}-01`, end: `${safe}-${String(lastDay).padStart(2, "0")}`, label: `${MONTHS[month - 1]} ${year}`, endLabel: `${lastDay} ${MONTHS[month - 1]} ${year}` };
  }

  let PERIOD = periodFrom("2026-09");

  const ACCOUNTS = [
    { code: "1101", name: "Kas", category: "Aset", group: "asset", normal: "debit" },
    { code: "1102", name: "Bank", category: "Aset", group: "asset", normal: "debit" },
    { code: "1103", name: "Piutang Usaha", category: "Aset", group: "asset", normal: "debit" },
    { code: "1104", name: "Persediaan Bahan", category: "Aset", group: "asset", normal: "debit" },
    { code: "1201", name: "Peralatan", category: "Aset", group: "asset", normal: "debit" },
    { code: "1202", name: "Akumulasi Penyusutan", category: "Kontra Aset", group: "contra_asset", normal: "credit" },
    { code: "2101", name: "Utang Usaha", category: "Liabilitas", group: "liability", normal: "credit" },
    { code: "2102", name: "Utang Beban", category: "Liabilitas", group: "liability", normal: "credit" },
    { code: "3101", name: "Modal Pemilik", category: "Ekuitas", group: "equity", normal: "credit" },
    { code: "3102", name: "Prive", category: "Kontra Ekuitas", group: "drawing", normal: "debit" },
    { code: "4101", name: "Penjualan", category: "Pendapatan", group: "revenue", normal: "credit" },
    { code: "5101", name: "Beban Bahan / HPP", category: "Beban", group: "expense", normal: "debit" },
    { code: "5102", name: "Beban Kemasan", category: "Beban", group: "expense", normal: "debit" },
    { code: "5103", name: "Beban Listrik", category: "Beban", group: "expense", normal: "debit" },
    { code: "5104", name: "Beban Gas", category: "Beban", group: "expense", normal: "debit" },
    { code: "5105", name: "Beban Transportasi", category: "Beban", group: "expense", normal: "debit" },
    { code: "5106", name: "Beban Penyusutan", category: "Beban", group: "expense", normal: "debit" },
    { code: "5199", name: "Beban Lain-lain", category: "Beban", group: "expense", normal: "debit" }
  ];

  const ACCOUNT = Object.fromEntries(ACCOUNTS.map((account) => [account.code, account]));
  const EXPENSE_ACCOUNTS = ACCOUNTS.filter((account) => account.group === "expense" && !["5101", "5106"].includes(account.code));

  const TRANSACTION_TYPES = {
    capital: {
      label: "Setoran modal",
      defaultDescription: "Setoran modal pemilik",
      lines: (amount) => lines("1101", "3101", amount)
    },
    cash_sale: {
      label: "Penjualan tunai",
      defaultDescription: "Penjualan makanan tunai",
      lines: (amount) => lines("1101", "4101", amount)
    },
    credit_sale: {
      label: "Penjualan kredit",
      defaultDescription: "Penjualan makanan secara kredit",
      lines: (amount) => lines("1103", "4101", amount)
    },
    inventory_cash: {
      label: "Pembelian bahan tunai",
      defaultDescription: "Pembelian bahan baku tunai",
      lines: (amount) => lines("1104", "1101", amount)
    },
    inventory_credit: {
      label: "Pembelian bahan kredit",
      defaultDescription: "Pembelian bahan baku secara kredit",
      lines: (amount) => lines("1104", "2101", amount)
    },
    pay_payable: {
      label: "Pembayaran utang",
      defaultDescription: "Pembayaran utang kepada pemasok",
      lines: (amount) => lines("2101", "1101", amount)
    },
    collect_receivable: {
      label: "Penerimaan piutang",
      defaultDescription: "Penerimaan pembayaran pelanggan",
      lines: (amount) => lines("1101", "1103", amount)
    },
    cash_expense: {
      label: "Pembayaran beban tunai",
      defaultDescription: "Pembayaran beban operasional",
      lines: (amount, extra) => lines(extra.expenseAccount || "5199", "1101", amount)
    },
    equipment_cash: {
      label: "Pembelian peralatan tunai",
      defaultDescription: "Pembelian peralatan usaha",
      lines: (amount) => lines("1201", "1101", amount)
    },
    drawing: {
      label: "Prive pemilik",
      defaultDescription: "Pengambilan kas oleh pemilik",
      lines: (amount) => lines("3102", "1101", amount)
    }
  };

  const OPERATION_MODULES = {
    sales: {
      title: "Penjualan",
      description: "Catat penjualan tunai atau kredit. Sistem membentuk piutang, kas, dan pendapatan secara otomatis.",
      formTitle: "Faktur penjualan baru",
      listTitle: "Daftar penjualan",
      partyLabel: "Pelanggan",
      defaultParty: "Pelanggan Umum",
      allowedTypes: ["cash_sale", "credit_sale"],
      submitLabel: "Posting penjualan"
    },
    purchases: {
      title: "Pembelian",
      description: "Catat pembelian bahan atau peralatan, baik tunai maupun kredit kepada pemasok.",
      formTitle: "Pembelian baru",
      listTitle: "Daftar pembelian",
      partyLabel: "Pemasok",
      defaultParty: "Pemasok Bahan",
      allowedTypes: ["inventory_cash", "inventory_credit", "equipment_cash"],
      submitLabel: "Posting pembelian"
    },
    cashbank: {
      title: "Kas & Bank",
      description: "Kelola penerimaan dan pengeluaran di luar faktur penjualan atau pembelian.",
      formTitle: "Kas masuk / keluar",
      listTitle: "Mutasi kas",
      partyLabel: "Pihak terkait",
      defaultParty: "Pemilik / Operasional",
      allowedTypes: ["capital", "collect_receivable", "pay_payable", "cash_expense", "drawing"],
      submitLabel: "Posting kas"
    }
  };

  const PAGE_TITLES = {
    overview: "Dashboard",
    sales: "Penjualan",
    purchases: "Pembelian",
    cashbank: "Kas & Bank",
    inventory: "Persediaan",
    masterdata: "Master Barang",
    ledger: "Buku Besar",
    monthend: "Proses Akhir Bulan",
    statements: "Laporan",
    settings: "Pengaturan"
  };

  let currentView = "overview";
  let trialMode = "unadjusted";
  let ledgerSection = "journal";
  let selectedLedgerAccount = "1101";
  let state = withDefaults(sampleState());
  let cloudUserEmail = "";
  let saveSequence = 0;

  const app = document.getElementById("app");
  const pageTitle = document.getElementById("pageTitle");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("mobileBackdrop");
  const menuButton = document.getElementById("menuButton");

  function lines(debitAccount, creditAccount, amount) {
    return [
      { account: debitAccount, debit: amount, credit: 0 },
      { account: creditAccount, debit: 0, credit: amount }
    ];
  }

  function sampleState() {
    const t = (id, date, type, amount, description, extra = {}) => ({
      id,
      source: "transaction",
      date,
      type,
      description,
      amount,
      extra,
      lines: TRANSACTION_TYPES[type].lines(amount, extra)
    });
    return {
      version: 2,
      profile: { businessName: "UMKM Makanan Keluarga", city: "Bantul, Yogyakarta", period: "2026-09" },
      items: DEFAULT_ITEMS.map((item) => ({ ...item })),
      transactions: [
        t("trx-01", "2026-09-01", "capital", 8000000, "Setoran modal awal"),
        t("trx-02", "2026-09-02", "inventory_cash", 1500000, "Pembelian bahan baku tunai"),
        t("trx-03", "2026-09-03", "equipment_cash", 3000000, "Pembelian peralatan dapur"),
        t("trx-04", "2026-09-04", "cash_sale", 950000, "Penjualan pesanan konsumsi"),
        t("trx-05", "2026-09-06", "cash_expense", 180000, "Pembelian kemasan", { expenseAccount: "5102" }),
        t("trx-06", "2026-09-08", "credit_sale", 600000, "Pesanan katering secara kredit"),
        t("trx-07", "2026-09-10", "inventory_credit", 900000, "Pembelian bahan dari pemasok"),
        t("trx-08", "2026-09-12", "cash_sale", 1250000, "Penjualan pesanan rapat"),
        t("trx-09", "2026-09-15", "collect_receivable", 400000, "Penerimaan sebagian piutang"),
        t("trx-10", "2026-09-18", "pay_payable", 500000, "Pembayaran sebagian utang pemasok"),
        t("trx-11", "2026-09-20", "cash_expense", 150000, "Pembelian gas produksi", { expenseAccount: "5104" }),
        t("trx-12", "2026-09-23", "cash_expense", 120000, "Biaya antar pesanan", { expenseAccount: "5105" }),
        t("trx-13", "2026-09-27", "cash_sale", 1100000, "Penjualan akhir pekan"),
        t("trx-14", "2026-09-28", "drawing", 300000, "Pengambilan kas pemilik")
      ],
      adjustments: [
        {
          id: "adj-01", source: "adjustment", type: "depreciation", date: "2026-09-30", amount: 50000,
          description: "Penyusutan peralatan bulan September", meta: { cost: 3000000, lifeMonths: 60 },
          lines: lines("5106", "1202", 50000)
        },
        {
          id: "adj-02", source: "adjustment", type: "accrued_expense", date: "2026-09-30", amount: 220000,
          description: "Beban listrik September belum dibayar", meta: { expenseAccount: "5103" },
          lines: lines("5103", "2102", 220000)
        },
        {
          id: "adj-03", source: "adjustment", type: "ending_inventory", date: "2026-09-30", amount: 1700000,
          description: "Pemakaian bahan berdasarkan stok fisik akhir", meta: { endingInventory: 700000, bookInventory: 2400000 },
          lines: lines("5101", "1104", 1700000)
        }
      ]
    };
  }

  function withDefaults(value) {
    const fallback = sampleState();
    const source = value && typeof value === "object" ? value : fallback;
    return {
      version: 2,
      profile: { ...fallback.profile, ...(source.profile || {}) },
      items: Array.isArray(source.items) ? source.items : fallback.items,
      transactions: Array.isArray(source.transactions) ? source.transactions : fallback.transactions,
      adjustments: Array.isArray(source.adjustments) ? source.adjustments : fallback.adjustments
    };
  }

  function setSyncStatus(status, detail = "") {
    const title = document.getElementById("syncTitle");
    const text = document.getElementById("syncDetail");
    const dot = document.getElementById("syncDot");
    if (!title || !text || !dot) return;
    const labels = { demo: "Mode demo", loading: "Memuat data", saving: "Memproses perubahan", saved: "Data diperbarui", error: "Proses gagal" };
    title.textContent = labels[status] || labels.loading;
    text.textContent = detail || (status === "saved" ? (cloudUserEmail || "Akun aktif") : "Periksa koneksi internet");
    dot.className = `local-dot ${status}`;
  }

  function syncShell() {
    PERIOD = periodFrom(state.profile.period);
    document.getElementById("periodLabel").textContent = PERIOD.label;
    document.getElementById("brandName").textContent = state.profile.businessName;
    document.getElementById("businessEyebrow").textContent = `${state.profile.city || "USAHA MAKANAN"} · STUDI KASUS`;
  }

  async function loadCloudState() {
    state = withDefaults(sampleState());
    syncShell();
    setSyncStatus("demo", "Data contoh untuk preview");
    render();
  }

  async function saveState(silent = false) {
    setSyncStatus("demo", "Perubahan aktif selama halaman dibuka");
    if (!silent) window.setTimeout(() => setSyncStatus("demo", "Data contoh untuk preview"), 1600);
  }

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function money(value, dashZero = false) {
    const number = Math.round(Number(value) || 0);
    if (dashZero && number === 0) return "—";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
  }

  function compactMoney(value) {
    const number = Number(value) || 0;
    if (Math.abs(number) >= 1000000) return `Rp${(number / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt`;
    return money(number);
  }

  function shortDate(date) {
    if (!date) return "—";
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year.slice(2)}`;
  }

  function documentNumber(entry) {
    const prefixes = {
      cash_sale: "SAL", credit_sale: "SAL", inventory_cash: "PUR", inventory_credit: "PUR",
      equipment_cash: "PUR", collect_receivable: "RCV", pay_payable: "PAY", cash_expense: "PAY",
      capital: "CAP", drawing: "DRW", depreciation: "ADJ", accrued_expense: "ADJ", ending_inventory: "ADJ"
    };
    const serial = String(entry.id).match(/(\d+)(?!.*\d)/)?.[1]?.slice(-3).padStart(3, "0") || "001";
    const [year = "2026", month = "09"] = String(entry.date || PERIOD.start).split("-");
    return `${prefixes[entry.type] || "DOC"}-${year.slice(-2)}${month}-${serial}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function sortedEntries(includeAdjustments = true) {
    const entries = includeAdjustments ? [...state.transactions, ...state.adjustments] : [...state.transactions];
    return entries.filter(inPeriod).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }

  function inPeriod(entry) {
    return entry.date >= PERIOD.start && entry.date <= PERIOD.end;
  }

  function totals(entries) {
    return entries.reduce((sum, entry) => {
      entry.lines.forEach((line) => {
        sum.debit += Number(line.debit) || 0;
        sum.credit += Number(line.credit) || 0;
      });
      return sum;
    }, { debit: 0, credit: 0 });
  }

  function rawBalances(entries) {
    const result = Object.fromEntries(ACCOUNTS.map((account) => [account.code, 0]));
    entries.forEach((entry) => entry.lines.forEach((line) => {
      result[line.account] = (result[line.account] || 0) + (Number(line.debit) || 0) - (Number(line.credit) || 0);
    }));
    return result;
  }

  function financials() {
    const entries = sortedEntries(true);
    const balances = rawBalances(entries);
    const revenue = ACCOUNTS.filter((a) => a.group === "revenue").reduce((sum, a) => sum - balances[a.code], 0);
    const expenses = ACCOUNTS.filter((a) => a.group === "expense").reduce((sum, a) => sum + balances[a.code], 0);
    const netIncome = revenue - expenses;
    const capital = ACCOUNTS.filter((a) => a.group === "equity").reduce((sum, a) => sum - balances[a.code], 0);
    const drawings = ACCOUNTS.filter((a) => a.group === "drawing").reduce((sum, a) => sum + balances[a.code], 0);
    const endingCapital = capital + netIncome - drawings;
    const assets = ACCOUNTS.filter((a) => ["asset", "contra_asset"].includes(a.group)).reduce((sum, a) => sum + balances[a.code], 0);
    const liabilities = ACCOUNTS.filter((a) => a.group === "liability").reduce((sum, a) => sum - balances[a.code], 0);
    return { balances, revenue, expenses, netIncome, capital, drawings, endingCapital, assets, liabilities };
  }

  function showToast(message, kind = "success") {
    const region = document.getElementById("toastRegion");
    const toast = document.createElement("div");
    toast.className = `toast${kind === "error" ? " error" : ""}`;
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  function navigate(view) {
    if (!PAGE_TITLES[view]) return;
    currentView = view;
    pageTitle.textContent = PAGE_TITLES[view];
    document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    closeMenu();
    render();
    app.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMenu() {
    sidebar.classList.add("open");
    backdrop.classList.add("open");
    menuButton.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    sidebar.classList.remove("open");
    backdrop.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }

  function render() {
    const views = {
      overview: renderOverview,
      sales: () => renderOperationalPage("sales"),
      purchases: () => renderOperationalPage("purchases"),
      cashbank: () => renderOperationalPage("cashbank"),
      inventory: renderInventory,
      masterdata: renderMasterData,
      ledger: renderLedgerModule,
      monthend: renderMonthEnd,
      statements: renderStatements,
      settings: renderSettings
    };
    app.innerHTML = views[currentView]();
    bindViewEvents();
  }

  function heading(title, description, action = "") {
    return `<div class="section-heading"><div><h2>${title}</h2><p>${description}</p></div>${action}</div>`;
  }

  function equationHtml(fin) {
    const right = fin.liabilities + fin.endingCapital;
    const balanced = Math.abs(fin.assets - right) < 1;
    return `<div class="equation-box ${balanced ? "good" : "bad"}">
      <div class="equation-item"><span>Total Aset</span><strong>${money(fin.assets)}</strong></div>
      <div class="equation-symbol">=</div>
      <div class="equation-item"><span>Liabilitas</span><strong>${money(fin.liabilities)}</strong></div>
      <div class="equation-symbol">+</div>
      <div class="equation-item"><span>Ekuitas Akhir</span><strong>${money(fin.endingCapital)}</strong></div>
    </div>`;
  }

  function renderOverview() {
    const fin = financials();
    const recent = state.transactions.filter(inPeriod).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 6);
    return `<div class="page-stack">
      ${heading("Ringkasan periode", PERIOD.label, `<button class="button primary" data-go="sales">+ Buat penjualan</button>`)}

      <div class="metric-grid">
        <article class="metric-card primary"><span class="metric-label">Penjualan</span><strong class="metric-value">${compactMoney(fin.revenue)}</strong></article>
        <article class="metric-card positive"><span class="metric-label">Laba bersih</span><strong class="metric-value">${compactMoney(fin.netIncome)}</strong></article>
        <article class="metric-card"><span class="metric-label">Saldo kas</span><strong class="metric-value">${compactMoney(fin.balances["1101"])}</strong></article>
        <article class="metric-card"><span class="metric-label">Total aset</span><strong class="metric-value">${compactMoney(fin.assets)}</strong></article>
        <article class="metric-card"><span class="metric-label">Piutang</span><strong class="metric-value">${compactMoney(fin.balances["1103"])}</strong></article>
        <article class="metric-card"><span class="metric-label">Utang</span><strong class="metric-value">${compactMoney(fin.liabilities)}</strong></article>
      </div>

      <div class="panel-grid">
        <section class="panel">
          <div class="panel-head"><div><h3>Dokumen terbaru</h3></div><button class="button secondary" data-go="ledger">Buka buku besar</button></div>
          <div class="table-wrap">
            <table><thead><tr><th>No. Dokumen</th><th>Tanggal</th><th>Keterangan</th><th class="num">Nilai</th></tr></thead>
            <tbody>${recent.map((entry) => `<tr><td><span class="document-id">${documentNumber(entry)}</span></td><td>${shortDate(entry.date)}</td><td><span class="account-name">${escapeHtml(entry.description)}</span><span class="type-pill posted">Posted</span></td><td class="num">${money(entry.amount)}</td></tr>`).join("")}</tbody></table>
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><h3>Posisi keuangan</h3></div></div>
          <div class="panel-body">${equationHtml(fin)}
            <div class="mini-list" style="margin-top:14px">
              <div class="mini-row"><span>Entri transaksi</span><strong>${state.transactions.filter(inPeriod).length}</strong></div>
              <div class="mini-row"><span>Entri penyesuaian</span><strong>${state.adjustments.filter(inPeriod).length}</strong></div>
              <div class="mini-row"><span>Akun dengan saldo</span><strong>${Object.values(fin.balances).filter((v) => Math.abs(v) > 0).length}</strong></div>
            </div>
          </div>
        </section>
      </div>
    </div>`;
  }

  function transactionTypeOptions(allowedTypes) {
    return allowedTypes.map((value) => `<option value="${value}">${TRANSACTION_TYPES[value].label}</option>`).join("");
  }

  function expenseOptions(selected = "5102") {
    return EXPENSE_ACCOUNTS.map((account) => `<option value="${account.code}" ${account.code === selected ? "selected" : ""}>${account.code} · ${account.name}</option>`).join("");
  }

  function renderOperationalPage(moduleKey) {
    const module = OPERATION_MODULES[moduleKey];
    const firstType = module.allowedTypes[0];
    const rows = state.transactions.filter((entry) => inPeriod(entry) && module.allowedTypes.includes(entry.type)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const itemField = ["sales", "purchases"].includes(moduleKey) ? `<div class="form-field"><label for="transactionItem">Barang / bahan</label><select id="transactionItem" name="itemId"><option value="">Tanpa rincian barang</option>${state.items.filter((item) => item.active).map((item) => `<option value="${item.id}">${escapeHtml(item.name)} · ${escapeHtml(item.unit)}</option>`).join("")}</select><small>Daftar dapat diubah di Master Barang.</small></div>` : "";
    return `<div class="page-stack">
      ${heading(module.title, module.description)}
      <div class="split-layout">
        <section class="panel sticky-panel">
          <div class="panel-head"><div><h3>${module.formTitle}</h3></div></div>
          <div class="panel-body">
            <form id="transactionForm" data-module="${moduleKey}">
              <div class="form-grid">
                <div class="form-field"><label for="transactionDate">Tanggal</label><input id="transactionDate" name="date" type="date" min="${PERIOD.start}" max="${PERIOD.end}" value="${PERIOD.end}" required /></div>
                <div class="form-field"><label for="transactionType">Jenis dokumen</label><select id="transactionType" name="type">${transactionTypeOptions(module.allowedTypes)}</select></div>
                <div class="form-field"><label for="transactionParty">${module.partyLabel}</label><input id="transactionParty" name="party" value="${module.defaultParty}" maxlength="70" required /></div>
                <div class="form-field"><label for="transactionAmount">Nilai transaksi</label><input id="transactionAmount" name="amount" inputmode="numeric" type="number" min="1" step="1000" placeholder="500000" required /><small>Masukkan angka tanpa titik.</small></div>
                ${itemField}
                <div class="form-field full"><label for="transactionDescription">Keterangan</label><input id="transactionDescription" name="description" value="${TRANSACTION_TYPES[firstType].defaultDescription}" maxlength="90" required /></div>
                <div id="transactionExtra" class="form-field"></div>
              </div>
              <div id="transactionPreview" class="entry-preview"></div>
              <div class="form-actions"><button class="button primary" type="submit">${module.submitLabel}</button></div>
            </form>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head"><div><h3>${module.listTitle}</h3><p>${rows.length} dokumen sudah diposting pada ${PERIOD.label}.</p></div></div>
          <div class="table-wrap">
            <table><thead><tr><th>No. Dokumen</th><th>Tanggal</th><th>Keterangan</th><th>Status</th><th class="num">Nilai</th><th aria-label="Aksi"></th></tr></thead>
            <tbody>${rows.length ? rows.map((entry) => `<tr>
              <td><span class="document-id">${documentNumber(entry)}</span></td><td>${shortDate(entry.date)}</td><td><span class="account-name">${escapeHtml(entry.description)}</span><span class="party-name">${escapeHtml([entry.extra?.itemName, entry.extra?.party || module.defaultParty].filter(Boolean).join(" · "))}</span></td>
              <td><span class="type-pill posted">Posted</span></td>
              <td class="num">${money(entry.amount)}</td>
              <td class="num"><button class="button secondary view-journal" data-id="${entry.id}">Rincian jurnal</button> <button class="icon-button delete-entry" data-source="transaction" data-id="${entry.id}" aria-label="Hapus ${escapeHtml(entry.description)}">×</button></td>
            </tr>`).join("") : `<tr><td colspan="6" class="empty-state"><strong>Belum ada dokumen</strong>Gunakan formulir untuk mencatat aktivitas pertama.</td></tr>`}</tbody></table>
          </div>
        </section>
      </div>
    </div>`;
  }

  function renderMasterData() {
    const rows = [...state.items].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
    return `<div class="page-stack">
      ${heading("Master Barang", "Daftar barang dan bahan yang muncul pada pilihan transaksi.")}
      <div class="split-layout">
        <section class="panel sticky-panel">
          <div class="panel-head"><div><h3>Tambah barang</h3></div></div>
          <div class="panel-body"><form id="itemForm"><div class="form-grid">
            <div class="form-field full"><label for="itemName">Nama barang / bahan</label><input id="itemName" name="name" maxlength="70" required /></div>
            <div class="form-field"><label for="itemCategory">Kategori</label><select id="itemCategory" name="category"><option>Produk</option><option>Bahan</option><option>Peralatan</option></select></div>
            <div class="form-field"><label for="itemUnit">Satuan</label><input id="itemUnit" name="unit" placeholder="bungkus" maxlength="25" required /></div>
          </div><div class="form-actions"><button class="button primary" type="submit">Tambah ke dropdown</button></div></form></div>
        </section>
        <section class="panel"><div class="panel-head"><div><h3>Daftar barang</h3><p>${rows.filter((item) => item.active).length} aktif dari ${rows.length} item.</p></div></div>
          <div class="table-wrap"><table><thead><tr><th>Nama</th><th>Kategori</th><th>Satuan</th><th>Status</th><th class="num">Aksi</th></tr></thead><tbody>
            ${rows.map((item) => `<tr><td><span class="account-name">${escapeHtml(item.name)}</span></td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.unit)}</td><td><span class="type-pill ${item.active ? "posted" : ""}">${item.active ? "Aktif" : "Nonaktif"}</span></td><td class="num"><button class="button secondary toggle-item" data-id="${item.id}">${item.active ? "Nonaktifkan" : "Aktifkan"}</button></td></tr>`).join("")}
          </tbody></table></div>
        </section>
      </div>
    </div>`;
  }

  function renderSettings() {
    return `<div class="page-stack">
      ${heading("Pengaturan", "Profil usaha dan periode aktif yang digunakan seluruh laporan.")}
      <section class="panel settings-panel"><div class="panel-head"><div><h3>Profil usaha</h3></div></div><div class="panel-body">
        <form id="settingsForm"><div class="form-grid">
          <div class="form-field full"><label for="businessName">Nama usaha</label><input id="businessName" name="businessName" value="${escapeHtml(state.profile.businessName)}" maxlength="80" required /></div>
          <div class="form-field"><label for="businessCity">Lokasi</label><input id="businessCity" name="city" value="${escapeHtml(state.profile.city || "")}" maxlength="80" /></div>
          <div class="form-field"><label for="accountingPeriod">Periode aktif</label><input id="accountingPeriod" name="period" type="month" value="${state.profile.period}" required /><small>Transaksi dan laporan mengikuti bulan ini.</small></div>
        </div><div class="form-actions"><button class="button primary" type="submit">Simpan pengaturan</button></div></form>
      </div></section>
      <section class="panel"><div class="panel-head"><div><h3>Penyimpanan data</h3></div></div><div class="panel-body"><div class="storage-summary"><span class="local-dot saved"></span><div><strong>Database cloud aktif</strong><p>Transaksi, penyesuaian, profil usaha, periode, dan master barang tersimpan pada akun ini.</p></div></div></div></section>
    </div>`;
  }

  function renderAccounts(embedded = false) {
    const balances = rawBalances(sortedEntries(true));
    const categories = ["Aset", "Kontra Aset", "Liabilitas", "Ekuitas", "Kontra Ekuitas", "Pendapatan", "Beban"];
    return `<div class="page-stack">
      ${embedded ? "" : heading("Chart of Accounts", "Daftar akun dibuat ringkas untuk studi kasus usaha makanan. Saldo berasal dari buku besar setelah penyesuaian.")}
      <section class="panel"><div class="table-wrap"><table>
        <thead><tr><th>Kode</th><th>Nama akun</th><th>Klasifikasi</th><th>Saldo normal</th><th class="num">Saldo akhir</th></tr></thead>
        <tbody>${categories.flatMap((category) => ACCOUNTS.filter((a) => a.category === category).map((a) => {
          const raw = balances[a.code];
          const display = a.normal === "debit" ? raw : -raw;
          return `<tr><td class="account-code">${a.code}</td><td><span class="account-name">${a.name}</span></td><td>${a.category}</td><td>${a.normal === "debit" ? "Debit" : "Kredit"}</td><td class="num">${money(display, true)}</td></tr>`;
        })).join("")}</tbody>
      </table></div></section>
    </div>`;
  }

  function journalRows(entries) {
    return entries.map((entry) => entry.lines.map((line, index) => `<tr>
      ${index === 0 ? `<td rowspan="${entry.lines.length}">${shortDate(entry.date)}</td><td rowspan="${entry.lines.length}"><span class="account-name">${escapeHtml(entry.description)}</span><span class="type-pill ${entry.source === "adjustment" ? "adjustment" : ""}">${entry.source === "adjustment" ? "Penyesuaian" : "Transaksi"}</span></td>` : ""}
      <td class="${line.credit ? "journal-credit" : ""}"><span class="account-code">${line.account}</span><span class="account-name">${ACCOUNT[line.account]?.name || line.account}</span></td>
      <td class="num">${money(line.debit, true)}</td><td class="num">${money(line.credit, true)}</td>
    </tr>`).join("")).join("");
  }

  function renderJournal(embedded = false) {
    const entries = sortedEntries(true);
    const sum = totals(entries);
    const balanced = Math.abs(sum.debit - sum.credit) < 1;
    return `<div class="page-stack">
      ${embedded ? "" : heading("General Journal", "Transaksi rutin dan jurnal penyesuaian disusun kronologis dalam satu periode.", `<span class="status-pill ${balanced ? "good" : "bad"}">${balanced ? "Debit = Kredit" : "Jurnal selisih"}</span>`)}
      <section class="panel"><div class="table-wrap"><table>
        <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Akun</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead>
        <tbody>${journalRows(entries)}<tr class="total-row"><td colspan="3">Total</td><td class="num">${money(sum.debit)}</td><td class="num">${money(sum.credit)}</td></tr>
        <tr class="balance-row"><td colspan="5">${balanced ? "Status: Balance" : `Selisih ${money(Math.abs(sum.debit - sum.credit))}`}</td></tr></tbody>
      </table></div></section>
    </div>`;
  }

  function ledgerMovements(accountCode) {
    return sortedEntries(true).flatMap((entry) => entry.lines.filter((line) => line.account === accountCode).map((line) => ({ ...line, date: entry.date, description: entry.description, source: entry.source })));
  }

  function renderLedgerBook(embedded = false) {
    const account = ACCOUNT[selectedLedgerAccount];
    const movements = ledgerMovements(selectedLedgerAccount);
    let running = 0;
    const rows = movements.map((movement) => {
      running += movement.debit - movement.credit;
      const side = running >= 0 ? "D" : "K";
      return `<tr><td>${shortDate(movement.date)}</td><td><span class="account-name">${escapeHtml(movement.description)}</span>${movement.source === "adjustment" ? `<span class="type-pill adjustment">Penyesuaian</span>` : ""}</td><td class="num">${money(movement.debit, true)}</td><td class="num">${money(movement.credit, true)}</td><td class="num"><strong>${money(Math.abs(running))} ${side}</strong></td></tr>`;
    }).join("");
    return `<div class="page-stack">
      ${embedded ? "" : heading("General Ledger", "Pilih satu akun untuk melihat posting jurnal, mutasi, dan saldo berjalan.")}
      <section class="panel">
        <div class="panel-head"><div><h3>${account.code} · ${account.name}</h3><p>Saldo normal: ${account.normal === "debit" ? "Debit" : "Kredit"}</p></div>
          <div class="form-field" style="min-width:min(280px,100%)"><label for="ledgerAccount">Pilih akun</label><select id="ledgerAccount">${ACCOUNTS.map((a) => `<option value="${a.code}" ${a.code === selectedLedgerAccount ? "selected" : ""}>${a.code} · ${a.name}</option>`).join("")}</select></div>
        </div>
        <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Saldo</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="empty-state"><strong>Belum ada mutasi</strong>Akun ini belum digunakan pada periode berjalan.</td></tr>`}</tbody>
        </table></div>
      </section>
    </div>`;
  }

  function trialTable(includeAdjustments) {
    const entries = sortedEntries(includeAdjustments);
    const balances = rawBalances(entries);
    let debitTotal = 0;
    let creditTotal = 0;
    const rows = ACCOUNTS.filter((a) => Math.abs(balances[a.code]) > 0).map((account) => {
      const raw = balances[account.code];
      const debit = raw > 0 ? raw : 0;
      const credit = raw < 0 ? -raw : 0;
      debitTotal += debit;
      creditTotal += credit;
      return `<tr><td class="account-code">${account.code}</td><td><span class="account-name">${account.name}</span></td><td class="num">${money(debit, true)}</td><td class="num">${money(credit, true)}</td></tr>`;
    }).join("");
    const balanced = Math.abs(debitTotal - creditTotal) < 1;
    return `<section class="report-paper">
      <div class="report-heading">
        <strong>${escapeHtml(state.profile.businessName).toUpperCase()}</strong>
        <h3>${includeAdjustments ? "NERACA SALDO SETELAH PENYESUAIAN" : "NERACA SALDO"}</h3>
        <p>Per ${PERIOD.endLabel}</p>
      </div>
      <div class="table-wrap report-table-wrap"><table class="academic-table"><thead><tr><th>No. Akun</th><th>Nama Akun</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead><tbody>${rows}
        <tr class="academic-grand-total"><td colspan="2">Jumlah</td><td class="num">${money(debitTotal)}</td><td class="num">${money(creditTotal)}</td></tr>
      </tbody></table></div>
      <div class="report-status ${balanced ? "good" : "bad"}">${balanced ? "Debit = Kredit" : `Selisih ${money(Math.abs(debitTotal - creditTotal))}`}</div>
    </section>`;
  }

  function renderTrialBalance(embedded = false) {
    const adjusted = trialMode === "adjusted";
    return `<div class="page-stack">
      ${embedded ? "" : heading("Trial Balance", "Bandingkan saldo sebelum dan setelah jurnal penyesuaian diposting.")}
      <div class="tabs" role="tablist" aria-label="Jenis neraca saldo">
        <button class="tab ${!adjusted ? "active" : ""}" data-trial="unadjusted" role="tab" aria-selected="${!adjusted}">Sebelum Penyesuaian</button>
        <button class="tab ${adjusted ? "active" : ""}" data-trial="adjusted" role="tab" aria-selected="${adjusted}">Setelah Penyesuaian</button>
      </div>
      ${trialTable(adjusted)}
    </div>`;
  }

  function renderLedgerModule() {
    const sections = {
      journal: () => renderJournal(true),
      ledger: () => renderLedgerBook(true),
      trial: () => renderTrialBalance(true),
      accounts: () => renderAccounts(true)
    };
    return `<div class="page-stack">
      ${heading("Buku Besar", PERIOD.label)}
      <div class="module-tabs" role="tablist" aria-label="Menu Buku Besar">
        <button class="module-tab ${ledgerSection === "journal" ? "active" : ""}" data-ledger-section="journal">Jurnal Umum</button>
        <button class="module-tab ${ledgerSection === "ledger" ? "active" : ""}" data-ledger-section="ledger">Buku Besar</button>
        <button class="module-tab ${ledgerSection === "trial" ? "active" : ""}" data-ledger-section="trial">Neraca Saldo</button>
        <button class="module-tab ${ledgerSection === "accounts" ? "active" : ""}" data-ledger-section="accounts">Daftar Akun</button>
      </div>
      ${sections[ledgerSection]()}
    </div>`;
  }

  function renderInventory() {
    const preAdjustment = Math.max(0, rawBalances(sortedEntries(false))["1104"]);
    const inventoryAdjustment = state.adjustments.find((entry) => inPeriod(entry) && entry.type === "ending_inventory");
    const endingInventory = inventoryAdjustment?.meta?.endingInventory ?? preAdjustment;
    const usedMaterials = inventoryAdjustment?.amount || 0;
    const movements = sortedEntries(true).flatMap((entry) => entry.lines.filter((line) => line.account === "1104").map((line) => ({ entry, line })));
    let running = 0;
    return `<div class="page-stack">
      ${heading("Persediaan Bahan", "Pantau nilai bahan yang masuk, saldo buku, hasil stock opname, dan bahan yang dipakai selama periode.", `<button class="button primary" data-go="purchases">+ Catat pembelian bahan</button>`)}
      <div class="stock-grid">
        <article class="stock-card"><span>Bahan tersedia menurut buku</span><strong>${money(preAdjustment)}</strong></article>
        <article class="stock-card"><span>Stok fisik akhir</span><strong>${money(endingInventory)}</strong></article>
        <article class="stock-card"><span>Bahan terpakai / HPP</span><strong>${money(usedMaterials)}</strong></article>
      </div>
      <section class="panel">
        <div class="panel-head"><div><h3>Kartu nilai persediaan</h3><p>Mutasi akun 1104 · Persediaan Bahan.</p></div><button class="button secondary" data-go="monthend">Stock opname akhir bulan</button></div>
        <div class="table-wrap"><table><thead><tr><th>No. Dokumen</th><th>Tanggal</th><th>Keterangan</th><th class="num">Masuk</th><th class="num">Keluar</th><th class="num">Saldo</th></tr></thead><tbody>
          ${movements.map(({ entry, line }) => { running += line.debit - line.credit; return `<tr><td><span class="document-id">${documentNumber(entry)}</span></td><td>${shortDate(entry.date)}</td><td><span class="account-name">${escapeHtml(entry.description)}</span></td><td class="num">${money(line.debit, true)}</td><td class="num">${money(line.credit, true)}</td><td class="num"><strong>${money(running)}</strong></td></tr>`; }).join("") || `<tr><td colspan="6" class="empty-state"><strong>Belum ada mutasi</strong>Catat pembelian bahan untuk membentuk saldo persediaan.</td></tr>`}
        </tbody></table></div>
      </section>
    </div>`;
  }

  function adjustmentExtra(type) {
    if (type === "depreciation") return `<div class="form-field"><label for="assetCost">Nilai peralatan</label><input id="assetCost" name="cost" type="number" min="1" step="1000" value="3000000" required /></div><div class="form-field"><label for="lifeMonths">Umur manfaat (bulan)</label><input id="lifeMonths" name="lifeMonths" type="number" min="1" value="60" required /></div>`;
    if (type === "accrued_expense") return `<div class="form-field"><label for="adjustExpenseAccount">Akun beban</label><select id="adjustExpenseAccount" name="expenseAccount">${expenseOptions("5103")}</select></div><div class="form-field"><label for="accruedAmount">Nilai yang belum dibayar</label><input id="accruedAmount" name="amount" type="number" min="1" step="1000" value="220000" required /></div>`;
    const bookInventory = Math.max(0, rawBalances(sortedEntries(false))["1104"]);
    return `<div class="form-field"><label>Saldo persediaan sebelum adjustment</label><input value="${bookInventory}" disabled /><small>${money(bookInventory)} berdasarkan buku besar.</small></div><div class="form-field"><label for="endingInventory">Persediaan fisik akhir</label><input id="endingInventory" name="endingInventory" type="number" min="0" max="${bookInventory}" step="1000" value="700000" required /></div>`;
  }

  function adjustmentPreviewData(form) {
    const type = form.querySelector("#adjustmentType")?.value || "depreciation";
    if (type === "depreciation") {
      const cost = Number(form.querySelector("[name=cost]")?.value) || 0;
      const lifeMonths = Number(form.querySelector("[name=lifeMonths]")?.value) || 0;
      const amount = lifeMonths > 0 ? Math.round(cost / lifeMonths) : 0;
      return { type, amount, description: "Penyusutan peralatan periode berjalan", lines: lines("5106", "1202", amount), meta: { cost, lifeMonths } };
    }
    if (type === "accrued_expense") {
      const expenseAccount = form.querySelector("[name=expenseAccount]")?.value || "5103";
      const amount = Number(form.querySelector("[name=amount]")?.value) || 0;
      return { type, amount, description: `${ACCOUNT[expenseAccount].name} periode berjalan belum dibayar`, lines: lines(expenseAccount, "2102", amount), meta: { expenseAccount } };
    }
    const bookInventory = Math.max(0, rawBalances(sortedEntries(false))["1104"]);
    const endingInventory = Number(form.querySelector("[name=endingInventory]")?.value) || 0;
    const amount = Math.max(0, bookInventory - endingInventory);
    return { type, amount, description: "Pemakaian bahan berdasarkan stok fisik akhir", lines: lines("5101", "1104", amount), meta: { endingInventory, bookInventory } };
  }

  function renderEntryPreview(data) {
    return `<div class="entry-preview-head"><strong>Rincian posting</strong><span class="status-pill info">Draft</span></div>
      ${data.lines.map((line) => `<div class="entry-line ${line.credit ? "credit" : ""}"><span>${line.debit ? "Dr" : "Cr"} · ${ACCOUNT[line.account]?.name || line.account}</span><b>${money(line.debit || line.credit)}</b></div>`).join("")}`;
  }

  function renderMonthEnd() {
    const rows = state.adjustments.filter(inPeriod).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const labels = { depreciation: "Penyusutan", accrued_expense: "Beban akrual", ending_inventory: "Persediaan akhir" };
    const hasDepreciation = rows.some((entry) => entry.type === "depreciation");
    const hasAccrued = rows.some((entry) => entry.type === "accrued_expense");
    const hasInventory = rows.some((entry) => entry.type === "ending_inventory");
    return `<div class="page-stack">
      ${heading("Proses Akhir Bulan", PERIOD.label)}
      <div class="process-grid">
        <article class="process-card ${hasInventory ? "done" : "pending"}"><span>01 · STOCK OPNAME</span><strong>${hasInventory ? "Persediaan sudah disesuaikan" : "Menunggu persediaan akhir"}</strong></article>
        <article class="process-card ${hasDepreciation && hasAccrued ? "done" : "pending"}"><span>02 · ADJUSTING ENTRIES</span><strong>${hasDepreciation && hasAccrued ? "Penyesuaian utama lengkap" : "Periksa penyesuaian periode"}</strong></article>
        <article class="process-card ${rows.length ? "done" : "pending"}"><span>03 · TRIAL BALANCE</span><strong>${rows.length ? "Siap review laporan" : "Belum ada adjustment"}</strong></article>
      </div>
      <div class="split-layout">
        <section class="panel sticky-panel">
          <div class="panel-head"><div><h3>Penyesuaian baru</h3></div></div>
          <div class="panel-body">
            <form id="adjustmentForm">
              <div class="form-grid">
                <div class="form-field full"><label for="adjustmentType">Jenis penyesuaian</label><select id="adjustmentType" name="type"><option value="depreciation">Penyusutan peralatan</option><option value="accrued_expense">Beban masih harus dibayar</option><option value="ending_inventory">Persediaan akhir</option></select></div>
                <div id="adjustmentExtra" class="form-field full" style="display:contents">${adjustmentExtra("depreciation")}</div>
              </div>
              <div id="adjustmentPreview" class="entry-preview"></div>
              <div class="form-actions"><button class="button primary" type="submit">Simpan penyesuaian</button></div>
            </form>
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><h3>Jurnal penyesuaian</h3><p>${rows.length} penyesuaian per ${PERIOD.endLabel}.</p></div><button class="button secondary" data-ledger-jump="trial">Review neraca saldo</button></div>
          <div class="table-wrap"><table><thead><tr><th>No. Dokumen</th><th>Tanggal</th><th>Keterangan</th><th>Jenis</th><th class="num">Nilai</th><th aria-label="Aksi"></th></tr></thead><tbody>
            ${rows.length ? rows.map((entry) => `<tr><td><span class="document-id">${documentNumber(entry)}</span></td><td>${shortDate(entry.date)}</td><td><span class="account-name">${escapeHtml(entry.description)}</span></td><td><span class="type-pill adjustment">${labels[entry.type] || entry.type}</span></td><td class="num">${money(entry.amount)}</td><td class="num"><button class="button secondary view-journal" data-id="${entry.id}">Rincian jurnal</button> <button class="icon-button delete-entry" data-source="adjustment" data-id="${entry.id}" aria-label="Hapus ${escapeHtml(entry.description)}">×</button></td></tr>`).join("") : `<tr><td colspan="6" class="empty-state"><strong>Belum ada penyesuaian</strong>Tambahkan data akhir periode melalui formulir.</td></tr>`}
          </tbody></table></div>
        </section>
      </div>
    </div>`;
  }

  function reportHeading(title, period) {
    return `<div class="report-heading"><strong>${escapeHtml(state.profile.businessName).toUpperCase()}</strong><h3>${title}</h3><p>${period}</p></div>`;
  }

  function reportRow(label, value = null, className = "", totalColumn = false) {
    return `<tr class="${className}"><td>${label}</td><td class="num">${value !== null && !totalColumn ? money(value) : ""}</td><td class="num">${value !== null && totalColumn ? money(value) : ""}</td></tr>`;
  }

  function reportAccountRows(accounts, balances, sign = 1, labelPrefix = "") {
    return accounts.filter((a) => Math.abs(balances[a.code]) > 0).map((a) => reportRow(`${labelPrefix}${a.name}`, Math.abs(balances[a.code] * sign), "report-detail")).join("");
  }

  function renderStatements() {
    const fin = financials();
    const expenseAccounts = ACCOUNTS.filter((a) => a.group === "expense");
    const currentAssetAccounts = ACCOUNTS.filter((a) => a.group === "asset" && a.code.startsWith("11"));
    const fixedAssetAccounts = ACCOUNTS.filter((a) => a.group === "asset" && a.code.startsWith("12"));
    const contraAssets = ACCOUNTS.filter((a) => a.group === "contra_asset");
    const liabilityAccounts = ACCOUNTS.filter((a) => a.group === "liability");
    const revenue = ACCOUNTS.filter((a) => a.group === "revenue").reduce((total, a) => total + Math.abs(fin.balances[a.code] || 0), 0);
    const expenses = expenseAccounts.reduce((total, a) => total + Math.abs(fin.balances[a.code] || 0), 0);
    const currentAssets = currentAssetAccounts.reduce((total, a) => total + (fin.balances[a.code] || 0), 0);
    const fixedAssets = fixedAssetAccounts.reduce((total, a) => total + (fin.balances[a.code] || 0), 0) + contraAssets.reduce((total, a) => total + (fin.balances[a.code] || 0), 0);
    const balanced = Math.abs(fin.assets - (fin.liabilities + fin.endingCapital)) < 1;
    return `<div class="page-stack">
      ${heading("Laporan Keuangan", `Per ${PERIOD.endLabel}`, `<div class="report-actions"><button class="button secondary" id="exportXlsx">Export XLSX</button><button class="button primary" id="exportPdf">Export PDF</button><span class="status-pill ${balanced ? "good" : "bad"}">${balanced ? "Balance" : "Belum balance"}</span></div>`)}
      <div class="report-stack">
        <section class="report-paper">
          ${reportHeading("LAPORAN LABA RUGI", `Untuk bulan yang berakhir ${PERIOD.endLabel}`)}
          <table class="statement-table"><thead><tr><th>Uraian</th><th class="num">Jumlah</th><th class="num">Total</th></tr></thead><tbody>
            ${reportRow("Pendapatan", null, "report-section")}
            ${reportAccountRows(ACCOUNTS.filter((a) => a.group === "revenue"), fin.balances, -1)}
            ${reportRow("Total Pendapatan", revenue, "report-subtotal", true)}
            ${reportRow("Beban", null, "report-section")}
            ${reportAccountRows(expenseAccounts, fin.balances)}
            ${reportRow("Total Beban", expenses, "report-subtotal", true)}
            ${reportRow("Laba Bersih", fin.netIncome, "report-final", true)}
          </tbody></table>
        </section>
        <section class="report-paper">
          ${reportHeading("LAPORAN PERUBAHAN MODAL", `Untuk bulan yang berakhir ${PERIOD.endLabel}`)}
          <table class="statement-table"><thead><tr><th>Uraian</th><th class="num">Jumlah</th><th class="num">Total</th></tr></thead><tbody>
            ${reportRow("Modal Pemilik", fin.capital, "report-detail", true)}
            ${reportRow("Tambah: Laba Bersih", fin.netIncome, "report-detail")}
            ${reportRow("", fin.capital + fin.netIncome, "report-subtotal", true)}
            ${reportRow("Kurang: Prive", fin.drawings, "report-detail")}
            ${reportRow("Modal Akhir", fin.endingCapital, "report-final", true)}
          </tbody></table>
        </section>
        <section class="report-paper">
          ${reportHeading("LAPORAN POSISI KEUANGAN", `Per ${PERIOD.endLabel}`)}
          <table class="statement-table"><thead><tr><th>Uraian</th><th class="num">Jumlah</th><th class="num">Total</th></tr></thead><tbody>
            ${reportRow("ASET", null, "report-section major")}
            ${reportRow("Aset Lancar", null, "report-section")}
            ${reportAccountRows(currentAssetAccounts, fin.balances)}
            ${reportRow("Total Aset Lancar", currentAssets, "report-subtotal", true)}
            ${reportRow("Aset Tetap", null, "report-section")}
            ${reportAccountRows(fixedAssetAccounts, fin.balances)}
            ${contraAssets.filter((a) => Math.abs(fin.balances[a.code]) > 0).map((a) => reportRow(`Kurang: ${a.name}`, Math.abs(fin.balances[a.code]), "report-detail")).join("")}
            ${reportRow("Total Aset Tetap", fixedAssets, "report-subtotal", true)}
            ${reportRow("TOTAL ASET", fin.assets, "report-final", true)}
            ${reportRow("LIABILITAS", null, "report-section major")}
            ${reportAccountRows(liabilityAccounts, fin.balances, -1)}
            ${reportRow("Total Liabilitas", fin.liabilities, "report-subtotal", true)}
            ${reportRow("EKUITAS", null, "report-section major")}
            ${reportRow("Modal Akhir", fin.endingCapital, "report-detail")}
            ${reportRow("Total Ekuitas", fin.endingCapital, "report-subtotal", true)}
            ${reportRow("TOTAL LIABILITAS DAN EKUITAS", fin.liabilities + fin.endingCapital, "report-final", true)}
          </tbody></table>
        </section>
      </div>
    </div>`;
  }

  function exportPayload() {
    const entries = sortedEntries(true);
    const fin = financials();
    const balances = fin.balances;
    const trialRows = ACCOUNTS.filter((account) => Math.abs(balances[account.code]) > 0).map((account) => {
      const raw = balances[account.code];
      return [account.code, account.name, raw > 0 ? raw : 0, raw < 0 ? -raw : 0];
    });
    const journalRows = entries.flatMap((entry) => entry.lines.map((line) => [entry.date, entry.description, line.account, ACCOUNT[line.account]?.name || line.account, line.debit || 0, line.credit || 0]));
    const ledgerRows = ACCOUNTS.flatMap((account) => ledgerMovements(account.code).map((movement) => [account.code, account.name, movement.date, movement.description, movement.debit || 0, movement.credit || 0]));
    const expenseRows = ACCOUNTS.filter((account) => account.group === "expense" && Math.abs(balances[account.code]) > 0).map((account) => [account.name, Math.abs(balances[account.code])]);
    const assetRows = ACCOUNTS.filter((account) => ["asset", "contra_asset"].includes(account.group) && Math.abs(balances[account.code]) > 0).map((account) => [account.name, balances[account.code]]);
    const liabilityRows = ACCOUNTS.filter((account) => account.group === "liability" && Math.abs(balances[account.code]) > 0).map((account) => [account.name, Math.abs(balances[account.code])]);
    return {
      xlsx: {
        filename: `laporan-${state.profile.period}.xlsx`,
        sheets: [
          { name: "Jurnal Umum", rows: [["Tanggal", "Keterangan", "No. Akun", "Nama Akun", "Debit", "Kredit"], ...journalRows] },
          { name: "Buku Besar", rows: [["No. Akun", "Nama Akun", "Tanggal", "Keterangan", "Debit", "Kredit"], ...ledgerRows] },
          { name: "Neraca Saldo", rows: [["No. Akun", "Nama Akun", "Debit", "Kredit"], ...trialRows] },
          { name: "Laba Rugi", rows: [["Uraian", "Jumlah"], ["Penjualan", fin.revenue], ...expenseRows, ["Total Beban", fin.expenses], ["Laba Bersih", fin.netIncome]] },
          { name: "Perubahan Modal", rows: [["Uraian", "Jumlah"], ["Modal Pemilik", fin.capital], ["Laba Bersih", fin.netIncome], ["Prive", fin.drawings], ["Modal Akhir", fin.endingCapital]] },
          { name: "Posisi Keuangan", rows: [["Uraian", "Jumlah"], ...assetRows, ["Total Aset", fin.assets], ...liabilityRows, ["Total Liabilitas", fin.liabilities], ["Modal Akhir", fin.endingCapital], ["Liabilitas dan Ekuitas", fin.liabilities + fin.endingCapital]] }
        ]
      },
      pdf: {
        filename: `laporan-${state.profile.period}.pdf`,
        businessName: state.profile.businessName,
        sections: [
          { title: "Laporan Laba Rugi", subtitle: `Untuk bulan yang berakhir ${PERIOD.endLabel}`, rows: [{ label: "Pendapatan", kind: "section" }, { label: "Penjualan", value: money(fin.revenue), kind: "detail" }, { label: "Beban", kind: "section" }, ...expenseRows.map(([label, value]) => ({ label, value: money(value), kind: "detail" })), { label: "Total Beban", value: money(fin.expenses), kind: "total" }, { label: "Laba Bersih", value: money(fin.netIncome), kind: "final" }] },
          { title: "Laporan Perubahan Modal", subtitle: `Untuk bulan yang berakhir ${PERIOD.endLabel}`, rows: [{ label: "Modal Pemilik", value: money(fin.capital), kind: "detail" }, { label: "Tambah: Laba Bersih", value: money(fin.netIncome), kind: "detail" }, { label: "Kurang: Prive", value: money(fin.drawings), kind: "detail" }, { label: "Modal Akhir", value: money(fin.endingCapital), kind: "final" }] },
          { title: "Laporan Posisi Keuangan", subtitle: `Per ${PERIOD.endLabel}`, rows: [{ label: "ASET", kind: "section" }, ...assetRows.map(([label, value]) => ({ label, value: money(value), kind: "detail" })), { label: "Total Aset", value: money(fin.assets), kind: "final" }, { label: "LIABILITAS", kind: "section" }, ...liabilityRows.map(([label, value]) => ({ label, value: money(value), kind: "detail" })), { label: "Total Liabilitas", value: money(fin.liabilities), kind: "total" }, { label: "EKUITAS", kind: "section" }, { label: "Modal Akhir", value: money(fin.endingCapital), kind: "detail" }, { label: "Total Liabilitas dan Ekuitas", value: money(fin.liabilities + fin.endingCapital), kind: "final" }] }
        ]
      }
    };
  }

  async function downloadExport(format, payload) {
    const button = document.getElementById(format === "xlsx" ? "exportXlsx" : "exportPdf");
    if (button) button.disabled = true;
    showToast(`Export ${format.toUpperCase()} tersedia pada versi server.`, "error");
    if (button) button.disabled = false;
  }

  function exportXlsx() { downloadExport("xlsx", exportPayload().xlsx); }
  function exportPdf() { downloadExport("pdf", exportPayload().pdf); }

  function bindViewEvents() {
    document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.go)));
    document.querySelectorAll(".delete-entry").forEach((button) => button.addEventListener("click", () => deleteEntry(button.dataset.source, button.dataset.id)));
    document.querySelectorAll(".view-journal").forEach((button) => button.addEventListener("click", () => openJournalDetail(button.dataset.id)));
    document.querySelectorAll("[data-ledger-jump]").forEach((button) => button.addEventListener("click", () => {
      ledgerSection = button.dataset.ledgerJump;
      navigate("ledger");
    }));

    if (["sales", "purchases", "cashbank"].includes(currentView)) bindTransactionForm();
    if (currentView === "ledger") {
      document.querySelectorAll("[data-ledger-section]").forEach((button) => button.addEventListener("click", () => {
        ledgerSection = button.dataset.ledgerSection;
        render();
      }));
      if (ledgerSection === "ledger") {
        document.getElementById("ledgerAccount")?.addEventListener("change", (event) => {
          selectedLedgerAccount = event.target.value;
          render();
        });
      }
      if (ledgerSection === "trial") {
        document.querySelectorAll("[data-trial]").forEach((button) => button.addEventListener("click", () => {
          trialMode = button.dataset.trial;
          render();
        }));
      }
    }
    if (currentView === "monthend") bindAdjustmentForm();
    if (currentView === "masterdata") bindMasterData();
    if (currentView === "settings") bindSettings();
    if (currentView === "statements") {
      document.getElementById("exportXlsx")?.addEventListener("click", exportXlsx);
      document.getElementById("exportPdf")?.addEventListener("click", exportPdf);
    }
  }

  function bindTransactionForm() {
    const form = document.getElementById("transactionForm");
    const typeSelect = document.getElementById("transactionType");
    const description = document.getElementById("transactionDescription");
    let autoDescription = true;

    function refreshExtra() {
      document.getElementById("transactionExtra").innerHTML = typeSelect.value === "cash_expense" ? `<label for="expenseAccount">Akun beban</label><select id="expenseAccount" name="expenseAccount">${expenseOptions()}</select>` : "";
      document.getElementById("expenseAccount")?.addEventListener("change", refreshPreview);
    }
    function refreshPreview() {
      const type = TRANSACTION_TYPES[typeSelect.value];
      const amount = Number(form.elements.amount.value) || 0;
      const extra = { expenseAccount: form.elements.expenseAccount?.value, party: form.elements.party?.value, itemId: form.elements.itemId?.value };
      document.getElementById("transactionPreview").innerHTML = renderEntryPreview({ lines: type.lines(amount, extra) });
    }
    typeSelect.addEventListener("change", () => {
      if (autoDescription) description.value = TRANSACTION_TYPES[typeSelect.value].defaultDescription;
      refreshExtra();
      refreshPreview();
    });
    description.addEventListener("input", () => { autoDescription = false; });
    form.addEventListener("input", refreshPreview);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const typeKey = String(data.get("type"));
      const type = TRANSACTION_TYPES[typeKey];
      const amount = Number(data.get("amount"));
      const date = String(data.get("date"));
      const itemId = String(data.get("itemId") || "");
      const item = state.items.find((candidate) => candidate.id === itemId);
      const extra = { expenseAccount: String(data.get("expenseAccount") || ""), party: String(data.get("party") || "").trim(), itemId, itemName: item?.name || "" };
      if (!type || !amount || amount <= 0 || !date) return showToast("Lengkapi tanggal dan nilai transaksi.", "error");
      const entry = { id: uid("trx"), source: "transaction", type: typeKey, date, amount, description: String(data.get("description") || type.defaultDescription).trim(), extra, lines: type.lines(amount, extra) };
      state.transactions.push(entry);
      saveState();
      showToast("Dokumen berhasil diposting ke buku besar.");
      render();
    });
    refreshExtra();
    refreshPreview();
  }

  function bindMasterData() {
    document.getElementById("itemForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const name = String(data.get("name") || "").trim();
      const unit = String(data.get("unit") || "").trim();
      if (!name || !unit) return showToast("Lengkapi nama dan satuan barang.", "error");
      if (state.items.some((item) => item.name.toLowerCase() === name.toLowerCase())) return showToast("Nama barang sudah ada.", "error");
      state.items.push({ id: uid("item"), name, category: String(data.get("category") || "Produk"), unit, active: true });
      saveState();
      showToast("Barang ditambahkan ke dropdown transaksi.");
      render();
    });
    document.querySelectorAll(".toggle-item").forEach((button) => button.addEventListener("click", () => {
      const item = state.items.find((candidate) => candidate.id === button.dataset.id);
      if (!item) return;
      item.active = !item.active;
      saveState();
      render();
    }));
  }

  function bindSettings() {
    document.getElementById("settingsForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      state.profile = { businessName: String(data.get("businessName") || "").trim(), city: String(data.get("city") || "").trim(), period: String(data.get("period") || "2026-09") };
      syncShell();
      saveState();
      showToast("Pengaturan usaha disimpan.");
      navigate("overview");
    });
  }

  function bindAdjustmentForm() {
    const form = document.getElementById("adjustmentForm");
    const typeSelect = document.getElementById("adjustmentType");
    function refreshPreview() {
      const data = adjustmentPreviewData(form);
      document.getElementById("adjustmentPreview").innerHTML = renderEntryPreview(data);
    }
    function refreshExtra() {
      document.getElementById("adjustmentExtra").innerHTML = adjustmentExtra(typeSelect.value);
      form.querySelectorAll("input,select").forEach((element) => {
        if (element !== typeSelect) element.addEventListener("input", refreshPreview);
      });
      refreshPreview();
    }
    typeSelect.addEventListener("change", refreshExtra);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = adjustmentPreviewData(form);
      if (!data.amount || data.amount <= 0) return showToast("Nilai penyesuaian harus lebih dari nol.", "error");
      if (data.type === "ending_inventory" && state.adjustments.some((entry) => inPeriod(entry) && entry.type === "ending_inventory")) return showToast("Penyesuaian persediaan sudah ada. Hapus yang lama sebelum menggantinya.", "error");
      if (data.type === "ending_inventory" && data.meta.endingInventory > data.meta.bookInventory) return showToast("Stok fisik tidak boleh melebihi saldo persediaan buku pada studi kasus ini.", "error");
      state.adjustments.push({ id: uid("adj"), source: "adjustment", type: data.type, date: PERIOD.end, amount: data.amount, description: data.description, meta: data.meta, lines: data.lines });
      saveState();
      showToast("Jurnal penyesuaian tersimpan.");
      render();
    });
    refreshPreview();
  }

  function deleteEntry(source, id) {
    const collectionName = source === "adjustment" ? "adjustments" : "transactions";
    const entry = state[collectionName].find((item) => item.id === id);
    if (!entry) return;
    if (!window.confirm(`Hapus “${entry.description}”? Saldo dan laporan akan dihitung ulang.`)) return;
    state[collectionName] = state[collectionName].filter((item) => item.id !== id);
    saveState();
    showToast("Entri dihapus; seluruh saldo telah dihitung ulang.");
    render();
  }

  function openJournalDetail(id) {
    const entry = [...state.transactions, ...state.adjustments].find((item) => item.id === id);
    if (!entry) return;
    const sum = totals([entry]);
    const dialog = document.getElementById("journalDialog");
    dialog.innerHTML = `<div class="dialog-head"><div><h3 id="journalDialogTitle">Rincian jurnal</h3><p>${escapeHtml(entry.description)}</p></div><button class="dialog-close" type="button" aria-label="Tutup">×</button></div>
      <div class="dialog-body">
        <div class="dialog-meta"><div><span>No. Dokumen</span><strong>${documentNumber(entry)}</strong></div><div><span>Tanggal posting</span><strong>${shortDate(entry.date)}</strong></div><div><span>Status</span><strong>Posted</strong></div></div>
        <div class="table-wrap"><table><thead><tr><th>Akun</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead><tbody>
          ${entry.lines.map((line) => `<tr><td class="${line.credit ? "journal-credit" : ""}"><span class="account-code">${line.account}</span><span class="account-name">${ACCOUNT[line.account]?.name || line.account}</span></td><td class="num">${money(line.debit, true)}</td><td class="num">${money(line.credit, true)}</td></tr>`).join("")}
          <tr class="total-row"><td>Total</td><td class="num">${money(sum.debit)}</td><td class="num">${money(sum.credit)}</td></tr>
        </tbody></table></div>
      </div>`;
    dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  document.getElementById("sideNav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) navigate(button.dataset.view);
  });
  menuButton.addEventListener("click", () => sidebar.classList.contains("open") ? closeMenu() : openMenu());
  backdrop.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
  document.getElementById("resetButton").addEventListener("click", () => {
    if (!window.confirm("Muat ulang data contoh dan menghapus perubahan pada sesi preview ini?")) return;
    state = withDefaults(sampleState());
    syncShell();
    saveState();
    showToast(`Data contoh ${PERIOD.label} dimuat ulang.`);
    navigate("overview");
  });

  syncShell();
  render();
  loadCloudState();
})();
