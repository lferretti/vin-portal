import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { NgClass } from '@angular/common';

export interface StepConfig {
  id: string;
  label: string;
}

/**
 * Progress stepper component for wizard flows
 * Shows current step, completed steps, and upcoming steps
 */
@Component({
  selector: 'app-progress-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  template: `
    <nav aria-label="Progress" class="py-4">
      <ol class="flex items-center justify-center gap-2 sm:gap-4">
        @for (step of steps(); track step.id; let i = $index) {
          <li class="flex items-center">
            <div class="flex items-center gap-2">
              <span
                class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all duration-200"
                [ngClass]="getStepClasses(i)"
              >
                @if (i < currentStep()) {
                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                } @else {
                  {{ i + 1 }}
                }
              </span>
              <span
                class="hidden text-sm font-medium sm:inline"
                [ngClass]="getLabelClasses(i)"
              >
                {{ step.label }}
              </span>
            </div>
            @if (i < steps().length - 1) {
              <div
                class="mx-2 h-0.5 w-8 transition-colors duration-200 sm:w-12"
                [ngClass]="getConnectorClasses(i)"
              ></div>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class ProgressStepperComponent {
  steps = input<StepConfig[]>([]);
  currentStep = input<number>(0);

  getStepClasses(index: number): Record<string, boolean> {
    const current = this.currentStep();
    return {
      'bg-primary-600 text-white': index < current,
      'bg-primary-100 text-primary-700 ring-2 ring-primary-600': index === current,
      'bg-slate-100 text-slate-500': index > current,
    };
  }

  getLabelClasses(index: number): Record<string, boolean> {
    const current = this.currentStep();
    return {
      'text-slate-900': index <= current,
      'text-slate-500': index > current,
    };
  }

  getConnectorClasses(index: number): Record<string, boolean> {
    return {
      'bg-primary-600': index < this.currentStep(),
      'bg-slate-200': index >= this.currentStep(),
    };
  }
}

