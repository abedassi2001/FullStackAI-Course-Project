import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    console.log({ email, password });
  };

  return (
    <div className="auth">
      <h2>Login</h2>
      <form onSubmit={onSubmit} className="form">
        <label>Email</label>
        <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />

        <button type="submit" className="btn primary">Login</button>
      </form>
    </div>
  );
}
