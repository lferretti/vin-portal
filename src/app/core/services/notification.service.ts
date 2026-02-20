import { Injectable, signal, computed } from '@angular/core';

export interface Notification {
  id: number;
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: number;
}

const NOTIFICATION_TTL_MS = 8000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 0;
  private readonly _notifications = signal<Notification[]>([]);

  readonly notifications = computed(() => this._notifications());

  showError(message: string): void {
    this.add(message, 'error');
  }

  showWarning(message: string): void {
    this.add(message, 'warning');
  }

  showInfo(message: string): void {
    this.add(message, 'info');
  }

  dismiss(id: number): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }

  private add(message: string, type: Notification['type']): void {
    const id = this.nextId++;
    const notification: Notification = { id, message, type, timestamp: Date.now() };
    this._notifications.update((list) => [...list, notification]);

    setTimeout(() => this.dismiss(id), NOTIFICATION_TTL_MS);
  }
}
