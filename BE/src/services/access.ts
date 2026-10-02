export type PrincipalRole = 'user' | 'staff' | 'admin';
export const internalRole = (value: string): 'staff' | 'admin' | null => {
  if (value.toUpperCase() === 'ADMIN') return 'admin';
  if (['STAFF', 'USER'].includes(value.toUpperCase())) return 'staff';
  return null;
};
export const staffTabs = ['orders', 'products'] as const;
