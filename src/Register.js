import React, { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function Register({ onRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const register = () => {
    axios
      .post(`${API}/auth/register/`, { username, password })
      .then(() => onRegister())
      .catch(() => alert("User already exists"));
  };

  return (
    <div style={styles.box}>
      <h2>Register</h2>

      <input placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />

      <button onClick={register}>Register</button>
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
