import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemAdminApi, CreateSystemAdminRequest, UpdateSystemAdminRequest } from '../api/systemAdminApi';

const QUERY_KEY = ['system-admins'];

export function useSystemAdmins() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => systemAdminApi.getAll(),
  });
}

export function useSystemAdmin(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => systemAdminApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateSystemAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSystemAdminRequest) => systemAdminApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateSystemAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSystemAdminRequest }) =>
      systemAdminApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteSystemAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => systemAdminApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
