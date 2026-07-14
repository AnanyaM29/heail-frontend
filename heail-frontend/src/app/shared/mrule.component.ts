import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-mrule',
  standalone: true,
  template: `
    <div class="mrule" [class.mrule-short]="short" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      @if (!short) {
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      }
    </div>
  `,
  styles: [`
    .mrule-short { margin: 18px 0; }
  `]
})
export class MruleComponent {
  @Input() short = false;
}
