import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Pass JWT token automatically with every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

// Backward-compatibility helpers for existing student manager components
export async function getStudents() {
  const res = await API.get('/students');
  return res.data;
}

export async function loginUser(email, password) {
  const res = await API.post('/auth/login', { email, password });
  return res.data;
}

export async function createStudent(student) {
  const res = await API.post('/students', student);
  return res.data;
}

export async function deleteStudent(id) {
  await API.delete(`/students/${id}`);
}