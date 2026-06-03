export function parseJwtDurationToSeconds(value: string): number {
  const match = value.trim().match(/^(\d+)([smhd])$/);

  if (!match) {
    return 1800;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    case 'd':
      return amount * 86400;
    default:
      return 1800;
  }
}
