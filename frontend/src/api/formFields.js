
import { useAxios } from './index';

export const useFormFieldAPI = () => {
const request = useAxios();

const getFormFields = async () => request({ method: 'GET', url: '/formfields/' });
const getFormField = async (id) => request({ method: 'GET', url: `/formfields/${id}/` });
const createFormField = async (data) => request({ method: 'POST', url: '/formfields/', data });
const updateFormField = async (id, data) => request({ method: 'PUT', url: `/formfields/${id}/`, data });
const partialUpdateFormField = async (id, data) => request({ method: 'PATCH', url: `/formfields/${id}/`, data });
const deleteFormField = async (id) => request({ method: 'DELETE', url: `/formfields/${id}/` });

return { getFormFields, getFormField, createFormField, updateFormField, partialUpdateFormField, deleteFormField };
};
