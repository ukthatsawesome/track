// src/api/auth.js
import { useAxios } from './index';

export const useAuthAPI = () => {
const request = useAxios();

const login = async (username, password) => {
return await request({ method: 'POST', url: '/token/', data: { username, password } });
};

const refreshToken = async (refresh) => {
return await request({ method: 'POST', url: '/token/refresh/', data: { refresh } });
};

const getUser = async () => {
return await request({ method: 'GET', url: '/me/' });
};

return { login, refreshToken, getUser };
};