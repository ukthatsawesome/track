// src/api/submissions.js
// useSubmissionAPI hook
import { useCallback } from 'react';
import { useAxios } from './index';

export const useSubmissionAPI = () => {
  const request = useAxios();

  const getSubmissions = useCallback(
    async (params = {}) => request({ method: 'GET', url: '/submissions/', params }),
    [request]
  );
  const getSubmission = useCallback(
    async (id) => request({ method: 'GET', url: `/submissions/${id}/` }),
    [request]
  );
  const createSubmission = useCallback(
    async (data) => request({ method: 'POST', url: '/submissions/', data }),
    [request]
  );
  const updateSubmission = useCallback(
    async (id, data) => request({ method: 'PUT', url: `/submissions/${id}/`, data }),
    [request]
  );
  const partialUpdateSubmission = useCallback(
    async (id, data) => request({ method: 'PATCH', url: `/submissions/${id}/`, data }),
    [request]
  );
  const deleteSubmission = useCallback(
    async (id) => request({ method: 'DELETE', url: `/submissions/${id}/` }),
    [request]
  );

  return { getSubmissions, getSubmission, createSubmission, updateSubmission, partialUpdateSubmission, deleteSubmission };
};