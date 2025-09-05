import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    console.log({ name, email, password });
  };

  return (
    <div className="auth">
      <h2>Register</h2>
      <form onSubmit={onSubmit} className="form">
        <label>Full Name</label>
        <input value={name} onChange={(e)=>setName(e.target.value)} required />

        <label>Email</label>
        <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e)=>setPass(e.target.value)} required />

        <button type="submit" className="btn primary">Create Account</button>
      </form>
    </div>
  );
}
