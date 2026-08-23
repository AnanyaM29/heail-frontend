import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import * as XLSX from 'xlsx';
import { HrOrderService } from '../../../core/services/hr-order.service';
import { CandidateRow, RowError } from '../../../core/models/hr-candidate.models';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function blankRow(): CandidateRow {
  return { name: '', dob: '', email: '', mobileCc: '+91', mobile: '', assessmentStartDate: '' };
}

/** Same country-code-splitting trick as buy-org-form.component.ts. */
const MOBILE_CCS = ['+971', '+91', '+65', '+61', '+44', '+1'];
function splitMobile(raw: string): { cc: string; number: string } {
  const trimmed = (raw ?? '').trim();
  for (const cc of MOBILE_CCS) {
    if (trimmed.startsWith(cc)) return { cc, number: trimmed.slice(cc.length) };
  }
  return { cc: '+91', number: trimmed.replace(/\D/g, '') };
}

/** Step 2 of the HR product flow — who's actually taking the pillars picked
 *  on hr-select.component.ts. Every row here takes every selected pillar
 *  (see HrOrderService.setCandidates on the backend); price is pillars ×
 *  rows.length, computed server-side and shown live via loadOrder().
 *  Structurally a trimmed-down mirror of buy-org-form.component.ts — same
 *  manual-rows + CSV/Excel-upload shape, no org-details step. */
@Component({
  selector: 'app-candidates-entry',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './candidates-entry.component.html',
  styleUrl: './candidates-entry.component.css'
})
export class CandidatesEntryComponent implements OnInit {
  private hrOrders = inject(HrOrderService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  orderId = this.route.snapshot.paramMap.get('orderId')!;

  pillarNames = signal<string[]>([]);
  pricePerUnit = signal<number>(0);
  currency = signal('INR');

  rows = signal<CandidateRow[]>([blankRow()]);
  csvNotice = signal(false);
  csvError = signal('');
  loading = signal(true);
  submitting = signal(false);
  error = signal('');
  rowErrors = signal<RowError[]>([]);

  today = new Date().toISOString().slice(0, 10);

  ngOnInit() {
    this.hrOrders.getOrderWithCandidates(this.orderId).subscribe({
      next: res => {
        this.pillarNames.set(res.selectedAssessmentNames);
        if (res.candidates.length > 0) {
          this.rows.set(res.candidates.map(c => {
            const { cc, number } = splitMobile(c.mobile ?? '');
            return { name: c.name, dob: c.dob, email: c.email, mobileCc: cc, mobile: number, assessmentStartDate: c.assessmentStartDate };
          }));
        }
        this.loading.set(false);
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  addRow() {
    this.rows.update(r => [...r, blankRow()]);
  }

  removeRow(i: number) {
    this.rows.update(rows => rows.length <= 1 ? rows : rows.filter((_, idx) => idx !== i));
    this.rowErrors.set([]);
  }

  clearAll() {
    this.rows.set([blankRow()]);
    this.rowErrors.set([]);
    this.csvNotice.set(false);
    this.csvError.set('');
  }

  updateRow(i: number, field: keyof CandidateRow, value: string) {
    this.rows.update(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  rowError(i: number): string | null {
    return this.rowErrors().find(e => e.index === i + 1)?.message ?? null;
  }

  fieldError(i: number, field: 'name' | 'dob' | 'email' | 'mobile' | 'assessmentStartDate'): boolean {
    const msg = this.rowError(i);
    if (!msg) return false;
    const m = msg.toLowerCase();
    if (field === 'assessmentStartDate') return m.includes('start date');
    if (field === 'dob') return m.includes('birth');
    return m.includes(field);
  }

  onMobileInput(i: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    this.updateRow(i, 'mobile', digitsOnly);
  }

  downloadTemplate() {
    const header = ['Name', 'Date of Birth', 'Email Address', 'Mobile Number', 'Assessment Start Date'];
    const example = ['Jane Doe', '1995-06-14', 'jane@example.com', '9876543210', this.today];
    const sheet = XLSX.utils.aoa_to_sheet([header, example]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Candidates');
    XLSX.writeFile(workbook, 'HEAIL_Candidate_Template.xlsx');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const isExcel = /\.xlsx?$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (isExcel) this.parseWorkbook(reader.result as ArrayBuffer);
      else this.parseCsv(String(reader.result ?? ''));
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
    input.value = '';
  }

  private looksBinary(text: string): boolean {
    if (text.startsWith('PK')) return true;
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
    const headerCells = lines[0].split(',').map(c => c.trim().toLowerCase());
    this.applyRows(headerCells, lines.slice(1).map(line => line.split(',').map(c => c.trim())));
  }

  private parseWorkbook(data: ArrayBuffer) {
    this.csvError.set('');
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const grid: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' })
      .map((row: any) => (row as any[]).map(cell => String(cell ?? '').trim()));
    if (grid.length === 0) return;
    const headerCells = grid[0].map(c => c.toLowerCase());
    this.applyRows(headerCells, grid.slice(1));
  }

  /** Excel serial dates come back as numbers from XLSX.utils.sheet_to_json when
   *  the cell is formatted as a date — normalise both that and a plain string
   *  to yyyy-MM-dd so the <input type="date"> can display it. */
  private normaliseDate(raw: string): string {
    if (!raw) return '';
    if (/^\d+$/.test(raw)) {
      const parsed = XLSX.SSF.parse_date_code(Number(raw));
      if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? raw : d.toISOString().slice(0, 10);
  }

  private applyRows(headerCells: string[], dataRows: string[][]) {
    const findCol = (...names: string[]) => headerCells.findIndex(h => names.includes(h));

    const nameIdx = findCol('name');
    const dobIdx = findCol('date of birth', 'dob');
    const emailIdx = findCol('email', 'email address');
    const mobileIdx = findCol('mobile', 'mobile number');
    const startIdx = findCol('assessment start date', 'start date');

    if (nameIdx === -1 || emailIdx === -1) {
      this.csvError.set('Could not find "Name" and "Email Address" column headers. Please include the header row — download the template below if needed.');
      return;
    }

    const parsed: CandidateRow[] = dataRows.map(cols => {
      const rawMobile = mobileIdx !== -1 ? (cols[mobileIdx] ?? '') : '';
      const { cc, number } = splitMobile(rawMobile);
      return {
        name: cols[nameIdx] ?? '',
        dob: dobIdx !== -1 ? this.normaliseDate(cols[dobIdx] ?? '') : '',
        email: cols[emailIdx] ?? '',
        mobileCc: cc,
        mobile: number,
        assessmentStartDate: startIdx !== -1 ? this.normaliseDate(cols[startIdx] ?? '') : ''
      };
    });

    this.rows.set(parsed);
    this.csvNotice.set(true);
  }

  private validate(rows: CandidateRow[]): RowError[] {
    const errors: RowError[] = [];
    const seenEmails = new Set<string>();

    rows.forEach((row, i) => {
      const rowNumber = i + 1;
      const name = (row.name ?? '').trim();
      const email = (row.email ?? '').trim();
      const mobile = (row.mobile ?? '').trim();

      if (!name) { errors.push({ index: rowNumber, message: 'Name is required' }); return; }
      if (!EMAIL_PATTERN.test(email)) { errors.push({ index: rowNumber, message: 'A valid email is required' }); return; }
      const normalised = email.toLowerCase();
      if (seenEmails.has(normalised)) { errors.push({ index: rowNumber, message: 'Duplicate email within this submission' }); return; }
      if (!row.dob) { errors.push({ index: rowNumber, message: 'Date of birth is required' }); return; }
      if (mobile.length !== 10) { errors.push({ index: rowNumber, message: 'Mobile must be exactly 10 digits' }); return; }
      if (!row.assessmentStartDate) { errors.push({ index: rowNumber, message: 'Assessment start date is required' }); return; }
      if (row.assessmentStartDate < this.today) { errors.push({ index: rowNumber, message: 'Assessment start date can\'t be in the past' }); return; }
      seenEmails.add(normalised);
    });

    return errors;
  }

  submit() {
    this.error.set('');
    this.rowErrors.set([]);

    const rows = this.rows();
    const errors = this.validate(rows);
    if (errors.length > 0) {
      this.rowErrors.set(errors);
      return;
    }

    const payloadRows = rows.map(r => ({ ...r, mobile: r.mobileCc + r.mobile }));

    this.submitting.set(true);
    this.hrOrders.setCandidates(this.orderId, payloadRows).subscribe({
      next: () => this.router.navigate(['/pricing/buy-hr', this.orderId]),
      error: (e: any) => {
        this.submitting.set(false);
        if (e?.error?.rowErrors) this.rowErrors.set(e.error.rowErrors);
        else this.error.set(this.msg(e));
      }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
