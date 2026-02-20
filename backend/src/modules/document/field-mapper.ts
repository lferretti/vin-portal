/**
 * Maps entity data to PDF form field names.
 * Single source of truth for the template-to-data mapping.
 * Adding new fields requires only adding an entry here.
 */
export interface DocumentData {
  requestReferenceId: string;
  confirmationDate: string;
  maskedVin: string;
  yearMakeModel: string;
  contractReference: string;
}

/**
 * Returns a record mapping PDF AcroForm field names to their values.
 * Keys must match the field names in the AcroForm template
 * (backend/assets/templates/confirmation.pdf).
 */
export function mapFields(data: DocumentData): Record<string, string> {
  return {
    referenceId: data.requestReferenceId,
    confirmationDate: data.confirmationDate,
    maskedVin: data.maskedVin,
    vehicle: data.yearMakeModel,
    contractRef: data.contractReference,
  };
}
