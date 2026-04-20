export function maskSecret(value) {
  if (!value || value.length <= 4) return '****';
  return '*'.repeat(4) + value.slice(-4);
}
