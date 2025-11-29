// -------------------- Helper: sonido con WebAudio --------------------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    if (type === "success") {
      o.frequency.value = 880;
      g.gain.value = 0.02;
    } else if (type === "error") {
      o.frequency.value = 200;
      g.gain.value = 0.05;
    } else if (type === "warn") {
      o.frequency.value = 440;
      g.gain.value = 0.03;
    } else {
      o.frequency.value = 660;
      g.gain.value = 0.02;
    }
    o.type = "sine";
    o.start();
    setTimeout(() => {
      o.stop();
    }, 120);
  } catch (e) {
    /* ignore audio errors on restricted devices */
  }
}

// -------------------- Toast mixin --------------------
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 1800,
  timerProgressBar: true,
  // animation classes left to SweetAlert default; slide effect simulated in css
});

// -------------------- Estado y persistencia --------------------
let ingresos = [];
let gastos = [];

function guardarLocal() {
  localStorage.setItem("contapp_ingresos", JSON.stringify(ingresos));
  localStorage.setItem("contapp_gastos", JSON.stringify(gastos));
  Toast.fire({ icon: "success", title: "Guardado local" });
  playSound("success");
}
function cargarLocal() {
  const a = JSON.parse(localStorage.getItem("contapp_ingresos") || "[]");
  const b = JSON.parse(localStorage.getItem("contapp_gastos") || "[]");
  ingresos = a;
  gastos = b;
  renderAll();
  Toast.fire({ icon: "info", title: "Datos cargados" });
  playSound("info");
}

// -------------------- Render tabla Ingresos --------------------
function renderIngresos() {
  const tbody = document.querySelector("#tablaIngresos tbody");
  tbody.innerHTML = "";
  ingresos.forEach((i, idx) => {
    const tr = document.createElement("tr");
    tr.classList.add("fade-in");
    tr.innerHTML = `<td>${i.fecha || ""}</td><td>${
      i.concepto || ""
    }</td><td>$${Number(i.valor).toLocaleString()}</td>
      <td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="confirmEliminarIngreso(${idx})"><i class="bi bi-trash"></i></button></td>`;
    tbody.appendChild(tr);
  });
}

function confirmEliminarIngreso(index) {
  Swal.fire({
    title: "¿Eliminar ingreso?",
    text: "Esta acción eliminará el registro",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
  }).then((r) => {
    if (r.isConfirmed) {
      ingresos.splice(index, 1);
      renderAll();
      Toast.fire({ icon: "info", title: "Ingreso eliminado" });
      playSound("info");
    }
  });
}

// -------------------- Render tabla Gastos --------------------
function renderGastos() {
  const tbody = document.querySelector("#tablaGastos tbody");
  tbody.innerHTML = "";
  gastos.forEach((g, idx) => {
    const tr = document.createElement("tr");
    tr.classList.add("fade-in");
    tr.innerHTML = `<td>${g.fecha || ""}</td><td>${
      g.concepto || ""
    }</td><td>$${Number(g.valor).toLocaleString()}</td>
      <td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="confirmEliminarGasto(${idx})"><i class="bi bi-trash"></i></button></td>`;
    tbody.appendChild(tr);
  });
}

function confirmEliminarGasto(index) {
  Swal.fire({
    title: "¿Eliminar gasto?",
    text: "Esta acción eliminará el registro",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
  }).then((r) => {
    if (r.isConfirmed) {
      gastos.splice(index, 1);
      renderAll();
      Toast.fire({ icon: "info", title: "Gasto eliminado" });
      playSound("info");
    }
  });
}

// -------------------- Formularios --------------------
document.getElementById("formIngresos").addEventListener("submit", (e) => {
  e.preventDefault();
  const fecha = document.getElementById("ingresoFecha").value;
  const concepto = document.getElementById("ingresoConcepto").value.trim();
  const valor = Number(document.getElementById("ingresoValor").value);
  if (!fecha || !concepto || !valor) {
    Toast.fire({ icon: "error", title: "Completa todos los campos" });
    playSound("error");
    return;
  }
  ingresos.push({ fecha, concepto, valor });
  renderAll();
  Toast.fire({ icon: "success", title: "Ingreso agregado" });
  playSound("success");
  e.target.reset();
});

document.getElementById("formGastos").addEventListener("submit", (e) => {
  e.preventDefault();
  const fecha = document.getElementById("gastoFecha").value;
  const concepto = document.getElementById("gastoConcepto").value.trim();
  const valor = Number(document.getElementById("gastoValor").value);
  if (!fecha || !concepto || !valor) {
    Toast.fire({ icon: "error", title: "Completa todos los campos" });
    playSound("error");
    return;
  }
  gastos.push({ fecha, concepto, valor });
  renderAll();
  Toast.fire({ icon: "success", title: "Gasto agregado" });
  playSound("success");
  e.target.reset();
});

// -------------------- Balances / Chart --------------------
let chart = null;
function generarBalance() {
  Swal.fire({
    title: "Procesando balances...",
    html: "<b>Por favor espera</b>",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  setTimeout(() => {
    actualizarBalances();
    Swal.close();
    Swal.fire({
      icon: "success",
      title: "Balances generados",
      text: "Cálculos actualizados",
    });
    playSound("success");
  }, 800);
}

function actualizarBalances() {
  const totalI = ingresos.reduce((s, i) => s + Number(i.valor), 0);
  const totalG = gastos.reduce((s, g) => s + Number(g.valor), 0);
  const net = totalI - totalG;
  document.getElementById("totalIngresos").textContent =
    "$" + totalI.toLocaleString();
  document.getElementById("totalGastos").textContent =
    "$" + totalG.toLocaleString();
  document.getElementById("balanceNeto").textContent =
    "$" + net.toLocaleString();
  renderChart(totalI, totalG);
}

function renderChart(i, g) {
  const ctx = document.getElementById("chartBalances");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "doughnut",
    data: { labels: ["Ingresos", "Gastos"], datasets: [{ data: [i, g] }] },
    options: { plugins: { legend: { position: "bottom" } } },
  });
}

// -------------------- Export CSV / Excel / PDF --------------------
function exportCSV() {
  let rows = [["Tipo", "Fecha", "Concepto", "Valor"]];
  ingresos.forEach((i) => rows.push(["Ingreso", i.fecha, i.concepto, i.valor]));
  gastos.forEach((g) => rows.push(["Gasto", g.fecha, g.concepto, g.valor]));
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "contapp_datos.csv";
  a.click();
  URL.revokeObjectURL(url);
  Toast.fire({ icon: "success", title: "CSV generado" });
  playSound("success");
}

function exportExcel() {
  exportCSV();
}

async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("ContApp - Datos", 14, 18);
  let y = 28;
  doc.setFontSize(10);
  const rows = [];
  ingresos.forEach((i) =>
    rows.push(["Ingreso", i.fecha, i.concepto, String(i.valor)])
  );
  gastos.forEach((g) =>
    rows.push(["Gasto", g.fecha, g.concepto, String(g.valor)])
  );
  rows.forEach((r) => {
    doc.text(r.join(" | "), 14, y);
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });
  doc.save("contapp_datos.pdf");
  Toast.fire({ icon: "success", title: "PDF generado" });
  playSound("success");
}

// -------------------- Util y render completo --------------------
function renderAll() {
  renderIngresos();
  renderGastos();
  actualizarBalances();
}

// -------------------- Botones y acciones --------------------
document.getElementById("btnGenerar").addEventListener("click", generarBalance);
document.getElementById("btnLimpiar").addEventListener("click", () => {
  Swal.fire({
    title: "¿Limpiar todo?",
    text: "Se eliminarán registros en memoria",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Limpiar",
  }).then((r) => {
    if (r.isConfirmed) {
      ingresos = [];
      gastos = [];
      renderAll();
      localStorage.removeItem("contapp_ingresos");
      localStorage.removeItem("contapp_gastos");
      Toast.fire({ icon: "success", title: "Todo limpiado" });
      playSound("info");
    }
  });
});

document.getElementById("btnSaveLocal").addEventListener("click", guardarLocal);
document.getElementById("btnLoadLocal").addEventListener("click", cargarLocal);
document.getElementById("btnExportAll").addEventListener("click", exportCSV);
document.getElementById("exportCSV").addEventListener("click", exportCSV);
document.getElementById("exportExcel").addEventListener("click", exportExcel);
document.getElementById("exportPDF").addEventListener("click", exportPDF);

// Theme toggle
document.getElementById("toggleTheme").addEventListener("click", () => {
  const el = document.body;
  if (el.getAttribute("data-theme") === "dark") {
    el.setAttribute("data-theme", "light");
    localStorage.setItem("contapp_theme", "light");
  } else {
    el.setAttribute("data-theme", "dark");
    localStorage.setItem("contapp_theme", "dark");
  }
});

// restore theme if saved
(function () {
  const t = localStorage.getItem("contapp_theme");
  if (t) document.body.setAttribute("data-theme", t);
})();

// onload load local if exists
window.addEventListener("DOMContentLoaded", () => {
  cargarLocal();
});
