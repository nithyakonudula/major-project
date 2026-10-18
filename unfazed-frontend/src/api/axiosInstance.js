import axios from 'axios';
const api=axios.create({baseURL:import.meta.env.VITE_API_BASE_URL||'http://localhost:5000/api',timeout:12000});
api.interceptors.request.use(config=>{const token=localStorage.getItem('unfazed_token');if(token)config.headers.Authorization=`Bearer ${token}`;return config;});
export default api;
