import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

function App() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const fetchProducts = () => {
    axios
      .get(`${API}/products/`)
      .then((res) => setProducts(res.data.products))
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = () => {
    const name = document.getElementById("name").value;
    const quantity = document.getElementById("quantity").value;
    const price = document.getElementById("price").value;

    axios
      .post(`${API}/products/add/`, { name, quantity, price })
      .then(fetchProducts)
      .catch((err) => console.log(err));
  };

  const editProduct = (product) => {
    const newName = prompt("Enter new name:", product.name);
    const newQuantity = prompt("Enter new quantity:", product.quantity);
    const newPrice = prompt("Enter new price:", product.price);

    if (!newName || !newQuantity || !newPrice) return;

    axios
      .post(`${API}/products/edit/${product.id}/`, {
        name: newName,
        quantity: newQuantity,
        price: newPrice,
      })
      .then(fetchProducts)
      .catch((err) => console.log(err));
  };

  const deleteProduct = (id) => {
    if (window.confirm("Are you sure?")) {
      axios
        .post(`${API}/products/delete/${id}/`)
        .then(fetchProducts)
        .catch((err) => console.log(err));
    }
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "20px",
        borderRadius: "10px",
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#333", marginBottom: "25px" }}>
        Inventory Management
      </h1>

      {/* Add Product Form */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          marginBottom: "25px",
        }}
      >
        <input
          type="text"
          placeholder="Name"
          id="name"
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            width: "180px",
          }}
        />

        <input
          type="number"
          placeholder="Quantity"
          id="quantity"
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            width: "120px",
          }}
        />

        <input
          type="number"
          placeholder="Price"
          id="price"
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            width: "120px",
          }}
        />

        <button
          onClick={addProduct}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            padding: "10px 15px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "10px",
          width: "60%",
          borderRadius: "6px",
          border: "1px solid #ccc",
          marginBottom: "20px",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      />

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#007bff", color: "white" }}>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>Name</th>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>
              Quantity
            </th>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>
              Price
            </th>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {products
            .filter((item) =>
              item.name.toLowerCase().includes(search.toLowerCase())
            )
            .map((item) => (
              <tr key={item.id}>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                  {item.name}
                </td>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                  {item.quantity}
                </td>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                  {item.price}
                </td>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                  <button
                    onClick={() => editProduct(item)}
                    style={{
                      marginRight: "10px",
                      backgroundColor: "#28a745",
                      color: "white",
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteProduct(item.id)}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

          {products.filter((item) =>
            item.name.toLowerCase().includes(search.toLowerCase())
          ).length === 0 && (
            <tr>
              <td colSpan="4" style={{ padding: "12px", textAlign: "center" }}>
                No Products Found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
