import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { ApiEnvelope } from '@core/models';

/**
 * Base API service for HTTP operations
 * Handles common request/response patterns with the ApiEnvelope format
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * Perform a GET request
   */
  get<T>(path: string, options?: { headers?: HttpHeaders }): Observable<ApiEnvelope<T>> {
    return this.http.get<ApiEnvelope<T>>(`${this.baseUrl}${path}`, options);
  }

  /**
   * Perform a POST request
   */
  post<T>(
    path: string,
    body: unknown,
    options?: { headers?: HttpHeaders }
  ): Observable<ApiEnvelope<T>> {
    return this.http.post<ApiEnvelope<T>>(`${this.baseUrl}${path}`, body, options);
  }

  /**
   * Perform a PUT request
   */
  put<T>(
    path: string,
    body: unknown,
    options?: { headers?: HttpHeaders }
  ): Observable<ApiEnvelope<T>> {
    return this.http.put<ApiEnvelope<T>>(`${this.baseUrl}${path}`, body, options);
  }

  /**
   * Perform a DELETE request
   */
  delete<T>(path: string, options?: { headers?: HttpHeaders }): Observable<ApiEnvelope<T>> {
    return this.http.delete<ApiEnvelope<T>>(`${this.baseUrl}${path}`, options);
  }

  /**
   * Perform a GET request that returns a Blob (for binary downloads)
   */
  getBlob(path: string, options?: { headers?: HttpHeaders }): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${path}`, {
      ...options,
      responseType: 'blob',
    });
  }
}

