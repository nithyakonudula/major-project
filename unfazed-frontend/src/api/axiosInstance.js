import axios from 'axios';
const configuredApiBase = import.meta.env.VITE_API_BASE_URL;
const apiBaseUrl = configuredApiBase
  ? `${configuredApiBase.startsWith('http') ? configuredApiBase : `https://${configuredApiBase}`}${configuredApiBase.endsWith('/api') ? '' : '/api'}`
  : 'http://localhost:5000/api';
const api=axios.create({baseURL:apiBaseUrl,timeout:12000});
api.interceptors.request.use(config=>{const token=localStorage.getItem('unfazed_token');if(token)config.headers.Authorization=`Bearer ${token}`;return config;});
export default api;
