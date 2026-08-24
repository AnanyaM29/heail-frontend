import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-leaders', standalone: true, imports: [RouterLink], templateUrl: './leaders.component.html' })
export class LeadersComponent {
  videoPlaying = signal(true);
}
