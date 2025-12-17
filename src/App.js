import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const AUTH_API = `${API}/auth/login/`;

function App() {
  /* ================= DEBUG: ENVIRONMENT CHECK ================= */
  useEffect(() => {
    console.log("🔍 Environment Check:");
    console.log("Raw API URL:", process.env.REACT_APP_API_URL);
    console.log("API constant:", API);
    console.log("Products endpoint:", `${API}/products/`);
    console.log("Auth endpoint:", AUTH_API);
    console.log("Node environment:", process.env.NODE_ENV);
  }, []);
  
  /* ================= TOAST ================= */
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success", duration = 3000) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, duration);
  };

  /* ================= AUTH ================= */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  const authHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access")}`,
      "Content-Type": "application/json",
    },
  });

  const handleLogin = () => {
    if (!loginForm.username || !loginForm.password) {
      showToast("Username & password required", "error");
      return;
    }

    axios
      .post(AUTH_API, loginForm)
      .then((res) => {
        localStorage.setItem("access", res.data.access);
        localStorage.setItem("refresh", res.data.refresh);
        setIsLoggedIn(true);
        showToast("Login successful");
        fetchProducts();
      })
      .catch(() => showToast("Invalid credentials", "error"));
  };

  const logout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setProducts([]);
  };

  /* ================= DATA ================= */
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [activeRow, setActiveRow] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", quantity: "", price: "" });

  /* ================= SORT ================= */
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const sortProducts = (list) => {
    return [...list].sort((a, b) => {
      let A = a[sortField];
      let B = b[sortField];

      if (typeof A === "string") {
        A = A.toLowerCase();
        B = B.toLowerCase();
      }

      if (A < B) return sortOrder === "asc" ? -1 : 1;
      if (A > B) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  };

  /* ================= INIT ================= */
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (token) {
      setIsLoggedIn(true);
      fetchProducts();
    }
  }, []);

  /* ================= API ================= */
  const fetchProducts = () => {
    axios
      .get(`${API}/products/`, authHeaders())
      .then((res) => setProducts(res.data.products || []))
      .catch(() => {
        showToast("Session expired. Login again.", "error");
        logout();
      });
  };

  const addProduct = () => {
    const name = document.getElementById("name").value.trim();
    const quantity = document.getElementById("quantity").value;
    const price = document.getElementById("price").value;

    if (!name || isNaN(quantity) || isNaN(price))
      return showToast("Invalid input", "error");

    axios
      .post(
        `${API}/products/add/`,
        { name, quantity: +quantity, price: +price },
        authHeaders()
      )
      .then(() => {
        showToast("Product added");
        document.getElementById("name").value = "";
        document.getElementById("quantity").value = "";
        document.getElementById("price").value = "";
        fetchProducts();
      });
  };

  const submitEdit = () => {
    axios
      .post(
        `${API}/products/edit/${editingProduct.id}/`,
        {
          name: editForm.name,
          quantity: +editForm.quantity,
          price: +editForm.price,
        },
        authHeaders()
      )
      .then(() => {
        showToast("Product updated");
        setIsModalOpen(false);
        fetchProducts();
      });
  };

  const deleteProduct = (id) => {
    if (!window.confirm("Delete product?")) return;
    axios
      .post(`${API}/products/delete/${id}/`, {}, authHeaders())
      .then(() => {
        showToast("Product deleted");
        fetchProducts();
      });
  };

  /* ================= LOGIN UI (CLEANED) ================= */
  if (!isLoggedIn) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h2 style={{ marginBottom: 5 }}>Welcome Back</h2>
          <p style={{ color: "#666", marginBottom: 20 }}>
            Login to manage your inventory
          </p>

          <input
            placeholder="Username"
            style={styles.loginInput}
            onChange={(e) =>
              setLoginForm({ ...loginForm, username: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="Password"
            style={styles.loginInput}
            onChange={(e) =>
              setLoginForm({ ...loginForm, password: e.target.value })
            }
          />

          <button style={styles.loginBtn} onClick={handleLogin}>
            Login
          </button>
        </div>

        <div style={styles.toastContainer}>
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                ...styles.toast,
                background: t.type === "error" ? "#d9534f" : "#1d9a6c",
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ================= MAIN UI ================= */
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Inventory Management</h1>
      <button onClick={logout} style={styles.ghostBtn}>Logout</button>

      <div style={styles.addRow}>
        <input id="name" placeholder="Name" style={styles.input} />
        <input id="quantity" type="number" placeholder="Qty" style={styles.inputSmall} />
        <input id="price" type="number" placeholder="Price" style={styles.inputSmall} />
        <button onClick={addProduct} style={styles.primaryBtn}>Add</button>
      </div>

      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      <table style={styles.table}>
        <thead>
          <tr style={styles.theadRow}>
            <th style={styles.th} onClick={() => {
              setSortField("name");
              setSortOrder(sortField === "name" && sortOrder === "asc" ? "desc" : "asc");
            }}>
              Name {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
            </th>

            <th style={styles.th} onClick={() => {
              setSortField("quantity");
              setSortOrder(sortField === "quantity" && sortOrder === "asc" ? "desc" : "asc");
            }}>
              Qty {sortField === "quantity" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
            </th>

            <th style={styles.th} onClick={() => {
              setSortField("price");
              setSortOrder(sortField === "price" && sortOrder === "asc" ? "desc" : "asc");
            }}>
              Price {sortField === "price" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
            </th>
          </tr>
        </thead>

        <tbody>
          {sortProducts(
            products.filter((p) =>
              p.name.toLowerCase().includes(search.toLowerCase())
            )
          ).map((p) => (
            <tr
              key={p.id}
              onClick={() => setActiveRow(activeRow === p.id ? null : p.id)}
              style={{ cursor: "pointer", background: activeRow === p.id ? "#eef6ff" : "white" }}
            >
              <td style={styles.td}>
                {p.name}
                {activeRow === p.id && (
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(p);
                        setEditForm(p);
                        setIsModalOpen(true);
                      }}
                      style={styles.editBtn}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProduct(p.id);
                      }}
                      style={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
              <td style={styles.td}>{p.quantity}</td>
              <td style={styles.td}>{p.price}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <input value={editForm.name} onChange={(e)=>setEditForm({...editForm,name:e.target.value})} style={styles.input}/>
            <input value={editForm.quantity} onChange={(e)=>setEditForm({...editForm,quantity:e.target.value})} style={styles.inputSmall}/>
            <input value={editForm.price} onChange={(e)=>setEditForm({...editForm,price:e.target.value})} style={styles.inputSmall}/>
            <div style={{ marginTop: 10 }}>
              <button onClick={submitEdit} style={styles.primaryBtn}>Save</button>
              <button onClick={() => setIsModalOpen(false)} style={styles.ghostBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  /* login */
  loginPage:{height:"100vh",display:"flex",justifyContent:"center",alignItems:"center",background:"#f4f6f8"},
  loginCard:{width:360,padding:30,background:"#fff",borderRadius:12,boxShadow:"0 10px 30px rgba(0,0,0,.1)",textAlign:"center"},
  loginInput:{width:"100%",padding:12,marginBottom:15,borderRadius:8,border:"1px solid #ddd"},
  loginBtn:{width:"100%",padding:12,background:"#007bff",color:"#fff",border:"none",borderRadius:8,fontSize:16},

  /* app */
  container:{maxWidth:980,margin:"40px auto",padding:20,background:"#fff",borderRadius:10},
  title:{textAlign:"center"},
  addRow:{display:"flex",gap:10,justifyContent:"center"},
  input:{padding:10,borderRadius:6,border:"1px solid #ddd"},
  inputSmall:{padding:10,borderRadius:6,border:"1px solid #ddd",width:120},
  primaryBtn:{background:"#007bff",color:"#fff",padding:"8px 14px",borderRadius:6,border:"none"},
  ghostBtn:{background:"#f5f5f5",padding:"6px 10px",border:"1px solid #ddd",marginLeft:6},
  editBtn:{background:"#28a745",color:"#fff",marginRight:6},
  deleteBtn:{background:"#dc3545",color:"#fff"},
  search:{padding:10,width:"60%",margin:"10px auto",display:"block"},
  table:{width:"100%",borderCollapse:"collapse"},
  theadRow:{background:"#007bff",color:"#fff"},
  th:{padding:12,cursor:"pointer"},
  td:{padding:12,border:"1px solid #eee"},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",justifyContent:"center",alignItems:"center"},
  modal:{background:"#fff",padding:20,borderRadius:8},
  toastContainer:{position:"fixed",top:20,right:20},
  toast:{color:"#fff",padding:10,borderRadius:6,marginBottom:6}
};

export default App;