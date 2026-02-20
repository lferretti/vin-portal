import { VinAddStatus } from '@core/models';

export function formatStatus(status: VinAddStatus): string {
  const labels: Record<VinAddStatus, string> = {
    [VinAddStatus.NOT_USED]: 'Not Used',
    [VinAddStatus.PENDING]: 'Pending',
    [VinAddStatus.COMMITTED_LOCKED]: 'Committed',
    [VinAddStatus.FAILED_INELIGIBLE]: 'Failed - Ineligible',
    [VinAddStatus.FAILED_DEPENDENCY]: 'Failed - Dependency',
    [VinAddStatus.FAILED_VALIDATION]: 'Failed - Validation',
    [VinAddStatus.CANCELLED]: 'Cancelled',
  };
  return labels[status] || status;
}

export function getStatusBadgeClass(status: VinAddStatus): string {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  const variants: Record<string, string> = {
    [VinAddStatus.COMMITTED_LOCKED]: `${base} bg-green-100 text-green-800`,
    [VinAddStatus.PENDING]: `${base} bg-yellow-100 text-yellow-800`,
    [VinAddStatus.NOT_USED]: `${base} bg-slate-100 text-slate-800`,
    default: `${base} bg-red-100 text-red-800`,
  };
  return variants[status] || variants['default'];
}
