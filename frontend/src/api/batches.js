
import { useCallback } from 'react';
import { useAxios } from './index';

export const useBatchAPI = () => {
const request = useAxios();

const getBatches = useCallback(async () => {
return await request({ method: 'GET', url: '/batches/' });
}, [request]);

const getBatch = useCallback(async (id) => {
return await request({ method: 'GET', url: `/batches/${id}/` });
}, [request]);

const createBatch = useCallback(async (data) => {
return await request({ method: 'POST', url: '/batches/', data });
}, [request]);

const updateBatch = useCallback(async (id, data) => {
return await request({ method: 'PUT', url: `/batches/${id}/`, data });
}, [request]);

const partialUpdateBatch = useCallback(async (id, data) => {
return await request({ method: 'PATCH', url: `/batches/${id}/`, data });
}, [request]);

const deleteBatch = useCallback(async (id) => {
return await request({ method: 'DELETE', url: `/batches/${id}/` });
}, [request]);

return {
getBatches,
getBatch,
createBatch,
updateBatch,
partialUpdateBatch,
deleteBatch
};
};
