
import { useCallback } from 'react';
import { useAxios } from './index';

export const useFormAPI = () => {
const request = useAxios();

const getForms = useCallback(async () => request({ method: 'GET', url: '/forms/' }), [request]);
const getForm = useCallback(async (id) => request({ method: 'GET', url: `/forms/${id}/` }), [request]);
const createForm = useCallback(async (data) => request({ method: 'POST', url: '/forms/', data }), [request]);
const updateForm = useCallback(async (id, data) => request({ method: 'PUT', url: `/forms/${id}/`, data }), [request]);
const partialUpdateForm = useCallback(async (id, data) => request({ method: 'PATCH', url: `/forms/${id}/`, data }), [request]);
const deleteForm = useCallback(async (id) => request({ method: 'DELETE', url: `/forms/${id}/` }), [request]);

return { getForms, getForm, createForm, updateForm, partialUpdateForm, deleteForm };
};