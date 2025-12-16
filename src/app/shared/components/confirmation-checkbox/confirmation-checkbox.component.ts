import { Component, input, output, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Confirmation checkbox component for irreversible actions
 */
@Component({
  selector: 'app-confirmation-checkbox',
  standalone: true,
  imports: [FormsModule],
  template: `
    <label
      class="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all"
      [class.border-primary-500]="checked()"
      [class.bg-primary-50]="checked()"
      [class.border-slate-300]="!checked()"
      [class.hover:border-primary-400]="!checked()"
    >
      <input
        type="checkbox"
        [ngModel]="checked()"
        (ngModelChange)="onCheckedChange($event)"
        class="mt-0.5 h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        [attr.aria-describedby]="describedBy()"
      />
      <span class="text-sm text-slate-700">
        {{ label() }}
      </span>
    </label>
  `,
})
export class ConfirmationCheckboxComponent {
  label = input.required<string>();
  checked = model<boolean>(false);
  describedBy = input<string>('');

  checkedChange = output<boolean>();

  onCheckedChange(value: boolean): void {
    this.checked.set(value);
    this.checkedChange.emit(value);
  }
}

