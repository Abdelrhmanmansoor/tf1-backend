/**
 * Creative Resume Template
 * Creative and unique resume layout
 */

import { BaseTemplate, ITemplate } from './base.template';

export class CreativeTemplate extends BaseTemplate {
  readonly metadata: ITemplate = {
    id: 'creative',
    name: 'Creative',
    displayName: 'Creative Resume',
    description: 'Creative and unique resume layout with modern design',
    category: 'creative',
    format: 'html',
    version: '1.0.0',
    defaultTheme: 'blue',
  };

  readonly latexSource = `
\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{xcolor}
\\usepackage{tikz}

\\definecolor{accent}{HTML}{1E40AF}

\\pagestyle{empty}

\\begin{document}

\\begin{tikzpicture}[remember picture,overlay]
\\node[anchor=north east,inner sep=20pt] at (current page.north east) {
\\begin{tabular}{l}
{{personalInfo.email}} \\\\
{{personalInfo.phone}}
\\end{tabular}
};
\\end{tikzpicture}

{\\Huge \\bfseries {{personalInfo.name}}}
\\\\
{\\Large {{personalInfo.title}}}

\\vspace{0.3in}

{{#each experience}}
\\textcolor{accent}{\\textbf{{{this.jobTitle}}}}
\\\\
{\\normalsize {{this.company}} -- {{monthYear this.startDate}} to {{monthYear this.endDate}}}
\\\\
{{this.description}}
\\\\

{{/each}}

\\end{document}
  `;

  readonly supportedSections = [
    'personalInfo',
    'experience',
    'education',
    'skills',
    'projects',
  ];
}

export default CreativeTemplate;
