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
      .catch((err) => {
        console.error("Login error:", err.response?.data);
        showToast("Invalid credentials", "error");
      });
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

    if (!name || isNaN(quantity) || isNaN(price)) {
      showToast("Invalid input", "error");
      return;
    }

    axios
      .post(
        `${API}/products/add/`,
        { name, quantity: +quantity, price: +price },
        authHeaders()
      )
      .then(() => {
        showToast("Product added successfully");
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
        showToast("Product updated successfully");
        setIsModalOpen(false);
        fetchProducts();
      });
  };

  const deleteProduct = (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    axios
      .post(`${API}/products/delete/${id}/`, {}, authHeaders())
      .then(() => {
        showToast("Product deleted successfully");
        fetchProducts();
      });
  };

  /* ================= MODERN LOGIN UI ================= */
  if (!isLoggedIn) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h2 style={styles.loginTitle}>Welcome Back</h2>
          <p style={styles.loginSubtitle}>
            Sign in to manage your inventory dashboard
          </p>

          <input
            placeholder="Username"
            style={styles.loginInput}
            onChange={(e) =>
              setLoginForm({ ...loginForm, username: e.target.value })
            }
            onFocus={(e) => e.target.style = {...styles.loginInput, ...styles.loginInputFocus}}
            onBlur={(e) => e.target.style = styles.loginInput}
          />

          <input
            type="password"
            placeholder="Password"
            style={styles.loginInput}
            onChange={(e) =>
              setLoginForm({ ...loginForm, password: e.target.value })
            }
            onFocus={(e) => e.target.style = {...styles.loginInput, ...styles.loginInputFocus}}
            onBlur={(e) => e.target.style = styles.loginInput}
          />

          <button 
            style={styles.loginBtn}
            onClick={handleLogin}
            onMouseOver={(e) => e.target.style.opacity = "0.9"}
            onMouseOut={(e) => e.target.style.opacity = "1"}
          >
            Sign In
          </button>
        </div>

        <div style={styles.toastContainer}>
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                ...styles.toast,
                ...(t.type === "error" ? styles.toastError : styles.toastSuccess)
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ================= MODERN MAIN UI ================= */
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📦 Inventory Dashboard</h1>
        <button 
          onClick={logout} 
          style={styles.logoutBtn}
          onMouseOver={(e) => {
            e.target.style.background = "#667eea";
            e.target.style.color = "#fff";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "transparent";
            e.target.style.color = "#667eea";
          }}
        >
          Logout
        </button>
      </div>

      <div style={styles.addSection}>
        <div style={styles.addTitle}>
          <span>➕</span> Add New Product
        </div>
        <div style={styles.addRow}>
          <input id="name" placeholder="Product Name" style={styles.input} />
          <input id="quantity" type="number" placeholder="Quantity" style={styles.inputSmall} />
          <input id="price" type="number" placeholder="Price ($)" style={styles.inputSmall} />
          <button 
            onClick={addProduct} 
            style={styles.primaryBtn}
            onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
            onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
          >
            <span>+</span> Add Product
          </button>
        </div>
      </div>

      <div style={styles.searchContainer}>
        <div style={styles.searchIcon}>🔍</div>
        <input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />
      </div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.theadRow}>
            <th style={styles.th} onClick={() => {
              setSortField("name");
              setSortOrder(sortField === "name" && sortOrder === "asc" ? "desc" : "asc");
            }}>
              Product Name {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
            </th>

            <th style={styles.th} onClick={() => {
              setSortField("quantity");
              setSortOrder(sortField === "quantity" && sortOrder === "asc" ? "desc" : "asc");
            }}>
              Quantity {sortField === "quantity" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
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
              style={{ 
                cursor: "pointer", 
                background: activeRow === p.id ? "#f0f7ff" : "white",
                ...styles.trHover
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f8f9fa"}
              onMouseOut={(e) => e.currentTarget.style.background = activeRow === p.id ? "#f0f7ff" : "white"}
            >
              <td style={styles.td}>
                <div style={{ fontWeight: "500" }}>{p.name}</div>
                {activeRow === p.id && (
                  <div style={styles.actionButtons}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(p);
                        setEditForm(p);
                        setIsModalOpen(true);
                      }}
                      style={styles.editBtn}
                      onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                      onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProduct(p.id);
                      }}
                      style={styles.deleteBtn}
                      onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                      onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </td>
              <td style={styles.td}>
                <span style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: p.quantity < 10 ? "#fee2e2" : "#dcfce7",
                  color: p.quantity < 10 ? "#991b1b" : "#166534",
                  fontSize: "13px",
                  fontWeight: "500"
                }}>
                  {p.quantity} units
                </span>
              </td>
              <td style={styles.td}>
                <span style={{
                  fontWeight: "600",
                  color: "#1a1a1a"
                }}>
                  ${parseFloat(p.price).toFixed(2)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Edit Product</h3>
            <input 
              value={editForm.name} 
              onChange={(e)=>setEditForm({...editForm,name:e.target.value})} 
              placeholder="Product Name"
              style={{...styles.input, marginBottom: "16px"}}
            />
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
              <input 
                value={editForm.quantity} 
                onChange={(e)=>setEditForm({...editForm,quantity:e.target.value})} 
                placeholder="Quantity"
                style={styles.inputSmall}
              />
              <input 
                value={editForm.price} 
                onChange={(e)=>setEditForm({...editForm,price:e.target.value})} 
                placeholder="Price"
                style={styles.inputSmall}
              />
            </div>
            <div style={styles.modalActions}>
              <button 
                onClick={submitEdit} 
                style={styles.primaryBtn}
                onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
              >
                💾 Save Changes
              </button>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={styles.logoutBtn}
                onMouseOver={(e) => {
                  e.target.style.background = "#667eea";
                  e.target.style.color = "#fff";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.color = "#667eea";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.toastContainer}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...styles.toast,
              ...(t.type === "error" ? styles.toastError : styles.toastSuccess)
            }}
          >
            {t.type === "success" ? "✅" : "❌"} {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= MODERN STYLES ================= */
const styles = {
  /* ========== LOGIN PAGE ========== */
  loginPage: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  
  loginCard: {
    width: "100%",
    maxWidth: "420px",
    padding: "40px 32px",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
    textAlign: "center",
    border: "1px solid rgba(255, 255, 255, 0.2)"
  },
  
  loginTitle: {
    marginBottom: "8px",
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a1a1a",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  
  loginSubtitle: {
    color: "#666",
    marginBottom: "32px",
    fontSize: "14px",
    fontWeight: "400"
  },
  
  loginInput: {
    width: "100%",
    padding: "16px 20px",
    marginBottom: "20px",
    borderRadius: "12px",
    border: "2px solid #e1e5e9",
    fontSize: "15px",
    transition: "all 0.3s ease",
    boxSizing: "border-box"
  },
  
  loginInputFocus: {
    borderColor: "#667eea",
    boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)"
  },
  
  loginBtn: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginTop: "10px"
  },
  
  /* ========== MAIN APP ========== */
  container: {
    maxWidth: "1200px",
    margin: "40px auto",
    padding: "32px",
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    paddingBottom: "20px",
    borderBottom: "2px solid #f0f2f5"
  },
  
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a1a1a",
    margin: "0"
  },
  
  logoutBtn: {
    background: "transparent",
    color: "#667eea",
    padding: "10px 20px",
    borderRadius: "10px",
    border: "2px solid #667eea",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease"
  },
  
  addSection: {
    background: "#f8f9fa",
    padding: "24px",
    borderRadius: "16px",
    marginBottom: "32px",
    border: "1px solid #e1e5e9"
  },
  
  addTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  
  addRow: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    flexWrap: "wrap"
  },
  
  input: {
    padding: "14px 16px",
    borderRadius: "10px",
    border: "2px solid #e1e5e9",
    fontSize: "14px",
    flex: "1",
    minWidth: "180px",
    transition: "all 0.3s ease"
  },
  
  inputSmall: {
    padding: "14px 16px",
    borderRadius: "10px",
    border: "2px solid #e1e5e9",
    fontSize: "14px",
    width: "120px",
    transition: "all 0.3s ease"
  },
  
  primaryBtn: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    padding: "14px 28px",
    borderRadius: "10px",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  
  /* ========== SEARCH ========== */
  searchContainer: {
    marginBottom: "32px",
    position: "relative"
  },
  
  search: {
    padding: "16px 20px 16px 48px",
    width: "100%",
    borderRadius: "12px",
    border: "2px solid #e1e5e9",
    fontSize: "15px",
    background: "#f8f9fa",
    transition: "all 0.3s ease"
  },
  
  searchIcon: {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#666"
  },
  
  /* ========== TABLE ========== */
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)"
  },
  
  theadRow: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  
  th: {
    padding: "20px 16px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    textAlign: "left",
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.3s ease",
    borderRight: "1px solid rgba(255, 255, 255, 0.1)"
  },
  
  td: {
    padding: "20px 16px",
    borderBottom: "1px solid #f0f2f5",
    fontSize: "14px",
    color: "#333",
    transition: "all 0.3s ease"
  },
  
  trHover: {
    transition: "all 0.3s ease"
  },
  
  actionButtons: {
    display: "flex",
    gap: "8px",
    marginTop: "8px"
  },
  
  editBtn: {
    background: "#10b981",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s ease"
  },
  
  deleteBtn: {
    background: "#ef4444",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s ease"
  },
  
  /* ========== MODAL ========== */
  modalOverlay: {
    position: "fixed",
    inset: "0",
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(5px)",
    zIndex: "1000"
  },
  
  modal: {
    background: "#fff",
    padding: "32px",
    borderRadius: "20px",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)",
    maxWidth: "500px",
    width: "90%",
    border: "1px solid rgba(255, 255, 255, 0.2)"
  },
  
  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "24px",
    color: "#1a1a1a"
  },
  
  modalActions: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
    justifyContent: "flex-end"
  },
  
  /* ========== TOAST ========== */
  toastContainer: {
    position: "fixed",
    top: "24px",
    right: "24px",
    zIndex: "9999"
  },
  
  toast: {
    color: "#fff",
    padding: "16px 20px",
    borderRadius: "12px",
    marginBottom: "12px",
    fontSize: "14px",
    fontWeight: "500",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    minWidth: "280px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    animation: "slideIn 0.3s ease"
  },
  
  toastSuccess: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    borderLeft: "4px solid #047857"
  },
  
  toastError: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    borderLeft: "4px solid #b91c1c"
  }
};

// Add CSS animation
if (typeof window !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  if (styleSheet) {
    styleSheet.insertRule(`
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `, styleSheet.cssRules.length);
  }
}

export default App;