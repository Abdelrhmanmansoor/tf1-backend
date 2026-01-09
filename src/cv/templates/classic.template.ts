/**
 * Classic Resume Template
 * Traditional and timeless resume layout
 * 
 * Features:
 * - Classic formal design
 * - Traditional section layout
 * - Professional appearance
 * - Wide compatibility
 */

import { BaseTemplate, ITemplate, RenderOptions } from './base.template';

export class ClassicTemplate extends BaseTemplate {
  readonly metadata: ITemplate = {
    id: 'classic',
    name: 'ClassicResume',
    displayName: 'Classic Resume',
    description: 'Traditional and timeless resume layout with formal design',
    category: 'classic',
    format: 'html',
    version: '1.0.0',
    defaultTheme: 'gray',
  };

  readonly latexSource = `
\\documentclass[11pt]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large \\bf {{personalInfo.name}}}\\\\
{{personalInfo.email}} | {{personalInfo.phone}} | {{personalInfo.location}}
\\end{center}

\\vspace{0.25in}

{{#if summary}}
\\section*{PROFESSIONAL SUMMARY}
{{summary}}

\\vspace{0.15in}
{{/if}}

{{#if experience}}
\\section*{PROFESSIONAL EXPERIENCE}

{{#each experience}}
{\\bf {{this.jobTitle}}} \\hfill {{monthYear this.startDate}} -- {{#if this.currentlyWorking}}Present{{else}}{{monthYear this.endDate}}{{/if}}\\\\
{{this.company}} | {{this.location}}
\\begin{itemize}[noitemsep]
\\item {{this.description}}
\\end{itemize}

{{/each}}

\\vspace{0.15in}
{{/if}}

{{#if education}}
\\section*{EDUCATION}

{{#each education}}
{\\bf {{this.fieldOfStudy}}} \\hfill {{this.endDate}}\\\\
{{this.institution}} | {{this.location}}\\\\
{{#if this.gpa}}GPA: {{this.gpa}}{{/if}}

{{/each}}

\\vspace{0.15in}
{{/if}}

{{#if skills}}
\\section*{SKILLS}

{{#each skills}}
{\\bf {{this.category}}:} {{join this.items ', '}}\\\\
{{/each}}

\\vspace{0.15in}
{{/if}}

{{#if certifications}}
\\section*{CERTIFICATIONS}

\\begin{itemize}[noitemsep]
{{#each certifications}}
\\item {{this.name}} -- {{this.issuer}} ({{monthYear this.date}})
{{/each}}
\\end{itemize}

\\vspace{0.15in}
{{/if}}

{{#if languages}}
\\section*{LANGUAGES}

{{#each languages}}
{{this.language}} ({{this.proficiency}}){{#unless @last}}, {{/unless}}
{{/each}}

\\vspace{0.15in}
{{/if}}

{{#if projects}}
\\section*{PROJECTS}

{{#each projects}}
{\\bf {{this.name}}}\\\\
{{this.description}}\\\\
{{#if this.technologies}}Technologies: {{join this.technologies ', '}}{{/if}}

{{/each}}
{{/if}}

\\end{document}
  `;

  readonly supportedSections = [
    'personalInfo',
    'summary',
    'experience',
    'education',
    'skills',
    'certifications',
    'languages',
    'projects',
  ];

  readonly cssSource = `
.classic-cv {
  font-family: 'Times New Roman', serif;
  color: #000;
  max-width: 8.5in;
  margin: 0 auto;
  padding: 0.75in;
  line-height: 1.4;
}

.classic-cv .header {
  text-align: center;
  margin-bottom: 0.25in;
  border-bottom: 1px solid #000;
  padding-bottom: 0.1in;
}

.classic-cv .name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.classic-cv .contact {
  font-size: 12px;
}

.classic-cv .section {
  margin-top: 0.2in;
  margin-bottom: 0.2in;
}

.classic-cv .section-title {
  font-weight: bold;
  font-size: 13px;
  text-transform: uppercase;
  border-bottom: 1px solid #000;
  padding-bottom: 2px;
  margin-bottom: 0.1in;
}

.classic-cv .entry {
  margin-bottom: 0.1in;
}

.classic-cv .entry-header {
  display: flex;
  justify-content: space-between;
}

.classic-cv .entry-title {
  font-weight: bold;
}

.classic-cv .entry-subtitle {
  font-style: italic;
}

.classic-cv .entry-date {
  font-size: 11px;
}

.classic-cv ul {
  margin: 3px 0;
  padding-left: 20px;
}

.classic-cv li {
  margin-bottom: 2px;
  font-size: 11px;
}
  `;
}

export default ClassicTemplate;
