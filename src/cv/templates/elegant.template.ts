/**
 * Elegant CV Template
 */

import { BaseTemplate, ITemplate } from './base.template';

export class ElegantTemplate extends BaseTemplate {
  readonly metadata: ITemplate = {
    id: 'elegant',
    name: 'Elegant',
    displayName: 'Elegant CV',
    description: 'Sophisticated and elegant resume layout',
    category: 'modern',
    format: 'latex',
    version: '1.0.0',
    defaultTheme: 'blue',
  };

  readonly latexSource = `
\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{fontspec}
\\usepackage{xcolor}

\\setmainfont{Calibri}
\\definecolor{darkblue}{HTML}{1E40AF}

\\pagestyle{empty}

\\begin{document}

\\vspace*{-0.5in}

\\begin{center}
{{\\fontsize{24}{24}\\selectfont\\textbf{\\textcolor{darkblue}{{{personalInfo.name}}}}}}
\\\\
{{personalInfo.title}}
\\\\
{{personalInfo.email}} | {{personalInfo.phone}} | {{personalInfo.location}}
\\end{center}

\\vspace{0.2in}
\\noindent\\textcolor{darkblue}{\\rule{\\textwidth}{2pt}}
\\vspace{0.2in}

{{#if summary}}
{{summary}}
\\vspace{0.2in}
{{/if}}

{{#if experience}}
{\\large\\textbf{\\textcolor{darkblue}{Professional Experience}}}
\\vspace{0.1in}

{{#each experience}}
{{\\textbf{{{this.jobTitle}}} -- {\\itshape {{this.company}}}} \\hfill {{monthYear this.startDate}}--{{monthYear this.endDate}}
\\\\
{{this.description}}
\\vspace{0.1in}
{{/each}}
{{/if}}

{{#if education}}
{\\large\\textbf{\\textcolor{darkblue}{Education}}}
\\vspace{0.1in}

{{#each education}}
{{\\textbf{{{this.fieldOfStudy}}} -- {\\itshape {{this.institution}}}} \\hfill {{this.endDate}}
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

export default ElegantTemplate;
