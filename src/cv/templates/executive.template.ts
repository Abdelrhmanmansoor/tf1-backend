/**
 * Executive CV Template
 * Professional executive resume
 */

import { BaseTemplate, ITemplate } from './base.template';

export class ExecutiveTemplate extends BaseTemplate {
  readonly metadata: ITemplate = {
    id: 'executive',
    name: 'ExecutiveCV',
    displayName: 'Executive CV',
    description: 'Professional executive resume template',
    category: 'classic',
    format: 'latex',
    version: '1.0.0',
    defaultTheme: 'gray',
  };

  readonly latexSource = `
\\documentclass[12pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{fontspec}

\\setmainfont{Garamond}

\\pagestyle{empty}

\\begin{document}

\\centerline{{\\Large\\textbf{{{personalInfo.name}}}}}
\\centerline{{{personalInfo.title}}}
\\vspace{0.1in}
\\centerline{{{personalInfo.email}} $\\bullet$ {{personalInfo.phone}} $\\bullet$ {{personalInfo.location}}}

\\vspace{0.3in}

{{#if summary}}
\\noindent\\textbf{EXECUTIVE PROFILE}
\\\\
{{summary}}

\\vspace{0.2in}
{{/if}}

{{#if experience}}
\\noindent\\textbf{PROFESSIONAL EXPERIENCE}
\\vspace{0.1in}

{{#each experience}}
\\noindent{{\\textbf{{{this.jobTitle}}}}}\\hfill{{monthYear this.startDate}}--{{monthYear this.endDate}}
\\\\
{{this.company}} | {{this.location}}
\\\\
{{this.description}}
\\vspace{0.15in}

{{/each}}
{{/if}}

{{#if education}}
\\noindent\\textbf{EDUCATION}
\\vspace{0.1in}

{{#each education}}
{{this.fieldOfStudy}} \\hfill {{this.endDate}}
\\\\
{{this.institution}} | {{this.location}}
\\vspace{0.1in}

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
  ];
}

export default ExecutiveTemplate;
