import { VinAddStatus } from '@core/models';
import { formatStatus, getStatusBadgeClass } from './status-badge.util';

describe('status-badge.util', () => {
  describe('formatStatus', () => {
    it('should format NOT_USED as "Not Used"', () => {
      expect(formatStatus(VinAddStatus.NOT_USED)).toBe('Not Used');
    });

    it('should format PENDING as "Pending"', () => {
      expect(formatStatus(VinAddStatus.PENDING)).toBe('Pending');
    });

    it('should format COMMITTED_LOCKED as "Committed"', () => {
      expect(formatStatus(VinAddStatus.COMMITTED_LOCKED)).toBe('Committed');
    });

    it('should format FAILED_INELIGIBLE as "Failed - Ineligible"', () => {
      expect(formatStatus(VinAddStatus.FAILED_INELIGIBLE)).toBe('Failed - Ineligible');
    });

    it('should format FAILED_DEPENDENCY as "Failed - Dependency"', () => {
      expect(formatStatus(VinAddStatus.FAILED_DEPENDENCY)).toBe('Failed - Dependency');
    });

    it('should format FAILED_VALIDATION as "Failed - Validation"', () => {
      expect(formatStatus(VinAddStatus.FAILED_VALIDATION)).toBe('Failed - Validation');
    });

    it('should format CANCELLED as "Cancelled"', () => {
      expect(formatStatus(VinAddStatus.CANCELLED)).toBe('Cancelled');
    });

    it('should return the raw status string for unknown values', () => {
      expect(formatStatus('UNKNOWN_STATUS' as VinAddStatus)).toBe('UNKNOWN_STATUS');
    });
  });

  describe('getStatusBadgeClass', () => {
    it('should return green badge classes for COMMITTED_LOCKED', () => {
      const classes = getStatusBadgeClass(VinAddStatus.COMMITTED_LOCKED);
      expect(classes).toContain('bg-green-100');
      expect(classes).toContain('text-green-800');
    });

    it('should return yellow badge classes for PENDING', () => {
      const classes = getStatusBadgeClass(VinAddStatus.PENDING);
      expect(classes).toContain('bg-yellow-100');
      expect(classes).toContain('text-yellow-800');
    });

    it('should return slate badge classes for NOT_USED', () => {
      const classes = getStatusBadgeClass(VinAddStatus.NOT_USED);
      expect(classes).toContain('bg-slate-100');
      expect(classes).toContain('text-slate-800');
    });

    it('should return red badge classes for FAILED_INELIGIBLE', () => {
      const classes = getStatusBadgeClass(VinAddStatus.FAILED_INELIGIBLE);
      expect(classes).toContain('bg-red-100');
      expect(classes).toContain('text-red-800');
    });

    it('should return red badge classes for FAILED_DEPENDENCY', () => {
      const classes = getStatusBadgeClass(VinAddStatus.FAILED_DEPENDENCY);
      expect(classes).toContain('bg-red-100');
      expect(classes).toContain('text-red-800');
    });

    it('should return red badge classes for FAILED_VALIDATION', () => {
      const classes = getStatusBadgeClass(VinAddStatus.FAILED_VALIDATION);
      expect(classes).toContain('bg-red-100');
      expect(classes).toContain('text-red-800');
    });

    it('should return red badge classes for CANCELLED', () => {
      const classes = getStatusBadgeClass(VinAddStatus.CANCELLED);
      expect(classes).toContain('bg-red-100');
      expect(classes).toContain('text-red-800');
    });

    it('should return red badge classes for unknown statuses (fallback to default)', () => {
      const classes = getStatusBadgeClass('UNKNOWN' as VinAddStatus);
      expect(classes).toContain('bg-red-100');
      expect(classes).toContain('text-red-800');
    });

    it('should always include base badge classes', () => {
      const classes = getStatusBadgeClass(VinAddStatus.PENDING);
      expect(classes).toContain('inline-flex');
      expect(classes).toContain('items-center');
      expect(classes).toContain('rounded-full');
      expect(classes).toContain('text-xs');
      expect(classes).toContain('font-medium');
    });
  });
});
