// src/api/bags.js
import { useCallback } from 'react';
import { useAxios } from './index';

export const useBagAPI = () => {
const request = useAxios();

const getBags = useCallback(async () => request({ method: 'GET', url: '/bags/' }), [request]);
const getBag = useCallback(async (id) => request({ method: 'GET', url: `/bags/${id}/` }), [request]);
const createBag = useCallback(async (data) => request({ method: 'POST', url: '/bags/', data }), [request]);
const updateBag = useCallback(async (id, data) => request({ method: 'PUT', url: `/bags/${id}/`, data }), [request]);
const partialUpdateBag = useCallback(async (id, data) => request({ method: 'PATCH', url: `/bags/${id}/`, data }), [request]);
const deleteBag = useCallback(async (id) => request({ method: 'DELETE', url: `/bags/${id}/` }), [request]);

return { getBags, getBag, createBag, updateBag, partialUpdateBag, deleteBag };
};
