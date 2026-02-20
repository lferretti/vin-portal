/**
 * Request body for emailing a confirmation document
 */
export interface EmailDocumentRequest {
  email: string;
}

/**
 * Response data from the email document endpoint
 */
export interface EmailDocumentData {
  requestId: string;
  sent: boolean;
}
