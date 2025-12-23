import React, { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = () => {
    axios
      .post(`${API}/auth/login/`, { username, password })
      .then((res) => {
        localStorage.setItem("access", res.data.access);
        localStorage.setItem("refresh", res.data.refresh);
        onLogin();
      })
      .catch(() => setError("Invalid credentials"));
  };

  return (
    <div style={styles.box}>
      <h2>Login</h2>

      <input placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={login}>Login</button>
    </div>
  );
}

const styles = {
  box: {
    width: 320,
    margin: "100px auto",
    padding: 20,
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
};
