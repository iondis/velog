// @flow
import axios from 'lib/defaultClient';

export const listCategories = (): Promise<*> => axios.get('/me/categories');

export const createCategory = (name: string): Promise<*> =>
  axios.post('/me/categories', {
    name,
  });
export const deleteCategory = (id: string): Promise<*> => axios.delete(`/me/categories/${id}`);

export type UpdateCategoryPayload = {
  id: string,
  name: string,
};

export const updateCategory = ({ id, name }: UpdateCategoryPayload): Promise<*> =>
  axios.patch(`/me/categories/${id}`, { name });

export type ReorderCategoryPayload = Array<{
  id: string,
  order: number,
}>;

export const reorderCategories = (categoryOrders: ReorderCategoryPayload): Promise<*> =>
  axios.put('/me/categories/reorder', categoryOrders);

export const followUser = (userId: string) => axios.post(`/me/follow/users/${userId}`);
export const getUserFollow = (userId: string) => axios.get(`/me/follow/users/${userId}`);
export const unfollowUser = (userId: string) => axios.delete(`/me/follow/users/${userId}`);
