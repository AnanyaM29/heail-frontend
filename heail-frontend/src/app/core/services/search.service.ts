import { Injectable } from '@angular/core';

export interface SearchEntry {
  title: string;
  description: string;
  route: string;
  fragment?: string;
}

export interface SearchResult extends SearchEntry {
  titleMatch: boolean;
}

const ENTRIES: SearchEntry[] = [
  { title: 'Home', description: 'What is measured can be improved. Human Experience + AI Logic.', route: '/' },
  { title: 'For Organisations', description: 'Every organisation transforms. Few transform on purpose. Diagnose, decide, transform.', route: '/for-organisations' },
  { title: 'For Aspiring Professionals · The Gita Leader', description: 'Fifty timeless management principles, five domains, one honest score, and a year-long path to change it.', route: '/for-leaders' },
  { title: 'The Foundation of The Gita Leader', description: 'Built on a 5,000-year-old conversation.', route: '/for-leaders/foundation' },
  { title: 'For HR Teams', description: "Start with your job description. We'll build the measurement around it. Screening with judgement, not just filters.", route: '/for-hr' },
  { title: 'For Students', description: 'Know where you stand before the world tells you. Aptitude, readiness and level-based assessments — coming soon.', route: '/for-students' },
  { title: 'Transformation', description: 'The same four bottlenecks, in every organisation.', route: '/transformation' },
  { title: 'Pricing', description: 'Assessment prices, the Gita Leader Assessment, Pulse Diagnostic Suite, Leadership and Transformation programs, HR Solutions.', route: '/pricing' },
  { title: 'HR Solutions Pricing', description: 'Share your JD. Select your assessments. Candidate screening and interview/HR-round assessments.', route: '/pricing', fragment: 'hrPricing' },
  { title: 'Partners', description: 'Grow with HEAIL in your city. Consultants, trainers, coaches, and HR professionals.', route: '/partners' },
  { title: 'Our Foundation', description: "Our foundation is not a method. It is a conviction. Why AI alone is not enough, why experience alone is not enough.", route: '/foundation' },
  { title: 'Contact Us', description: 'Talk to HEAIL. Write to us or message on WhatsApp.', route: '/contact' },
  { title: 'Privacy Policy', description: 'What personal data HEAIL collects and how it is used.', route: '/privacy' },
  { title: 'Terms of Use & Refund Policy', description: 'Terms of service, assessment purchase terms, and the refund/cancellation policy.', route: '/terms' },
  { title: 'Login', description: 'Sign in to HEAIL.', route: '/login' },
  { title: 'Register', description: 'Create your HEAIL account as a Company or an Aspiring Professional.', route: '/register' },
];

@Injectable({ providedIn: 'root' })
export class SearchService {
  search(query: string): SearchResult[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResult[] = [];
    for (const entry of ENTRIES) {
      const titleMatch = entry.title.toLowerCase().includes(q);
      const descMatch = entry.description.toLowerCase().includes(q);
      if (titleMatch || descMatch) {
        results.push({ ...entry, titleMatch });
      }
    }

    return results.sort((a, b) => Number(b.titleMatch) - Number(a.titleMatch));
  }
}
