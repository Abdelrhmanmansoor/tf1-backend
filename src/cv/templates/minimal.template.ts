/**
 * Minimal Resume Template
 * Minimalist resume with focus on content
 */

import { BaseTemplate, ITemplate } from './base.template';

export class MinimalTemplate extends BaseTemplate {
  readonly metadata: ITemplate = {
    id: 'minimal',
    name: 'Minimal',
    displayName: 'Minimal Resume',
    description: 'Minimalist resume with focus on content',
    category: 'minimal',
    format: 'html',
    version: '1.0.0',
    defaultTheme: 'black',
  };

  readonly latexSource = `
\\documentclass[11pt]{article}
\\usepackage[margin=0.5in]{geometry}
\\usepackage{hyperref}
\\pagestyle{empty}

\\begin{document}

\\noindent{{\\Large \\bf {{personalInfo.name}}}}
\\hfill {{personalInfo.email}} | {{personalInfo.phone}}

\\vspace{0.15in}
\\noindent\\rule{\\textwidth}{0.5pt}

{{#each experience}}
{\\bf {{this.jobTitle}} -- {{this.company}}} \\hfill {{monthYear this.startDate}}\\\\
{{this.description}}

{{/each}}

{{#each education}}
{\\bf {{this.fieldOfStudy}} -- {{this.institution}}} \\hfill {{this.endDate}}

{{/each}}

\\end{document}
  `;

  readonly supportedSections = [
    'personalInfo',
    'experience',
    'education',
    'skills',
  ];
}

export default MinimalTemplate;
