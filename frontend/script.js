const API = "https://ferreteria-jmk-production.up.railway.app";

/* ================= VARIABLES ================= */
const productosDiv = document.getElementById("productos");
const bestSlider = document.getElementById("best-slider");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const cartCount = document.getElementById("cart-count");
const searchInput = document.getElementById("search");
const brandFilter = document.getElementById("brand-filter");

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout");
const navActions = document.getElementById("nav-actions");

const cartPanel = document.getElementById("cart-panel");
const openCartBtn = document.getElementById("open-cart");
const closeCartBtn = document.getElementById("close-cart");
const payBtn = document.getElementById("pay-btn");

let carrito = [];
let productos = [];

/* ================= TOKEN ================= */
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

/* ================= OBTENER ROL ================= */
function obtenerRol() {
  try {
    return JSON.parse(atob(token.split(".")[1])).rol;
  } catch {
    return null;
  }
}

const rol = obtenerRol();

/* ================= AUTH UI ================= */
if (token) {
  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "inline-block";
}

/* ================= BOTÓN ADMIN ================= */
if (rol === "admin" && navActions) {
  const adminBtn = document.createElement("button");
  adminBtn.textContent = "Admin";
  adminBtn.className = "btn primary";
  adminBtn.style.marginLeft = "10px";
  adminBtn.onclick = () => window.location.href = "admin.html";
  navActions.appendChild(adminBtn);
}

/* ================= LOGOUT ================= */
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });
}

/* ================= OBTENER PRODUCTOS ================= */
fetch(API + "/productos", {
  headers: {
    "Authorization": "Bearer " + token
  }
})
.then(res => {
  if (!res.ok) {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  }
  return res.json();
})
.then(data => {
  productos = data;
  initProductos();
})
.catch(() => window.location.href = "login.html");

/* ================= INICIALIZAR ================= */
function initProductos() {
  render(productos);

  const marcas = [...new Set(productos.map(p => p.marca))];
  marcas.forEach(m => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    brandFilter.appendChild(option);
  });

  productos.filter(p => p.vendido).forEach(p => {
    bestSlider.innerHTML += `
      <div class="card">
        <img src="${API}${p.imagen}" loading="lazy">
        <h3>${p.nombre}</h3>
        <p>$${p.precio}</p>
      </div>
    `;
  });
}

/* ================= RENDER ================= */
function render(lista) {
  productosDiv.innerHTML = "";

  lista.forEach(p => {
    productosDiv.innerHTML += `
      <div class="card">
        <img src="${API}${p.imagen}" 
             alt="${p.nombre}" 
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/200?text=Sin+Imagen'">
        <h3>${p.nombre}</h3>
        <small>${p.marca}</small>
        <p>$${p.precio}</p>
        <button class="btn primary" onclick="addCart(${p.id})">
          Agregar
        </button>
      </div>
    `;
  });
}

/* ================= FILTROS ================= */
function filtrar() {
  const texto = searchInput.value.toLowerCase();
  const marca = brandFilter.value;

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(texto) &&
    (marca === "all" || p.marca === marca)
  );

  render(filtrados);
}

if (searchInput) searchInput.oninput = filtrar;
if (brandFilter) brandFilter.onchange = filtrar;

/* ================= CARRITO ================= */
if (openCartBtn) {
  openCartBtn.addEventListener("click", () => {
    cartPanel.classList.add("open");
  });
}

if (closeCartBtn) {
  closeCartBtn.addEventListener("click", () => {
    cartPanel.classList.remove("open");
  });
}

function addCart(id) {
  const producto = productos.find(p => p.id === id);
  const item = carrito.find(i => i.id === id);

  if (item) item.qty++;
  else carrito.push({ ...producto, qty: 1 });

  updateCart();
  cartPanel.classList.add("open");
}

function updateCart() {
  cartItems.innerHTML = "";
  let total = 0;
  let count = 0;

  carrito.forEach(item => {
    total += item.precio * item.qty;
    count += item.qty;

    cartItems.innerHTML += `
      <li>
        ${item.nombre} x${item.qty}
        <button onclick="changeQty(${item.id}, -1)">➖</button>
        <button onclick="changeQty(${item.id}, 1)">➕</button>
      </li>
    `;
  });

  cartTotal.textContent = "$" + total;
  cartCount.textContent = count;
}

function changeQty(id, delta) {
  const item = carrito.find(i => i.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    carrito = carrito.filter(i => i.id !== id);
  }

  updateCart();
}

/* ================= PAGO ================= */
if (payBtn) {
  payBtn.addEventListener("click", () => {
    if (carrito.length === 0) {
      alert("El carrito está vacío");
      return;
    }
    window.location.href = "payment.html";
  });
}