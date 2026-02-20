import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { VinDecoded } from '@core/models';

/**
 * Component for displaying decoded VIN information
 */
@Component({
  selector: 'app-vin-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <dl class="grid grid-cols-3 gap-4 text-center">
        <div>
          <dt class="mb-1 text-xs tracking-wide text-slate-500 uppercase">Year</dt>
          <dd class="text-lg font-semibold text-slate-900">{{ decoded().year }}</dd>
        </div>
        <div>
          <dt class="mb-1 text-xs tracking-wide text-slate-500 uppercase">Make</dt>
          <dd class="text-lg font-semibold text-slate-900">{{ decoded().make }}</dd>
        </div>
        <div>
          <dt class="mb-1 text-xs tracking-wide text-slate-500 uppercase">Model</dt>
          <dd class="text-lg font-semibold text-slate-900">{{ decoded().model }}</dd>
        </div>
      </dl>
    </div>
  `,
})
export class VinDisplayComponent {
  decoded = input.required<VinDecoded>();
}

