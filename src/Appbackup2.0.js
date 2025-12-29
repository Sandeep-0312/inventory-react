import React, { useState, useEffect } from "react";
import axios from "axios";

// Configure axios for your Django backend
const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
const axiosInstance = axios.create({
  baseURL: API,
});

// Add token to requests if exists
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  /* ================= STATE ================= */
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState("products");
  
  // Products state
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState({
    name: "",
    quantity: "",
    price: ""
  });
  const [search, setSearch] = useState("");
  
  // Purchases state
  const [purchases, setPurchases] = useState([]);
  const [purchaseForm, setPurchaseForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_mobile: "",
    customer_address: "",
    product_id: "",
    quantity: 1,
    notes: ""
  });
  
  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  /* ================= TOAST SYSTEM ================= */
  const showToast = (message, type = "success", duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  /* ================= AUTH FUNCTIONS ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axiosInstance.get("/api/auth/me/");
      setUser(response.data);
      
      if (response.data.role === "admin") {
        fetchProducts();
        fetchPurchases();
      } else {
        fetchProducts();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username, password) => {
    try {
      setLoading(true);
      const response = await axiosInstance.post("/api/auth/login/", {
        username,
        password,
      });

      const { access, user: userData } = response.data;
      localStorage.setItem("token", access);
      setUser(userData);
      
      showToast(`Welcome ${userData.username}! (${userData.role})`);
      
      if (userData.role === "admin") {
        await fetchProducts();
        await fetchPurchases();
      } else {
        await fetchProducts();
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || "Login failed";
      showToast(message, "error");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (username, email, password) => {
    try {
      setLoading(true);
      
      // Register the user
      const registerResponse = await axiosInstance.post("/api/auth/register/", {
        username,
        email,
        password,
        role: "customer" // Automatically set as customer
      });

      console.log("Registration successful:", registerResponse.data);
      
      // Automatically log them in after registration
      const loginResponse = await axiosInstance.post("/api/auth/login/", {
        username,
        password,
      });

      const { access, user: userData } = loginResponse.data;
      localStorage.setItem("token", access);
      setUser(userData);
      
      showToast(`Welcome ${userData.username}! Your account has been created.`);
      
      // Fetch products for the new customer
      await fetchProducts();
      
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      const message = error.response?.data?.error || 
                     error.response?.data?.username?.[0] || 
                     error.response?.data?.email?.[0] ||
                     "Registration failed";
      showToast(message, "error");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setProducts([]);
    setPurchases([]);
    showToast("Logged out successfully");
  };

  /* ================= PRODUCT FUNCTIONS ================= */
  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get("/api/products/");
      setProducts(response.data.products || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const createProduct = async () => {
    if (!productForm.name || !productForm.quantity || !productForm.price) {
      showToast("Please fill all fields", "error");
      return;
    }

    try {
      await axiosInstance.post("/api/products/add/", {
        name: productForm.name,
        quantity: parseInt(productForm.quantity),
        price: parseFloat(productForm.price),
      });

      showToast("Product added successfully");
      setProductForm({ name: "", quantity: "", price: "" });
      fetchProducts();
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to add product", "error");
    }
  };

  const updateProduct = async () => {
    if (!editingProduct) return;

    try {
      await axiosInstance.post(`/api/products/edit/${editingProduct.id}/`, {
        name: productForm.name,
        quantity: parseInt(productForm.quantity),
        price: parseFloat(productForm.price),
      });

      showToast("Product updated successfully");
      setShowProductModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to update product", "error");
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await axiosInstance.post(`/api/products/delete/${id}/`, {});
      showToast("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to delete product", "error");
    }
  };

  /* ================= PURCHASE FUNCTIONS ================= */
  const fetchPurchases = async () => {
    try {
      const response = await axiosInstance.get("/api/purchases/");
      setPurchases(response.data.purchases || []);
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
    }
  };

  const createPurchase = async () => {
    const requiredFields = [
      "customer_name",
      "customer_email",
      "customer_mobile",
      "customer_address",
      "product_id",
      "quantity"
    ];

    for (const field of requiredFields) {
      if (!purchaseForm[field]) {
        showToast(`Please fill ${field.replace("_", " ")}`, "error");
        return;
      }
    }

    try {
      // LOG THE REQUEST
      console.log("=== PURCHASE REQUEST DEBUG ===");
      console.log("Endpoint:", "/api/purchases/create/");
      console.log("Payload:", JSON.stringify(purchaseForm, null, 2));
      console.log("Product ID type:", typeof purchaseForm.product_id);
      console.log("Quantity type:", typeof purchaseForm.quantity);
      console.log("=======================");
      
      const response = await axiosInstance.post("/api/purchases/create/", purchaseForm);
      
      console.log("=== PURCHASE RESPONSE ===");
      console.log("Response:", response.data);
      console.log("=======================");
      
      showToast("Purchase completed successfully!");
      setPurchaseForm({
        customer_name: "",
        customer_email: "",
        customer_mobile: "",
        customer_address: "",
        product_id: "",
        quantity: 1,
        notes: ""
      });
      setShowPurchaseModal(false);
      
      // Refresh data
      fetchProducts();
      if (user?.role === "admin") {
        fetchPurchases();
      }
    } catch (error) {
      console.error("=== PURCHASE ERROR ===");
      console.error("Full error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("=======================");
      
      showToast(error.response?.data?.error || "Purchase failed", "error");
    }
  };

  /* ================= STATUS UPDATE FUNCTION ================= */
  const updatePurchaseStatus = async (purchaseId, newStatus) => {
    try {
      console.log(`Updating purchase ${purchaseId} to status: ${newStatus}`);
      
      const response = await axiosInstance.put(`/api/purchases/update-status/${purchaseId}/`, {
        status: newStatus
      });
      
      console.log("Status update response:", response.data);
      showToast(`Order #${purchaseId} status updated to ${newStatus}`);
      
      // Refresh purchases list
      fetchPurchases();
      
      return { success: true };
    } catch (error) {
      console.error("Status update error:", error);
      showToast(error.response?.data?.error || "Failed to update status", "error");
      return { success: false };
    }
  };

  /* ================= COMPONENT RENDER ================= */
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} toasts={toasts} />;
  }

  if (user.role === "admin") {
    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
        products={products}
        purchases={purchases}
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        productForm={productForm}
        setProductForm={setProductForm}
        onCreateProduct={createProduct}
        onEditProduct={(product) => {
          setEditingProduct(product);
          setProductForm(product);
          setShowProductModal(true);
        }}
        onDeleteProduct={deleteProduct}
        onUpdateProduct={updateProduct}
        onUpdatePurchaseStatus={updatePurchaseStatus}
        showProductModal={showProductModal}
        setShowProductModal={setShowProductModal}
        editingProduct={editingProduct}
        toasts={toasts}
      />
    );
  }

  return (
    <CustomerDashboard
      user={user}
      onLogout={handleLogout}
      products={products}
      search={search}
      setSearch={setSearch}
      purchaseForm={purchaseForm}
      setPurchaseForm={setPurchaseForm}
      showPurchaseModal={showPurchaseModal}
      setShowPurchaseModal={setShowPurchaseModal}
      onCreatePurchase={createPurchase}
      toasts={toasts}
    />
  );
}

/* ================= LOGIN COMPONENT ================= */
function LoginScreen({ onLogin, onRegister, toasts }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [form, setForm] = useState({ 
    username: "", 
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLoginMode) {
      // Login
      setIsLoading(true);
      const result = await onLogin(form.username, form.password);
      if (!result.success) {
        setIsLoading(false);
      }
    } else {
      // Register
      if (form.password !== form.confirmPassword) {
        alert("Passwords don't match!");
        return;
      }
      
      if (form.password.length < 6) {
        alert("Password must be at least 6 characters!");
        return;
      }
      
      setIsLoading(true);
      const result = await onRegister(form.username, form.email, form.password);
      if (!result.success) {
        setIsLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setForm({ username: "", email: "", password: "", confirmPassword: "" });
  };

  return (
    <div style={styles.loginPage}>
      <div style={styles.loginCard}>
        <h2 style={styles.loginTitle}>
          {isLoginMode ? "Welcome Back" : "Create Account"}
        </h2>
        <p style={styles.loginSubtitle}>
          {isLoginMode ? "Sign in to your account" : "Sign up as a customer"}
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            style={styles.loginInput}
            required
          />
          
          {!isLoginMode && (
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={styles.loginInput}
              required
            />
          )}
          
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={styles.loginInput}
            required
          />
          
          {!isLoginMode && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              style={styles.loginInput}
              required
            />
          )}
          
          <button 
            type="submit" 
            style={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading 
              ? (isLoginMode ? "Signing in..." : "Creating account...") 
              : (isLoginMode ? "Sign In" : "Create Account")
            }
          </button>
        </form>

        <div style={styles.toggleModeContainer}>
          <p style={styles.toggleModeText}>
            {isLoginMode ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button 
            type="button"
            onClick={toggleMode} 
            style={styles.toggleModeButton}
          >
            {isLoginMode ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ================= ADMIN DASHBOARD COMPONENT ================= */
function AdminDashboard({
  user,
  onLogout,
  products,
  purchases,
  search,
  setSearch,
  activeTab,
  setActiveTab,
  productForm,
  setProductForm,
  onCreateProduct,
  onEditProduct,
  onDeleteProduct,
  onUpdateProduct,
  onUpdatePurchaseStatus,
  showProductModal,
  setShowProductModal,
  editingProduct,
  toasts,
}) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalPurchases: 0,
    totalRevenue: 0,
    lowStock: 0,
  });

  // State for customer details modal
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    calculateStats();
  }, [products, purchases]);

  const calculateStats = () => {
    const totalProducts = products.length;
    const totalPurchases = purchases.length;
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.total_price || 0), 0);
    const lowStock = products.filter(p => p.quantity < 10).length;

    setStats({ totalProducts, totalPurchases, totalRevenue, lowStock });
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Helper function for status colors
  const getStatusStyle = (status) => {
    switch(status) {
      case 'pending': return { background: '#fef3c7', color: '#92400e' };
      case 'confirmed': return { background: '#dbeafe', color: '#1e40af' };
      case 'shipped': return { background: '#e0e7ff', color: '#3730a3' };
      case 'delivered': return { background: '#dcfce7', color: '#166534' };
      case 'cancelled': return { background: '#fee2e2', color: '#991b1b' };
      default: return { background: '#f3f4f6', color: '#6b7280' };
    }
  };

  // Function to handle customer name click
  const handleCustomerClick = (purchase) => {
    setSelectedCustomer({
      name: purchase.customer_name,
      email: purchase.customer_email,
      mobile: purchase.customer_mobile,
      address: purchase.customer_address,
      orderId: purchase.id,
      product: purchase.product_name,
      total: purchase.total_price,
    });
    setShowCustomerDetails(true);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👑 Admin Dashboard</h1>
          <p style={styles.userInfo}>
            Welcome, <strong>{user.username}</strong>
          </p>
        </div>
        <button onClick={onLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totalProducts}</div>
          <div style={styles.statLabel}>Total Products</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totalPurchases}</div>
          <div style={styles.statLabel}>Total Orders</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>${stats.totalRevenue.toFixed(2)}</div>
          <div style={styles.statLabel}>Total Revenue</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.lowStock}</div>
          <div style={styles.statLabel}>Low Stock</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === "products" ? styles.tabButtonActive : {}),
          }}
          onClick={() => setActiveTab("products")}
        >
          📦 Products
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === "purchases" ? styles.tabButtonActive : {}),
          }}
          onClick={() => setActiveTab("purchases")}
        >
          🛒 Purchases
        </button>
      </div>

      {activeTab === "products" ? (
        <>
          {/* Add Product Form */}
          <div style={styles.addSection}>
            <h3 style={styles.sectionTitle}>Add New Product</h3>
            <div style={styles.formRow}>
              <input
                placeholder="Product Name"
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
                style={styles.input}
              />
              <input
                type="number"
                placeholder="Quantity"
                value={productForm.quantity}
                onChange={(e) =>
                  setProductForm({ ...productForm, quantity: e.target.value })
                }
                style={styles.inputSmall}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: e.target.value })
                }
                style={styles.inputSmall}
              />
              <button onClick={onCreateProduct} style={styles.primaryButton}>
                + Add Product
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={styles.searchContainer}>
            <input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Products Table */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Price</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "500" }}>{product.name}</div>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.quantityBadge,
                          ...(product.quantity < 10
                            ? styles.lowStock
                            : styles.inStock),
                        }}
                      >
                        {product.quantity} units
                      </span>
                    </td>
                    <td style={styles.td}>
                      <strong>${parseFloat(product.price).toFixed(2)}</strong>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => onEditProduct(product)}
                          style={styles.editButton}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product.id)}
                          style={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Purchases Table with Status Updates */
        <div style={styles.tableContainer}>
          <h3 style={styles.sectionTitle}>Purchase History</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Order ID</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} style={styles.tr}>
                  <td style={styles.td}>#{purchase.id}</td>
                  <td style={styles.td}>
                    {/* Clickable customer name */}
                    <div 
                      style={{ 
                        fontWeight: "500", 
                        cursor: "pointer",
                        color: "#667eea",
                        textDecoration: "underline",
                        padding: "4px 0",
                      }}
                      onClick={() => handleCustomerClick(purchase)}
                      title="Click to view customer details"
                    >
                      {purchase.customer_name}
                    </div>
                    <div style={styles.smallText}>{purchase.customer_email}</div>
                  </td>
                  <td style={styles.td}>{purchase.product_name}</td>
                  <td style={styles.td}>{purchase.quantity}</td>
                  <td style={styles.td}>
                    <strong>${parseFloat(purchase.total_price).toFixed(2)}</strong>
                  </td>
                  <td style={styles.td}>
                    <select
                      value={purchase.status}
                      onChange={(e) => onUpdatePurchaseStatus(purchase.id, e.target.value)}
                      style={{
                        ...styles.statusSelect,
                        ...getStatusStyle(purchase.status),
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    {new Date(purchase.created_at).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => onUpdatePurchaseStatus(purchase.id, 'delivered')}
                      style={styles.quickButton}
                      title="Mark as Delivered"
                    >
                      ✅
                    </button>
                    <button
                      onClick={() => onUpdatePurchaseStatus(purchase.id, 'cancelled')}
                      style={{...styles.quickButton, background: '#ef4444', marginLeft: '5px'}}
                      title="Cancel Order"
                    >
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Product Modal */}
      {showProductModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              Edit Product
            </h3>
            <input
              value={productForm.name}
              onChange={(e) =>
                setProductForm({ ...productForm, name: e.target.value })
              }
              placeholder="Product Name"
              style={styles.input}
            />
            <div style={styles.formRow}>
              <input
                type="number"
                value={productForm.quantity}
                onChange={(e) =>
                  setProductForm({ ...productForm, quantity: e.target.value })
                }
                placeholder="Quantity"
                style={styles.input}
              />
              <input
                type="number"
                step="0.01"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: e.target.value })
                }
                placeholder="Price"
                style={styles.input}
              />
            </div>
            <div style={styles.modalActions}>
              <button onClick={onUpdateProduct} style={styles.primaryButton}>
                Save Changes
              </button>
              <button
                onClick={() => setShowProductModal(false)}
                style={styles.secondaryButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showCustomerDetails && selectedCustomer && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              Customer Details
              <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "normal", marginTop: "5px" }}>
                Order #{selectedCustomer.orderId}
              </div>
            </h3>
            
            <div style={styles.customerDetailsGrid}>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Name</div>
                <div style={styles.detailValue}>{selectedCustomer.name}</div>
              </div>
              
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Email</div>
                <div style={styles.detailValue}>
                  <a href={`mailto:${selectedCustomer.email}`} style={styles.link}>
                    {selectedCustomer.email}
                  </a>
                </div>
              </div>
              
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Mobile</div>
                <div style={styles.detailValue}>
                  <a href={`tel:${selectedCustomer.mobile}`} style={styles.link}>
                    {selectedCustomer.mobile}
                  </a>
                </div>
              </div>
              
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Product</div>
                <div style={styles.detailValue}>{selectedCustomer.product}</div>
              </div>
              
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Total Amount</div>
                <div style={styles.detailValue}>
                  <strong>${parseFloat(selectedCustomer.total).toFixed(2)}</strong>
                </div>
              </div>
              
              <div style={{ ...styles.detailItem, gridColumn: "span 2" }}>
                <div style={styles.detailLabel}>Shipping Address</div>
                <div style={styles.addressBox}>
                  {selectedCustomer.address}
                </div>
              </div>
            </div>
            
            <div style={styles.modalActions}>
              <button
                onClick={() => {
                  setShowCustomerDetails(false);
                  setSelectedCustomer(null);
                }}
                style={styles.primaryButton}
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedCustomer.address);
                  showToast("Address copied to clipboard!");
                }}
                style={styles.secondaryButton}
              >
                Copy Address
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ================= CUSTOMER DASHBOARD COMPONENT ================= */
function CustomerDashboard({
  user,
  onLogout,
  products,
  search,
  setSearch,
  purchaseForm,
  setPurchaseForm,
  showPurchaseModal,
  setShowPurchaseModal,
  onCreatePurchase,
  toasts,
}) {
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProduct = products.find(
    p => p.id === parseInt(purchaseForm.product_id)
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🛍️ Shopping Dashboard</h1>
          <p style={styles.userInfo}>
            Welcome, <strong>{user.username}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setShowPurchaseModal(true)}
            style={styles.primaryButton}
          >
            🛒 Make Purchase
          </button>
          <button onClick={onLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Products Grid */}
      <div style={styles.productsGrid}>
        {filteredProducts.map((product) => (
          <div key={product.id} style={styles.productCard}>
            <div style={styles.productHeader}>
              <h3 style={styles.productName}>{product.name}</h3>
              <span
                style={{
                  ...styles.stockBadge,
                  ...(product.quantity < 10
                    ? styles.lowStock
                    : styles.inStock),
                }}
              >
                {product.quantity} in stock
              </span>
            </div>
            <div style={styles.productPrice}>
              ${parseFloat(product.price).toFixed(2)}
            </div>
            <button
              onClick={() => {
                setPurchaseForm({
                  ...purchaseForm,
                  product_id: product.id.toString(),
                });
                setShowPurchaseModal(true);
              }}
              style={styles.buyButton}
              disabled={product.quantity === 0}
            >
              {product.quantity === 0 ? "Out of Stock" : "Buy Now"}
            </button>
          </div>
        ))}
      </div>

      {/* Purchase Modal - FIXED VERSION */}
      {showPurchaseModal && (
        <div style={{ ...styles.modalOverlay, padding: "20px" }}>
          <div style={{ ...modernStyles.modal, margin: "auto" }}>
            {/* Modal Header */}
            <div style={modernStyles.modalHeader}>
              <div style={modernStyles.modalHeaderContent}>
                <div style={modernStyles.modalIcon}>🛒</div>
                <div>
                  <h3 style={modernStyles.modalTitle}>Complete Your Purchase</h3>
                  <p style={modernStyles.modalSubtitle}>Fill in your details to proceed</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPurchaseModal(false)} 
                style={modernStyles.closeButton}
              >
                ×
              </button>
            </div>

            {/* Form Content */}
            <div style={modernStyles.modalContent}>
              {/* Contact Information Card - UPDATED LAYOUT */}
              <div style={modernStyles.card}>
                <div style={modernStyles.cardHeader}>
                  <div style={modernStyles.cardIcon}>👤</div>
                  <h4 style={modernStyles.cardTitle}>Contact Information</h4>
                </div>
                <div style={modernStyles.cardContent}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <label style={modernStyles.formLabel}>
                        Full Name <span style={modernStyles.required}>*</span>
                      </label>
                      <input
                        value={purchaseForm.customer_name}
                        onChange={(e) =>
                          setPurchaseForm({
                            ...purchaseForm,
                            customer_name: e.target.value,
                          })
                        }
                        placeholder="John Doe"
                        style={modernStyles.formInput}
                      />
                    </div>
                    
                    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                      <div style={{ flex: "1", minWidth: "200px" }}>
                        <label style={modernStyles.formLabel}>
                          Email Address <span style={modernStyles.required}>*</span>
                        </label>
                        <input
                          type="email"
                          value={purchaseForm.customer_email}
                          onChange={(e) =>
                            setPurchaseForm({
                              ...purchaseForm,
                              customer_email: e.target.value,
                            })
                          }
                          placeholder="john@example.com"
                          style={modernStyles.formInput}
                        />
                      </div>
                      
                      <div style={{ flex: "1", minWidth: "200px" }}>
                        <label style={modernStyles.formLabel}>
                          Phone Number <span style={modernStyles.required}>*</span>
                        </label>
                        <input
                          value={purchaseForm.customer_mobile}
                          onChange={(e) =>
                            setPurchaseForm({
                              ...purchaseForm,
                              customer_mobile: e.target.value,
                            })
                          }
                          placeholder="+1 (555) 123-4567"
                          style={modernStyles.formInput}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address Card */}
              <div style={modernStyles.card}>
                <div style={modernStyles.cardHeader}>
                  <div style={modernStyles.cardIcon}>🏠</div>
                  <h4 style={modernStyles.cardTitle}>Shipping Address</h4>
                </div>
                <div style={modernStyles.cardContent}>
                  <div>
                    <label style={modernStyles.formLabel}>
                      Street Address <span style={modernStyles.required}>*</span>
                    </label>
                    <textarea
                      value={purchaseForm.customer_address}
                      onChange={(e) =>
                        setPurchaseForm({
                          ...purchaseForm,
                          customer_address: e.target.value,
                        })
                      }
                      placeholder="123 Main St, City, State, ZIP Code"
                      style={modernStyles.formTextarea}
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              {/* Order Details Card - UPDATED LAYOUT */}
              <div style={modernStyles.card}>
                <div style={modernStyles.cardHeader}>
                  <div style={modernStyles.cardIcon}>📦</div>
                  <h4 style={modernStyles.cardTitle}>Order Details</h4>
                </div>
                <div style={modernStyles.cardContent}>
                  <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                    <div style={{ flex: "2", minWidth: "250px" }}>
                      <label style={modernStyles.formLabel}>
                        Select Product <span style={modernStyles.required}>*</span>
                      </label>
                      <div style={modernStyles.selectWrapper}>
                        <select
                          value={purchaseForm.product_id}
                          onChange={(e) =>
                            setPurchaseForm({
                              ...purchaseForm,
                              product_id: e.target.value,
                            })
                          }
                          style={modernStyles.formSelect}
                        >
                          <option value="">Choose a product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} - ${parseFloat(p.price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                        <div style={modernStyles.selectArrow}>▼</div>
                      </div>
                    </div>
                    
                    <div style={{ flex: "1", minWidth: "150px" }}>
                      <label style={modernStyles.formLabel}>
                        Quantity <span style={modernStyles.required}>*</span>
                      </label>
                      <div style={modernStyles.quantityContainer}>
                        <button
                          type="button"
                          onClick={() => {
                            if (purchaseForm.quantity > 1) {
                              setPurchaseForm({
                                ...purchaseForm,
                                quantity: purchaseForm.quantity - 1,
                              });
                            }
                          }}
                          style={modernStyles.quantityButton}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={selectedProduct?.quantity || 1}
                          value={purchaseForm.quantity}
                          onChange={(e) =>
                            setPurchaseForm({
                              ...purchaseForm,
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                          style={modernStyles.quantityInput}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const max = selectedProduct?.quantity || 1;
                            if (purchaseForm.quantity < max) {
                              setPurchaseForm({
                                ...purchaseForm,
                                quantity: purchaseForm.quantity + 1,
                              });
                            }
                          }}
                          style={modernStyles.quantityButton}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Card */}
              {selectedProduct && (
                <div style={modernStyles.card}>
                  <div style={modernStyles.cardHeader}>
                    <div style={modernStyles.cardIcon}>🧾</div>
                    <h4 style={modernStyles.cardTitle}>Order Summary</h4>
                  </div>
                  <div style={modernStyles.cardContent}>
                    <div style={modernStyles.summaryGrid}>
                      <div style={modernStyles.summaryRow}>
                        <span style={modernStyles.summaryLabel}>Unit Price</span>
                        <span style={modernStyles.summaryValue}>
                          ${parseFloat(selectedProduct.price).toFixed(2)}
                        </span>
                      </div>
                      <div style={modernStyles.summaryRow}>
                        <span style={modernStyles.summaryLabel}>Quantity</span>
                        <span style={modernStyles.summaryValue}>
                          {purchaseForm.quantity}
                        </span>
                      </div>
                      <div style={modernStyles.summaryRow}>
                        <span style={modernStyles.summaryLabel}>Subtotal</span>
                        <span style={modernStyles.summaryValue}>
                          ${(parseFloat(selectedProduct.price) * purchaseForm.quantity).toFixed(2)}
                        </span>
                      </div>
                      <div style={modernStyles.summaryRow}>
                        <span style={modernStyles.summaryLabel}>Shipping</span>
                        <span style={modernStyles.summaryValue}>$0.00</span>
                      </div>
                      <div style={modernStyles.summaryDivider} />
                      <div style={modernStyles.totalRow}>
                        <span style={modernStyles.totalLabel}>Total Amount</span>
                        <span style={modernStyles.totalValue}>
                          ${(parseFloat(selectedProduct.price) * purchaseForm.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={modernStyles.modalFooter}>
              <button 
                onClick={() => setShowPurchaseModal(false)} 
                style={modernStyles.secondaryButton}
              >
                Cancel Order
              </button>
              <button 
                onClick={onCreatePurchase} 
                style={modernStyles.primaryButton}
                disabled={!selectedProduct}
              >
                <span style={modernStyles.buttonIcon}>✓</span>
                Confirm & Pay
                <span style={modernStyles.buttonPrice}>
                  ${selectedProduct ? (parseFloat(selectedProduct.price) * purchaseForm.quantity).toFixed(2) : '0.00'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
/* ================= TOAST CONTAINER ================= */
function ToastContainer({ toasts }) {
  return (
    <div style={styles.toastContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            ...styles.toast,
            ...(toast.type === "error"
              ? styles.toastError
              : styles.toastSuccess),
          }}
        >
          {toast.type === "success" ? "✅" : "❌"} {toast.message}
        </div>
      ))}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  // Layout
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  
  // Loading
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "5px solid rgba(255,255,255,0.3)",
    borderTop: "5px solid #fff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },

  // Login
  loginPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  loginCard: {
    background: "white",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    width: "100%",
    maxWidth: "400px",
    border: "1px solid #d1d5db",
  },
  loginTitle: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "10px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  loginSubtitle: {
    color: "#666",
    marginBottom: "30px",
  },
  demoInfo: {
    background: "#f0f7ff",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
    border: "1px solid #b3c6ff",
  },
  credential: {
    padding: "5px 0",
    borderBottom: "1px solid #c7d2fe",
  },
  loginInput: {
    width: "100%",
    padding: "15px",
    marginBottom: "15px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    fontSize: "16px",
    boxSizing: "border-box",
    backgroundColor: "white",
  },
  loginButton: {
    width: "100%",
    padding: "15px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
  },

  // Header
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    paddingBottom: "20px",
    borderBottom: "2px solid #d1d5db",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    margin: "0",
  },
  userInfo: {
    color: "#666",
    marginTop: "5px",
  },
  logoutButton: {
    padding: "10px 20px",
    border: "2px solid #667eea",
    background: "transparent",
    color: "#667eea",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },

  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },
  statCard: {
    background: "white",
    padding: "20px",
    borderRadius: "15px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    textAlign: "center",
    border: "1px solid #d1d5db",
  },
  statValue: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#1f2937",
  },
  statLabel: {
    color: "#6b7280",
    fontSize: "14px",
    marginTop: "5px",
  },

  // Tabs
  tabContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "30px",
    padding: "10px",
    background: "#f9fafb",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
  },
  tabButton: {
    padding: "12px 24px",
    background: "#f3f4f6",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  tabButtonActive: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "1px solid #5a67d8",
  },

  // Forms
  addSection: {
    background: "#f9fafb",
    padding: "20px",
    borderRadius: "15px",
    marginBottom: "20px",
    border: "1px solid #d1d5db",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "15px",
    color: "#374151",
  },
  formRow: {
    display: "flex",
    gap: "15px",
    alignItems: "center",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "500",
    fontSize: "14px",
    color: "#4b5563",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    backgroundColor: "white",
    marginBottom: "5px",
  },
  inputSmall: {
    width: "150px",
    padding: "12px 15px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    fontSize: "14px",
    backgroundColor: "white",
  },

  // Search
  searchContainer: {
    marginBottom: "20px",
    display: "flex",
    justifyContent: "center",
  },
  searchInput: {
    width: "100%",
    maxWidth: "600px",
    padding: "12px 20px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    fontSize: "14px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    backgroundColor: "white",
  },

  // Table
  tableContainer: {
    background: "white",
    borderRadius: "15px",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #d1d5db",
    marginTop: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "15px",
    textAlign: "left",
    background: "#f9fafb",
    borderBottom: "2px solid #d1d5db",
    fontWeight: "600",
  },
  td: {
    padding: "15px",
    borderBottom: "1px solid #d1d5db",
  },
  tr: {
    transition: "background 0.2s",
  },

  // Badges
  quantityBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
  },
  lowStock: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  inStock: {
    background: "#dcfce7",
    color: "#166534",
  },
  statusBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
  },
  statusPending: {
    background: "#fef3c7",
    color: "#92400e",
  },
  statusShipped: {
    background: "#dbeafe",
    color: "#1e40af",
  },
  statusCompleted: {
    background: "#dcfce7",
    color: "#166534",
  },

  // Status Select
  statusSelect: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    width: "100%",
    backgroundColor: "white",
  },

  // Buttons
  primaryButton: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },
  secondaryButton: {
    padding: "12px 24px",
    background: "transparent",
    color: "#667eea",
    border: "2px solid #667eea",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },
  editButton: {
    padding: "8px 16px",
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginRight: "8px",
  },
  deleteButton: {
    padding: "8px 16px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  buyButton: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    marginTop: "15px",
  },
  quickButton: {
    padding: "6px 12px",
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },

  // Action Buttons
  actionButtons: {
    display: "flex",
    gap: "10px",
  },

  // Products Grid (Customer)
  productsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },
  productCard: {
    background: "white",
    padding: "20px",
    borderRadius: "15px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #d1d5db",
    transition: "all 0.2s ease",
  },
  productHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "15px",
  },
  productName: {
    fontSize: "18px",
    fontWeight: "600",
    margin: "0",
  },
  stockBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "500",
  },
  productPrice: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#1f2937",
  },

  // Price Summary
  priceSummary: {
    background: "#f9fafb",
    padding: "15px",
    borderRadius: "10px",
    margin: "20px 0",
    border: "1px solid #d1d5db",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    alignItems: "center",
  },
  totalRow: {
    borderTop: "2px solid #d1d5db",
    paddingTop: "10px",
    marginTop: "10px",
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "1000",
  },
  modal: {
    background: "white",
    padding: "30px",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "500px",
    maxHeight: "90vh",
    overflowY: "auto",
    border: "1px solid #d1d5db",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  modalActions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },

  // Customer Details Styles
  customerDetailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "15px",
    marginBottom: "20px",
  },
  detailItem: {
    padding: "10px",
    background: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  detailLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "5px",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1f2937",
  },
  addressBox: {
    background: "white",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
    fontSize: "13px",
    lineHeight: "1.5",
    marginTop: "5px",
    maxHeight: "100px",
    overflowY: "auto",
    whiteSpace: "pre-wrap",
  },
  link: {
    color: "#667eea",
    textDecoration: "none",
  },

  // Toast
  toastContainer: {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "9999",
  },
  toast: {
    padding: "15px 20px",
    borderRadius: "10px",
    marginBottom: "10px",
    minWidth: "300px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    animation: "slideIn 0.3s ease",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  toastSuccess: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
  },
  toastError: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "white",
  },

  // Text
  smallText: {
    fontSize: "12px",
    color: "#6b7280",
  },
};

/* ================= MODERN STYLES FOR PURCHASE MODAL ================= */
const modernStyles = {
  modal: {
    background: "white",
    borderRadius: "24px",
    width: "100%",
    maxWidth: "520px",
    maxHeight: "85vh",
    overflow: "hidden",
    boxShadow: "0 32px 64px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
  },

  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 32px",
    borderBottom: "1px solid #f3f4f6",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },

  modalHeaderContent: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  modalIcon: {
    fontSize: "32px",
    background: "rgba(255, 255, 255, 0.2)",
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
  },

  modalTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "white",
    margin: "0",
    letterSpacing: "-0.01em",
  },

  modalSubtitle: {
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.85)",
    margin: "4px 0 0 0",
    fontWeight: "400",
  },

  closeButton: {
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    fontSize: "24px",
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s ease",
  },

  modalContent: {
    padding: "24px 32px",
    overflowY: "auto",
    flex: "1",
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  card: {
    background: "white",
    borderRadius: "16px",
    border: "1px solid #f3f4f6",
    marginBottom: "20px",
    overflow: "hidden",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #f3f4f6",
    background: "#fafafa",
  },

  cardIcon: {
    fontSize: "20px",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f7ff",
    color: "#667eea",
    marginRight: "12px",
    flexShrink: "0",
  },

  cardTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
    margin: "0",
  },

  cardContent: {
    padding: "24px",
  },

  formField: {
    marginBottom: "0",
  },

  formLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },

  required: {
    color: "#ef4444",
    marginLeft: "2px",
  },

  formInput: {
    width: "100%",
    padding: "14px 16px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "15px",
    fontFamily: "'Inter', sans-serif",
    color: "#1f2937",
    backgroundColor: "white",
    transition: "all 0.2s ease",
    outline: "none",
    boxSizing: "border-box",
  },

  formTextarea: {
    width: "100%",
    padding: "14px 16px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "15px",
    fontFamily: "'Inter', sans-serif",
    color: "#1f2937",
    backgroundColor: "white",
    transition: "all 0.2s ease",
    outline: "none",
    resize: "vertical",
    minHeight: "100px",
    lineHeight: "1.5",
    boxSizing: "border-box",
  },

  selectWrapper: {
    position: "relative",
    width: "100%",
  },

  formSelect: {
    width: "100%",
    padding: "14px 16px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "15px",
    fontFamily: "'Inter', sans-serif",
    color: "#1f2937",
    backgroundColor: "white",
    transition: "all 0.2s ease",
    outline: "none",
    appearance: "none",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  selectArrow: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#6b7280",
    pointerEvents: "none",
    fontSize: "12px",
  },

  quantityContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
  },

  quantityButton: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    background: "white",
    fontSize: "18px",
    color: "#374151",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    flexShrink: "0",
  },

  quantityInput: {
    flex: "1",
    padding: "14px",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "15px",
    textAlign: "center",
    fontFamily: "'Inter', sans-serif",
    color: "#1f2937",
    backgroundColor: "white",
    transition: "all 0.2s ease",
    outline: "none",
    boxSizing: "border-box",
  },

  summaryGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    fontSize: "14px",
    color: "#6b7280",
  },

  summaryValue: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1f2937",
  },

  summaryDivider: {
    height: "1px",
    background: "#f3f4f6",
    margin: "16px 0",
  },

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "16px",
    marginTop: "8px",
    borderTop: "2px solid #f3f4f6",
  },

  totalLabel: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
  },

  totalValue: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1f2937",
  },

  modalFooter: {
    padding: "24px 32px",
    borderTop: "1px solid #f3f4f6",
    display: "flex",
    gap: "16px",
    background: "#fafafa",
  },

  primaryButton: {
    flex: "1",
    padding: "18px 24px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "14px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
    position: "relative",
    overflow: "hidden",
  },

  secondaryButton: {
    flex: "1",
    padding: "18px 24px",
    background: "white",
    color: "#6b7280",
    border: "2px solid #e5e7eb",
    borderRadius: "14px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  buttonIcon: {
    fontSize: "18px",
    fontWeight: "700",
  },

  buttonPrice: {
    fontSize: "15px",
    fontWeight: "500",
    opacity: "0.9",
    marginLeft: "auto",
  },

  toggleModeContainer: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
    textAlign: "center",
  },

  toggleModeText: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "8px",
  },

  toggleModeButton: {
    background: "none",
    border: "none",
    color: "#667eea",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "8px 16px",
    borderRadius: "8px",
    transition: "all 0.2s ease",
  },
};

// Add CSS animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  button:hover {
    opacity: 0.9;
  }
`;
document.head.appendChild(styleSheet);

export default App;