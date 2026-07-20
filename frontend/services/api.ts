import axios from 'axios';

export const API_URL = 'https://aplicativo-nzilaplusv2.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

export default api;