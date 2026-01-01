import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { goseaApi, AddToPoolRequest, AllocateRequest, ReleaseRequest, CreateRelayRequest, UpdateRelayRequest } from '../api/goseaApi';

// ==================== Pool ====================

export function usePool(status?: string, countryCode?: string) {
  return useQuery({
    queryKey: ['gosea', 'pool', status, countryCode],
    queryFn: () => goseaApi.getPool(status, countryCode),
  });
}

export function useAddToPool() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: AddToPoolRequest) => goseaApi.addToPool(data),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['gosea'] }); message.success(`Added ${res.added} proxies`); },
    onError: () => { message.error('Failed to add proxies'); },
  });
}

export function useDeleteFromPool() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => goseaApi.deleteFromPool(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gosea'] }); message.success('Proxy deleted'); },
    onError: () => { message.error('Failed to delete proxy'); },
  });
}

// ==================== Inventory ====================

export function useInventory() {
  return useQuery({ queryKey: ['gosea', 'inventory'], queryFn: () => goseaApi.getInventory() });
}

// ==================== Allocations ====================

export function useAllocations(status?: string, externalOrderId?: string) {
  return useQuery({
    queryKey: ['gosea', 'allocations', status, externalOrderId],
    queryFn: () => goseaApi.getAllocations(status, externalOrderId),
  });
}

export function useAllocate() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: AllocateRequest) => goseaApi.allocate(data),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['gosea'] }); message.success(`Allocated ${res.length} proxies`); },
    onError: () => { message.error('Failed to allocate'); },
  });
}

export function useRelease() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: ReleaseRequest) => goseaApi.release(data),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['gosea'] }); message.success(`Released ${res.released} allocations`); },
    onError: () => { message.error('Failed to release'); },
  });
}

// ==================== Relay ====================

export function useRelays(status?: string, externalOrderId?: string) {
  return useQuery({
    queryKey: ['gosea', 'relays', status, externalOrderId],
    queryFn: () => goseaApi.getRelays(status, externalOrderId),
  });
}

export function useRelay(id: string) {
  return useQuery({
    queryKey: ['gosea', 'relay', id],
    queryFn: () => goseaApi.getRelay(id),
    enabled: !!id,
  });
}

export function useCreateRelay() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: CreateRelayRequest) => goseaApi.createRelay(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gosea', 'relays'] }); message.success('Relay created'); },
    onError: () => { message.error('Failed to create relay'); },
  });
}

export function useUpdateRelay() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRelayRequest }) => goseaApi.updateRelay(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gosea', 'relays'] }); message.success('Relay updated'); },
    onError: () => { message.error('Failed to update relay'); },
  });
}

export function useDeleteRelay() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => goseaApi.deleteRelay(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gosea', 'relays'] }); message.success('Relay deleted'); },
    onError: () => { message.error('Failed to delete relay'); },
  });
}
