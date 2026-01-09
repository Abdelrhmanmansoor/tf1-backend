/**
 * Simple Resume Template
 */

import { BaseTemplate, ITemplate } from './base.template';

export class SimpleTemplate extends BaseTemplate {
  readonly metadata: ITemplate = {
    id: 'simple',
    name: 'SimpleResume',
    displayName: 'Simple Resume',
    description: 'Simple and straightforward resume template',
    category: 'classic',
    format: 'html',
    version: '1.0.0',
    defaultTheme: 'gray',
  };

  readonly latexSource = `
\\documentclass[11pt]{article}
\\usepackage[margin=0.75in]{geometry}

\\begin{document}

\\centerline{{\\Large \\bf {{personalInfo.name}}}}
\\centerline{{{personalInfo.email}} | {{personalInfo.phone}}}

\\vspace{0.2in}

{{#if experience}}
\\section*{Experience}
{{#each experience}}
{{this.jobTitle}} - {{this.company}} \\hfill {{monthYear this.startDate}}--{{monthYear this.endDate}}
\\\\
{{this.description}}
\\vspace{0.1in}
{{/each}}
{{/if}}

{{#if education}}
\\section*{Education}
{{#each education}}
{{this.fieldOfStudy}} - {{this.institution}} \\hfill {{this.endDate}}
\\vspace{0.1in}
{{/each}}
{{/if}}

{{#if skills}}
\\section*{Skills}
{{#each skills}}
{{this.category}}: {{join this.items ', '}}
\\\\
{{/each}}
{{/if}}

\\end{document}
  `;

  readonly supportedSections = [
    'personalInfo',
    'experience',
    'education',
    'skills',
  ];
}

export default SimpleTemplate;
