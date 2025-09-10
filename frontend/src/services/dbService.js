// src/services/dbService.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
});

export function uploadDatabase(file) {
  const form = new FormData();
  form.append("db", file);
  return api.post("/db/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function activateDemoDatabase() {
  return api.post("/db/use-demo");
}