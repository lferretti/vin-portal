import { DocumentData, mapFields } from './field-mapper';

describe('mapFields', () => {
  const sampleData: DocumentData = {
    requestReferenceId: 'REQ-001',
    confirmationDate: 'January 15, 2026',
    maskedVin: '***********234567',
    yearMakeModel: '2024 Toyota Camry',
    contractReference: 'CTR-999',
  };

  it('should map all DocumentData fields to form field names', () => {
    const result = mapFields(sampleData);

    expect(result).toEqual({
      referenceId: 'REQ-001',
      confirmationDate: 'January 15, 2026',
      maskedVin: '***********234567',
      vehicle: '2024 Toyota Camry',
      contractRef: 'CTR-999',
    });
  });

  it('should return exactly 5 fields', () => {
    const result = mapFields(sampleData);
    expect(Object.keys(result)).toHaveLength(5);
  });

  it('should handle empty strings gracefully', () => {
    const emptyData: DocumentData = {
      requestReferenceId: '',
      confirmationDate: '',
      maskedVin: '',
      yearMakeModel: '',
      contractReference: '',
    };

    const result = mapFields(emptyData);

    expect(result.referenceId).toBe('');
    expect(result.confirmationDate).toBe('');
    expect(result.maskedVin).toBe('');
    expect(result.vehicle).toBe('');
    expect(result.contractRef).toBe('');
  });
});
