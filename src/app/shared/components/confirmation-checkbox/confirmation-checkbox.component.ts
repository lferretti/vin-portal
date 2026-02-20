import { Component, ChangeDetectionStrategy, input, output, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Confirmation checkbox component for irreversible actions
 */
@Component({
  selector: 'app-confirmation-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <label
      class="flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all"
      [class.border-primary-500]="checked()"
      [class.bg-primary-50]="checked()"
      [class.border-slate-300]="!checked()"
      [class.hover:border-primary-400]="!checked()"
    >
      <input
        type="checkbox"
        [ngModel]="checked()"
        (ngModelChange)="onCheckedChange($event)"
        class="text-primary-600 focus:ring-primary-500 mt-0.5 h-5 w-5 rounded border-slate-300"
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

