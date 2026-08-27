import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-transformation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './transformation.component.html'
})
export class TransformationComponent {
  videoPlaying = signal(true);
  videoMuted = signal(true);
}
