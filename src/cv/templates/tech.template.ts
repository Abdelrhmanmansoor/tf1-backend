/**
 * Tech Resume Template
 * Optimized for tech professionals
 */

import { BaseTemplate, ITemplate } from './base.template';

export class TechTemplate extends BaseTemplate {
  readonly metadata: ITemplate = {
    id: 'tech',
    name: 'TechResume',
    displayName: 'Tech Resume',
    description: 'Resume template optimized for tech professionals',
    category: 'modern',
    format: 'html',
    version: '1.0.0',
    defaultTheme: 'blue',
  };

  readonly latexSource = `
\\documentclass[11pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{xcolor}

\\definecolor{techblue}{HTML}{1E40AF}

\\pagestyle{empty}

\\begin{document}

{\\Large\\textbf{{{personalInfo.name}}}} \\hfill {{personalInfo.email}} | {{personalInfo.phone}}

\\vspace{0.15in}

{{#if skills}}
\\textcolor{techblue}{\\textbf{TECHNICAL SKILLS}}
\\\\
{{#each skills}}
{\\textbf{{{this.category}}}: } {{join this.items ', '}} \\\\
{{/each}}
\\vspace{0.1in}
{{/if}}

{{#if experience}}
\\textcolor{techblue}{\\textbf{EXPERIENCE}}
{{#each experience}}
\\\\
{\\textbf{{{this.jobTitle}}}} -- {{this.company}} \\hfill {{monthYear this.startDate}}--{{monthYear this.endDate}}
\\\\
{{this.description}}
{{/each}}
\\vspace{0.1in}
{{/if}}

{{#if projects}}
\\textcolor{techblue}{\\textbf{PROJECTS}}
{{#each projects}}
\\\\
{\\textbf{{{this.name}}}: } {{this.description}}
{{#if this.technologies}} \\emph{({{join this.technologies ', '}}){{/if}}
{{/each}}
{{/if}}

\\end{document}
  `;

  readonly supportedSections = [
    'personalInfo',
    'skills',
    'experience',
    'projects',
    'education',
  ];
}

export default TechTemplate;
