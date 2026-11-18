const STORAGE_KEY = "laporanToko";

// ==== State ====
let state = {
  uangTotal: "",
  pengeluaran: [{ nama: "", jumlah: "" }],
  omzet: "",
  kembalianKertas: "",
  kembalianKoin: "",
  tukarKertasKoin: "",
};

let fotoData = null; // Menyimpan Base64 gambar

// ==== Helper ====
const $ = (id) => document.getElementById(id);
const angka = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};
const rupiah = (n) =>
  "Rp " + n.toLocaleString("id-ID", { maximumFractionDigits: 0 });

// ==== Render pengeluaran ====
function renderPengeluaran() {
  const wrap = $("listPengeluaran");
  wrap.innerHTML = "";

  state.pengeluaran.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "pengeluaran-item";
    div.innerHTML = `
      <input type="text" placeholder="Keterangan" value="${item.nama}" data-index="${i}" data-field="nama">
      <input type="number" placeholder="Jumlah" value="${item.jumlah}" min="0" step="any" data-index="${i}" data-field="jumlah">
      ${
        state.pengeluaran.length > 1
          ? `<button type="button" class="btn-hapus" data-hapus="${i}" title="Hapus">×</button>`
          : ""
      }
    `;
    wrap.appendChild(div);
  });

  wrap.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const { index, field } = e.target.dataset;
      state.pengeluaran[index][field] = e.target.value;
      updateHitung();
      simpan();
    });
  });

  wrap.querySelectorAll(".btn-hapus").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.hapus);
      state.pengeluaran.splice(i, 1);
      renderPengeluaran();
      updateHitung();
      simpan();
    });
  });
}

function isiForm() {
  $("uangTotal").value = state.uangTotal;
  $("omzet").value = state.omzet;
  $("kembalianKertas").value = state.kembalianKertas;
  $("kembalianKoin").value = state.kembalianKoin;
  $("tukarKertasKoin").value = state.tukarKertasKoin;
}

// ==== Hitung semua tahap ====
function hitungTahapan() {
  const t1 = angka(state.uangTotal);

  const totalPengeluaran = state.pengeluaran.reduce(
    (s, p) => s + angka(p.jumlah),
    0
  );

  const tSementara = t1 - totalPengeluaran;
  const omzet = angka(state.omzet);
  const tSetelahOmzet = tSementara + omzet;
  const kertas = angka(state.kembalianKertas);
  const koin = angka(state.kembalianKoin);
  const tukar = angka(state.tukarKertasKoin);
  const tFinal = tSetelahOmzet - kertas - tukar;

  return {
    t1,
    totalPengeluaran,
    tSementara,
    omzet,
    tSetelahOmzet,
    kertas,
    koin,
    tukar,
    tFinal,
  };
}

function updateHitung() {
  const h = hitungTahapan();

  $("subtotalPengeluaran").textContent = rupiah(h.totalPengeluaran);

  $("tahap1").textContent = rupiah(h.t1);
  $("tahap2minus").textContent = "−" + rupiah(h.totalPengeluaran);
  $("tahapSementara").textContent = rupiah(h.tSementara);
  $("tahapOmzet").textContent = "+" + rupiah(h.omzet);
  $("tahapSetelahOmzet").textContent = rupiah(h.tSetelahOmzet);
  $("tahapKertas").textContent = "−" + rupiah(h.kertas);
  $("tahapTukar").textContent = "−" + rupiah(h.tukar);
  $("tahapFinal").textContent = rupiah(h.tFinal);

  return h;
}

// ==== Simpan / Muat ====
function simpan() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function muat() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state = { ...state, ...data };
    if (!Array.isArray(state.pengeluaran) || state.pengeluaran.length === 0) {
      state.pengeluaran = [{ nama: "", jumlah: "" }];
    }
  } catch (e) {
    console.warn("Data rusak, direset.");
  }
}

// ==== Bangun HTML laporan cetak ====
function bangunLaporanCetak() {
  const h = hitungTahapan();

  const timestamp = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const listPeng = state.pengeluaran.filter(
    (p) => angka(p.jumlah) > 0 || (p.nama && p.nama.trim() !== "")
  );

  const barisPengeluaran = listPeng
    .map(
      (p, i) => `
        <tr class="item-row">
          <td>${i + 1}. ${p.nama || "(tanpa keterangan)"}</td>
          <td class="kanan">−${rupiah(angka(p.jumlah))}</td>
        </tr>`
    )
    .join("");

  const barisTukar =
    h.tukar > 0
      ? `<tr>
           <td>Tukar Kertas ke Koin</td>
           <td class="kanan">−${rupiah(h.tukar)}</td>
         </tr>`
      : "";

  const area = $("areaCetak");
  area.innerHTML = `
    <div class="halaman-laporan">
      <div class="cetak-header">
        <img src="esteh1.png" alt="Logo Toko" class="cetak-logo">
        <h2>Laporan Keuangan Toko</h2>
        <div class="sub">${timestamp}</div>
      </div>

      <table>
        <tr>
          <td>Uang Kas</td>
          <td class="kanan">${rupiah(h.t1)}</td>
        </tr>

        <tr class="section-row">
          <td colspan="2"><b>Pengeluaran:</b></td>
        </tr>

        ${
          barisPengeluaran ||
          '<tr class="item-row"><td colspan="2">(tidak ada pengeluaran)</td></tr>'
        }

        <tr class="total-row">
          <td>Total Pengeluaran</td>
          <td class="kanan">−${rupiah(h.totalPengeluaran)}</td>
        </tr>

        <tr class="subtotal-row">
          <td>Uang Sementara</td>
          <td class="kanan">${rupiah(h.tSementara)}</td>
        </tr>

        <tr>
          <td>Omzet</td>
          <td class="kanan">+${rupiah(h.omzet)}</td>
        </tr>

        <tr class="subtotal-row">
          <td>Uang Setelah Omzet</td>
          <td class="kanan">${rupiah(h.tSetelahOmzet)}</td>
        </tr>

        <tr>
          <td>Kembalian</td>
          <td class="kanan">−${rupiah(h.kertas)}</td>
        </tr>

        ${barisTukar}

        <tr class="final-row">
          <td>Uang Hari Ini</td>
          <td class="kanan">${rupiah(h.tFinal)}</td>
        </tr>
      </table>
    </div>

    <!-- HALAMAN 2: FOTO -->
    <div class="halaman-foto">
      <div class="cetak-header">
        <img src="esteh1.png" alt="Logo Toko" class="cetak-logo">
        <h2>Bukti Fisik Uang Hari Ini</h2>
        <div class="sub">${timestamp}</div>
      </div>
      <div class="foto-container">
        <img src="${fotoData}" alt="Bukti Uang" class="foto-cetak">
      </div>
    </div>
  `;
}

// ==== Event ====
function pasangEvent() {
  const mapField = {
    uangTotal: "uangTotal",
    omzet: "omzet",
    kembalianKertas: "kembalianKertas",
    kembalianKoin: "kembalianKoin",
    tukarKertasKoin: "tukarKertasKoin",
  };

  Object.keys(mapField).forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", (e) => {
      state[mapField[id]] = e.target.value;
      updateHitung();
      simpan();
    });
  });

  $("btnTambahPengeluaran").addEventListener("click", () => {
    state.pengeluaran.push({ nama: "", jumlah: "" });
    renderPengeluaran();
    simpan();
  });

  // ==== LOGIKA UPLOAD FOTO ====
  $("inputFoto").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        fotoData = ev.target.result;
        
        // Aktifkan tombol cetak
        const btnCetak = $("btnCetak");
        btnCetak.disabled = false;
        btnCetak.style.opacity = "1";
        btnCetak.style.cursor = "pointer";

        // Tampilkan wadah berisi tombol Preview & Hapus
        $("wrapAksiFoto").style.display = "flex";
      };
      reader.readAsDataURL(file);
    }
  });

  // ==== LOGIKA PREVIEW FOTO ====
  $("btnPreview").addEventListener("click", () => {
    const modal = $("modalFoto");
    const img = $("imgPreview");
    img.src = fotoData;
    modal.style.display = "flex";
  });

  document.querySelector(".close").addEventListener("click", () => {
    $("modalFoto").style.display = "none";
  });

  // Tutup modal jika klik di luar gambar
  $("modalFoto").addEventListener("click", (e) => {
    if (e.target.id === "modalFoto") {
      $("modalFoto").style.display = "none";
    }
  });

  // ==== LOGIKA HAPUS FOTO ====
  $("btnHapusFoto").addEventListener("click", () => {
    if (!confirm("Hapus foto?")) return;

    // 1. Kosongkan data foto & input file
    fotoData = null;
    $("inputFoto").value = "";
    
    // 2. Sembunyikan wadah tombol
    $("wrapAksiFoto").style.display = "none";

    // 3. Kunci kembali tombol cetak
    const btnCetak = $("btnCetak");
    btnCetak.disabled = true;
    btnCetak.style.opacity = "0.5";
    btnCetak.style.cursor = "not-allowed";
  });

  // ==== LOGIKA CETAK ====
  $("btnCetak").addEventListener("click", () => {
    if (!fotoData) return alert("Upload foto uang terlebih dahulu!");

    const judulAsli = document.title;
    const now = new Date();
    const tgl = String(now.getDate()).padStart(2, '0');
    const bln = String(now.getMonth() + 1).padStart(2, '0');
    const thn = now.getFullYear();
    const jam = String(now.getHours()).padStart(2, '0');
    const mnt = String(now.getMinutes()).padStart(2, '0');
    const dtk = String(now.getSeconds()).padStart(2, '0');
    
    document.title = `Laporan Keuangan Es Teh - ${tgl}-${bln}-${thn}_${jam}-${mnt}-${dtk}`;

    bangunLaporanCetak();
    
    setTimeout(() => {
      window.print();
      setTimeout(() => { document.title = judulAsli; }, 500);
    }, 150);
  });

  // ==== RESET ====
  $("btnReset").addEventListener("click", () => {
    if (!confirm("Reset semua data?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = {
      uangTotal: "",
      pengeluaran: [{ nama: "", jumlah: "" }],
      omzet: "",
      kembalianKertas: "",
      kembalianKoin: "",
      tukarKertasKoin: "",
    };
    fotoData = null;
    $("inputFoto").value = "";
    $("wrapAksiFoto").style.display = "none"; // Sembunyikan wadah tombol
    
    const btnCetak = $("btnCetak");
    btnCetak.disabled = true;
    btnCetak.style.opacity = "0.5";
    btnCetak.style.cursor = "not-allowed";

    isiForm();
    renderPengeluaran();
    updateHitung();
  });
}

// ==== Inisialisasi ====
function init() {
  const opsi = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  $("tanggalHariIni").textContent = new Date().toLocaleDateString("id-ID", opsi);

  muat();
  isiForm();
  renderPengeluaran();
  updateHitung();
  pasangEvent();

  matikanScrollAngka();
}

init();

function matikanScrollAngka() {
  const inputAngka = document.querySelectorAll('input[type="number"]');
  
  inputAngka.forEach((input) => {
    // Matikan pergeseran saat mouse digulir (mousepad/mouse)
    input.addEventListener("wheel", (e) => {
      e.preventDefault(); // Mencegah angka berubah
      input.blur();       // Melepas fokus dari input (opsional)
    });
    
    // Cegah panah atas/bawah di keyboard mengubah angka secara tidak sengaja
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
      }
    });
  });
}