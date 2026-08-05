import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

// TEMPORARY — global outbound-email kill switch, callable from the home page
// with no login required. Remove this component's emailsEnabled state and
// stopEmails()/resumeEmails() methods, plus the button in home.component.html,
// once it's no longer needed. Backend counterpart: AdminEmailController.
const ADMIN_EMAILS_API = `${environment.apiBaseUrl}/api/v1/admin/emails`;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private http = inject(HttpClient);

  emailsEnabled = signal<boolean | null>(null); // null = not checked yet
  emailToggleBusy = signal(false);
  emailToggleMessage = signal('');

  ngOnInit() {
    this.http.get<{ enabled: boolean }>(`${ADMIN_EMAILS_API}/status`).subscribe({
      next: res => this.emailsEnabled.set(res.enabled),
      error: () => this.emailsEnabled.set(null)
    });
  }

  stopEmails() {
    this.emailToggleBusy.set(true);
    this.http.post<{ enabled: boolean; message: string }>(`${ADMIN_EMAILS_API}/disable`, {}).subscribe({
      next: res => {
        this.emailsEnabled.set(res.enabled);
        this.emailToggleMessage.set(res.message);
        this.emailToggleBusy.set(false);
      },
      error: () => this.emailToggleBusy.set(false)
    });
  }

  resumeEmails() {
    this.emailToggleBusy.set(true);
    this.http.post<{ enabled: boolean; message: string }>(`${ADMIN_EMAILS_API}/enable`, {}).subscribe({
      next: res => {
        this.emailsEnabled.set(res.enabled);
        this.emailToggleMessage.set(res.message);
        this.emailToggleBusy.set(false);
      },
      error: () => this.emailToggleBusy.set(false)
    });
  }
}
