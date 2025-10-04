// src/api/submissions.js
import { useAxios } from './index';

export const useSubmissionAPI = () => {
const request = useAxios();

const getSubmissions = async () => request({ method: 'GET', url: '/submissions/' });
const getSubmission = async (id) => request({ method: 'GET', url: `/submissions/${id}/` });
const createSubmission = async (data) => request({ method: 'POST', url: '/submissions/', data });
const updateSubmission = async (id, data) => request({ method: 'PUT', url: `/submissions/${id}/`, data });
const partialUpdateSubmission = async (id, data) => request({ method: 'PATCH', url: `/submissions/${id}/`, data });
const deleteSubmission = async (id) => request({ method: 'DELETE', url: `/submissions/${id}/` });

return { getSubmissions, getSubmission, createSubmission, updateSubmission, partialUpdateSubmission, deleteSubmission };
};