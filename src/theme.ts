// Placeholder design tokens — swap these when the Claude Design files
// (Bzy App.dc.html / Bzy Client.dc.html) are imported.
export const colors = {
  bg: '#0F0F14',
  card: '#1A1A22',
  cardPressed: '#22222C',
  border: '#2A2A35',
  text: '#F5F5F7',
  dim: '#9A9AA5',
  accent: '#7C5CFF',
  accentSoft: '#2A2347',
  success: '#3ECF8E',
  danger: '#FF5C6C',
  warning: '#FFB84D',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const type = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  dim: { fontSize: 14, color: colors.dim },
  small: { fontSize: 12, color: colors.dim },
};
