import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type Category = 'people' | 'hr' | 'leadership' | 'growth';

@Component({
  selector: 'app-transformation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './transformation.component.html',
  styleUrl: './transformation.component.css'
})
export class TransformationComponent {
  videoPlaying = signal(true);
  videoMuted = signal(true);

  activeCategory = signal<Category>('people');
}
