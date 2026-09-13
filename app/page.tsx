import Script from "next/script";

export default function Home() {
  return (
    <>
      <div className="app-shell">
        <aside className="sidebar" id="sidebar" aria-label="Navigasi utama">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></div>
            <div><strong id="brandName">UMKM Accounting</strong><span>Financial Reporting</span></div>
          </div>
          <nav className="side-nav" id="sideNav">
            <p className="nav-section-label">Ruang kerja</p>
            <button className="nav-item active" data-view="overview"><span>01</span>Dashboard</button>
            <p className="nav-section-label">Operasional</p>
            <button className="nav-item" data-view="sales"><span>02</span>Penjualan</button>
            <button className="nav-item" data-view="purchases"><span>03</span>Pembelian</button>
            <button className="nav-item" data-view="cashbank"><span>04</span>Kas &amp; Bank</button>
            <button className="nav-item" data-view="inventory"><span>05</span>Persediaan</button>
            <button className="nav-item" data-view="masterdata"><span>06</span>Master Barang</button>
            <p className="nav-section-label">Akuntansi</p>
            <button className="nav-item" data-view="ledger"><span>07</span>Buku Besar</button>
            <button className="nav-item" data-view="monthend"><span>08</span>Proses Akhir Bulan</button>
            <button className="nav-item" data-view="statements"><span>09</span>Laporan</button>
            <p className="nav-section-label">Sistem</p>
            <button className="nav-item" data-view="settings"><span>10</span>Pengaturan</button>
          </nav>
          <div className="sidebar-foot">
            <div className="local-note">
              <span className="local-dot" id="syncDot"></span>
              <div><strong id="syncTitle">Memuat data cloud</strong><small id="syncDetail">Menghubungkan akun</small></div>
            </div>
            <button className="text-button" id="resetButton">Muat ulang data contoh</button>
          </div>
        </aside>
        <div className="mobile-backdrop" id="mobileBackdrop"></div>
        <main className="main-area">
          <header className="topbar">
            <div className="topbar-left">
              <button className="menu-button" id="menuButton" aria-label="Buka menu" aria-expanded="false"><span></span><span></span><span></span></button>
              <div><p className="eyebrow" id="businessEyebrow">STUDI KASUS · USAHA MAKANAN</p><h1 id="pageTitle">Dashboard</h1></div>
            </div>
            <div className="period-chip"><span>Periode</span><strong id="periodLabel">September 2026</strong></div>
          </header>
          <div id="app" className="content" tabIndex={-1}></div>
        </main>
      </div>
      <dialog className="journal-dialog" id="journalDialog" aria-labelledby="journalDialogTitle"></dialog>
      <div className="toast-region" id="toastRegion" aria-live="polite"></div>
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
