import { apiRequest } from './fashion-data';

export type StoreBanner = { id: string; title: string; subtitle: string; image: string | null; link: string; buttonText: string; isActive: boolean; startsAt: string | null; endsAt: string | null };
export type StoreSettings = {
  storeName: string; contactEmail: string; phone: string; address: string;
  shippingPolicy: string; returnPolicy: string;
  shipping: { enabled: boolean; label: string; fee: number; freeFrom: number | null };
  banners: StoreBanner[];
};
export type StoreSettingsEnvelope = { version: number; settings: StoreSettings };
export async function loadStoreSettingsEnvelope(): Promise<StoreSettingsEnvelope> { return apiRequest('/settings'); }
export async function loadStoreSettings(): Promise<StoreSettings> { return (await loadStoreSettingsEnvelope()).settings; }
