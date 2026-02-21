const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const db = require("./db");

const app = express();
const SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

/* ================= SUBIDA DE IMÁGENES ================= */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });
app.use("/uploads", express.static("uploads"));

/* ================= TOKEN ================= */
function verificarToken(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ mensaje: "Token requerido" });

  const token = header.split(" ")[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ mensaje: "Token inválido" });
    req.user = decoded;
    next();
  });
}

function soloAdmin(req, res, next) {
  if (req.user.rol !== "admin") {
    return res.status(403).json({ mensaje: "Solo admin" });
  }
  next();
}

/* ================= LOGIN ================= */
app.post("/login", (req, res) => {
  const { usuario, password } = req.body;

  db.query("SELECT * FROM usuarios WHERE usuario=?", [usuario], async (err, result) => {
    if (result.length === 0)
      return res.status(401).json({ mensaje: "Usuario no existe" });

    const user = result[0];
    const ok = await bcrypt.compare(password, user.password);

    if (!ok)
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, rol: user.rol },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  });
});

/* ================= PRODUCTOS ================= */
app.get("/productos", verificarToken, (req, res) => {
  db.query("SELECT * FROM productos", (err, results) => {
    res.json(results);
  });
});

/* CREAR */
app.post("/productos", verificarToken, soloAdmin, upload.single("imagen"), (req, res) => {
  const { nombre, precio, stock, marca } = req.body;
  const imagen = "/uploads/" + req.file.filename;

  db.query(
    "INSERT INTO productos (nombre,precio,stock,marca,imagen) VALUES (?,?,?,?,?)",
    [nombre, precio, stock, marca, imagen],
    () => res.json({ mensaje: "Producto agregado" })
  );
});

/* EDITAR */
app.put("/productos/:id", verificarToken, soloAdmin, upload.single("imagen"), (req, res) => {
  const { nombre, precio, stock, marca } = req.body;
  const id = req.params.id;

  if (req.file) {
    const imagen = "/uploads/" + req.file.filename;

    db.query(
      "UPDATE productos SET nombre=?, precio=?, stock=?, marca=?, imagen=? WHERE id=?",
      [nombre, precio, stock, marca, imagen, id],
      () => res.json({ mensaje: "Actualizado con imagen" })
    );
  } else {
    db.query(
      "UPDATE productos SET nombre=?, precio=?, stock=?, marca=? WHERE id=?",
      [nombre, precio, stock, marca, id],
      () => res.json({ mensaje: "Actualizado" })
    );
  }
});

/* ELIMINAR */
app.delete("/productos/:id", verificarToken, soloAdmin, (req, res) => {
  db.query("DELETE FROM productos WHERE id=?", [req.params.id], () => {
    res.json({ mensaje: "Eliminado" });
  });
});

/* ================= PRODUCTOS PUBLICOS ================= */
app.get("/productos-publicos", (req, res) => {
  db.query("SELECT * FROM railway.productos", (err, results) => {
    if (err) {
      console.error("ERROR SQL:", err);
      return res.status(500).json({ 
        mensaje: "Error al obtener productos",
        error: err.message
      });
    }
    res.json(results);
  });
});
/* ================= SERVER ================= */
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Backend corriendo");
});