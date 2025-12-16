import { Component, input } from '@angular/core';
import { VinDecoded } from '@core/models';

/**
 * Component for displaying decoded VIN information
 */
@Component({
  selector: 'app-vin-display',
  standalone: true,
  template: `
    <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <dl class="grid grid-cols-3 gap-4 text-center">
        <div>
          <dt class="text-xs text-slate-500 uppercase tracking-wide mb-1">Year</dt>
          <dd class="text-lg font-semibold text-slate-900">{{ decoded().year }}</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 uppercase tracking-wide mb-1">Make</dt>
          <dd class="text-lg font-semibold text-slate-900">{{ decoded().make }}</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500 uppercase tracking-wide mb-1">Model</dt>
          <dd class="text-lg font-semibold text-slate-900">{{ decoded().model }}</dd>
        </div>
      </dl>
    </div>
  `,
})
export class VinDisplayComponent {
  decoded = input.required<VinDecoded>();
}

