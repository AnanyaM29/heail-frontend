import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OrgOrderService } from '../../../core/services/org-order.service';
import { EmployeeRow, RowError } from '../../../core/models/org-order.models';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_LEVELS = ['L', 'MM', 'E'];

const INDUSTRY_OPTIONS = [
  'IT / Technology',
  'Banking & Financial Services',
  'Manufacturing',
  'Healthcare',
  'Retail & E-commerce',
  'Education',
  'Consulting',
  'Real Estate & Construction',
  'Hospitality & Travel',
  'Government & Public Sector',
  'Other'
];

// Same short list used on the register/partners pages' mobile country-code selects.
const MOBILE_CCS = ['+971', '+91', '+65', '+61', '+44', '+1']; // longest-prefix-first for matching

/** Splits a stored "+91XXXXXXXXXX"-style mobile back into {cc, number} for editing.
 *  Falls back to +91 with the digits as-is if no recognised prefix is found — covers
 *  rows saved before the country-code selector existed. */
function splitMobile(raw: string): { cc: string; number: string } {
  const trimmed = (raw ?? '').trim();
  for (const cc of MOBILE_CCS) {
    if (trimmed.startsWith(cc)) return { cc, number: trimmed.slice(cc.length) };
  }
  return { cc: '+91', number: trimmed.replace(/\D/g, '') };
}

@Component({
  selector: 'app-buy-org-form',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './buy-org-form.component.html',
  styleUrl: './buy-org-form.component.css'
})
export class BuyOrgFormComponent implements OnInit {
  private orgOrders = inject(OrgOrderService);
  private router = inject(Router);

  industryOptions = INDUSTRY_OPTIONS;

  orderId = signal<string | null>(null);
  rows = signal<EmployeeRow[]>([{ name: '', email: '', mobileCc: '+91', mobile: '', level: 'L' }]);
  csvNotice = signal(false);
  loading = signal(true);
  submitting = signal(false);
  error = signal('');
  rowErrors = signal<RowError[]>([]);
  csvError = signal('');

  // Every account self-registers the same way (see register.component.ts) —
  // organisation name and headcount aren't known yet, so they're collected
  // here, on the first visit to this page, alongside industry. The account
  // is promoted to ORG_ADMIN server-side once these are first saved.
  organisationName = signal('');
  orgHeadcount = signal<number | null>(null);
  minRequired = signal<number>(1);
  // True once headcount is known server-side (either already saved from a
  // previous visit, or just saved by this submit) — distinct from
  // orgHeadcount() itself, which also doubles as the live, unsaved form value.
  orgSaved = signal(false);
  industry = signal('');
  industryOther = signal('');
  orgDetailsTouched = signal(false);

  get isIndustryOther() { return this.industry() === 'Other'; }
  get industryInvalid() {
    if (!this.orgDetailsTouched()) return false;
    if (!this.industry()) return true;
    return this.isIndustryOther && !this.industryOther().trim();
  }
  get orgNameInvalid() { return this.orgDetailsTouched() && !this.organisationName().trim(); }
  get headcountInvalid() { return this.orgDetailsTouched() && (!this.orgHeadcount() || this.orgHeadcount()! < 1); }

  ngOnInit() {
    this.orgOrders.createOrGetOrder().subscribe({
      next: res => {
        this.orderId.set(res.order.id);
        this.organisationName.set(res.orgName ?? '');
        this.orgHeadcount.set(res.orgHeadcount ?? null);
        this.minRequired.set(res.minEmployeesRequired ?? 1);
        this.orgSaved.set(res.orgHeadcount != null);
        if (res.orgIndustry && !this.industryOptions.includes(res.orgIndustry)) {
          this.industry.set('Other');
          this.industryOther.set(res.orgIndustry);
        } else if (res.orgIndustry) {
          this.industry.set(res.orgIndustry);
        }
        if (res.employees.length > 0) {
          this.rows.set(res.employees.map(e => {
            const { cc, number } = splitMobile(e.mobile ?? '');
            return { name: e.name, email: e.email, mobileCc: cc, mobile: number, level: e.level };
          }));
        }
        this.loading.set(false);
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  onHeadcountInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.orgHeadcount.set(value ? Number(value) : null);
  }

  onIndustryChange(value: string) {
    this.industry.set(value);
    this.orgDetailsTouched.set(true);
  }

  addRow() {
    this.rows.update(r => [...r, { name: '', email: '', mobileCc: '+91', mobile: '', level: 'L' }]);
  }

  removeRow(i: number) {
    this.rows.update(rows => rows.length <= 1 ? rows : rows.filter((_, idx) => idx !== i));
    // Row indices shift after a removal, so any previously reported server-side
    // row error no longer lines up with the right row — clear them rather than
    // show a stale message on the wrong entry.
    this.rowErrors.set([]);
  }

  /** Resets the whole employee list back to one blank row. Instant and
   *  unconfirmed by design — it's a quick "start over" while drafting, not a
   *  destructive server-side action (nothing is saved until "Continue to
   *  Agreement" is pressed). */
  clearAll() {
    this.rows.set([{ name: '', email: '', mobileCc: '+91', mobile: '', level: 'L' }]);
    this.rowErrors.set([]);
    this.csvNotice.set(false);
    this.csvError.set('');
  }

  updateRow(i: number, field: keyof EmployeeRow, value: string) {
    this.rows.update(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  rowError(i: number): string | null {
    return this.rowErrors().find(e => e.index === i + 1)?.message ?? null;
  }

  /** Which specific input in the row should be outlined red — inferred from
   *  the error message's wording so the field, not just the row, is obvious. */
  fieldError(i: number, field: 'name' | 'email' | 'mobile' | 'level'): boolean {
    const msg = this.rowError(i);
    if (!msg) return false;
    const m = msg.toLowerCase();
    return m.includes(field);
  }

  onMobileInput(i: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    this.updateRow(i, 'mobile', digitsOnly);
  }

  downloadTemplate() {
    const csv = 'S.No,Name,Email,Mobile,Level\n1,Jane Doe,jane@company.com,9876543210,MM\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HEAIL_Employee_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  onCsvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.parseCsv(String(reader.result ?? ''));
    reader.readAsText(file);
    input.value = '';
  }

  /** Detects binary content (e.g. an .xlsx renamed to .csv) by the ratio of non-printable characters. */
  private looksBinary(text: string): boolean {
    if (text.startsWith('PK')) return true; // .xlsx/.docx/.zip signature
    const sampleLen = Math.min(text.length, 1000);
    if (sampleLen === 0) return false;
    let nonPrintable = 0;
    for (let i = 0; i < sampleLen; i++) {
      const code = text.charCodeAt(i);
      if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) nonPrintable++;
    }
    return nonPrintable / sampleLen > 0.05;
  }

  private parseCsv(text: string) {
    this.csvError.set('');

    if (this.looksBinary(text)) {
      this.csvError.set('This looks like an Excel file, not a CSV — please save it as a real .csv file (not just renamed) and try again.');
      return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    // Header row is required, columns matched by name (order-independent) — not by fixed position.
    const headerCells = lines[0].split(',').map(c => c.trim().toLowerCase());
    const findCol = (...names: string[]) => headerCells.findIndex(h => names.includes(h));

    const nameIdx = findCol('name');
    const emailIdx = findCol('email');
    const mobileIdx = findCol('mobile', 'mobile (optional)');
    const levelIdx = findCol('level', 'type');

    if (nameIdx === -1 || emailIdx === -1) {
      this.csvError.set('Could not find "Name" and "Email" column headers. Please include the header row (S.No, Name, Email, Mobile, Level) — download the template below if needed.');
      return;
    }

    const parsed: EmployeeRow[] = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim());
      const rawMobile = mobileIdx !== -1 ? (cols[mobileIdx] ?? '') : '';
      const { cc, number } = splitMobile(rawMobile);
      return {
        name: cols[nameIdx] ?? '',
        email: cols[emailIdx] ?? '',
        mobileCc: cc,
        mobile: number,
        level: (levelIdx !== -1 ? (cols[levelIdx] ?? 'L') : 'L').toUpperCase()
      };
    });

    this.rows.set(parsed);
    this.csvNotice.set(true);
  }

  /** Mirrors the backend's own validation (OrgOrderService.setEmployees) so
   *  obviously-bad submissions never even hit the network — name required,
   *  valid/unique email, level set, minimum headcount. The server still
   *  re-validates everything itself; this is just to fail fast in the UI. */
  private validate(rows: EmployeeRow[]): RowError[] {
    const errors: RowError[] = [];
    const seenEmails = new Set<string>();

    rows.forEach((row, i) => {
      const rowNumber = i + 1;
      const name = (row.name ?? '').trim();
      const email = (row.email ?? '').trim();
      const mobile = (row.mobile ?? '').trim();
      const level = (row.level ?? '').trim().toUpperCase();

      if (!name) { errors.push({ index: rowNumber, message: 'Name is required' }); return; }
      if (!EMAIL_PATTERN.test(email)) { errors.push({ index: rowNumber, message: 'A valid email is required' }); return; }
      const normalised = email.toLowerCase();
      if (seenEmails.has(normalised)) { errors.push({ index: rowNumber, message: 'Duplicate email within this submission' }); return; }
      if (mobile && mobile.length !== 10) { errors.push({ index: rowNumber, message: 'Mobile must be exactly 10 digits, or left blank' }); return; }
      if (!VALID_LEVELS.includes(level)) { errors.push({ index: rowNumber, message: 'Level must be selected' }); return; }
      seenEmails.add(normalised);
    });

    return errors;
  }

  submit() {
    const id = this.orderId();
    if (!id) return;

    this.error.set('');
    this.rowErrors.set([]);
    this.orgDetailsTouched.set(true);

    if (!this.organisationName().trim()) {
      this.error.set('Please enter your organisation name.');
      return;
    }
    if (!this.orgHeadcount() || this.orgHeadcount()! < 1) {
      this.error.set('Please enter your organisation headcount.');
      return;
    }
    if (!this.industry() || (this.isIndustryOther && !this.industryOther().trim())) {
      this.error.set('Please select your industry.');
      return;
    }

    const rows = this.rows();
    const errors = this.validate(rows);
    if (errors.length > 0) {
      this.rowErrors.set(errors);
      return;
    }

    // Compose the country code back into the mobile number just before sending —
    // mobileCc is only a UI-editing convenience, the backend/CSV format expects
    // one plain "mobile" string per employee.
    const payloadRows = rows.map(r => ({
      ...r,
      mobile: r.mobile ? r.mobileCc + r.mobile : ''
    }));

    const industryValue = this.isIndustryOther ? this.industryOther().trim() : this.industry();

    this.submitting.set(true);
    this.orgOrders.setOrgDetails(id, this.organisationName().trim(), this.orgHeadcount()!, industryValue).subscribe({
      next: res => {
        // The minimum required is only knowable once headcount is saved (first
        // time through, it defaults to 1 while the org doesn't exist yet) — so
        // the row-count check runs here, against the value the server just returned.
        const min = res.minEmployeesRequired ?? 1;
        this.minRequired.set(min);
        this.orgSaved.set(true);
        if (rows.length < min) {
          this.submitting.set(false);
          this.error.set(`Minimum ${min} employees required for your organisation size (${rows.length} entered).`);
          return;
        }

        this.orgOrders.setEmployees(id, payloadRows).subscribe({
          next: () => this.router.navigate(['/pricing/agreement-org', id]),
          error: (e: any) => {
            this.submitting.set(false);
            if (e?.error?.rowErrors) this.rowErrors.set(e.error.rowErrors);
            else this.error.set(this.msg(e));
          }
        });
      },
      error: (e: any) => {
        this.submitting.set(false);
        this.error.set(this.msg(e));
      }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
