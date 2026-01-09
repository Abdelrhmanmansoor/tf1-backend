/**
 * Modern CV Template
 * Clean and contemporary resume template
 * 
 * Features:
 * - Minimalist design
 * - Two-column layout option
 * - Icon support for categories
 * - Professional typography
 */

import { BaseTemplate, ITemplate, RenderOptions } from './base.template';

export class ModernCVTemplate extends BaseTemplate {
  readonly metadata: ITemplate = {
    id: 'modern-cv',
    name: 'ModernCV',
    displayName: 'Modern CV',
    description: 'Clean and contemporary CV template with minimalist design',
    category: 'modern',
    format: 'latex',
    version: '1.0.0',
    defaultTheme: 'blue',
  };

  readonly latexSource = `
\\documentclass[11pt,a4paper,sans]{moderncv}

\\moderncvstyle{classic}
\\moderncvcolor{blue}

\\usepackage[scale=0.75]{geometry}
\\usepackage[utf8]{inputenc}

\\firstname{{{personalInfo.firstName}}}
\\familyname{{{personalInfo.lastName}}}
\\title{{{personalInfo.title}}}
\\address{{{{personalInfo.address}}}}
\\phone[mobile]{{{personalInfo.phone}}}
\\email{{{personalInfo.email}}}
\\homepage{{{personalInfo.website}}}

\\begin{document}

\\makecvtitle

{{#if summary}}
\\section{Professional Summary}
{{summary}}
{{/if}}

{{#if experience}}
\\section{Work Experience}
{{#each experience}}
\\cventry
{{{this.startDate}} -- {{#if this.currentlyWorking}}Present{{else}}{{this.endDate}}{{/if}}}
{{{this.jobTitle}}}
{{{this.company}}}
{{{this.location}}}
{}
{{{this.description}}}
{{/each}}
{{/if}}

{{#if education}}
\\section{Education}
{{#each education}}
\\cventry
{{{this.graduationYear}}}
{{{this.fieldOfStudy}}}
{{{this.institution}}}
{{{this.location}}}
{GPA: {{this.gpa}}}
{{{this.details}}}
{{/each}}
{{/if}}

{{#if skills}}
\\section{Skills}
{{#each skills}}
\\cvitem{{{this.category}}}{{{join this.items ', '}}}
{{/each}}
{{/if}}

{{#if languages}}
\\section{Languages}
{{#each languages}}
\\cvitemwithcomment{{{this.language}}}{{{this.proficiency}}}{}
{{/each}}
{{/if}}

{{#if certifications}}
\\section{Certifications}
{{#each certifications}}
\\cvitem{{{this.name}}}{{{this.issuer}} - {{this.date}}}
{{/each}}
{{/if}}

{{#if projects}}
\\section{Projects}
{{#each projects}}
\\cventry
{}
{{{this.name}}}
{}
{}
{}
{{{this.description}}}
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
    'languages',
    'certifications',
    'projects',
  ];

  readonly cssSource = `
.modern-cv {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #333;
}

.modern-cv .header {
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 20px;
  margin-bottom: 30px;
}

.modern-cv .name {
  font-size: 28px;
  font-weight: bold;
  color: var(--heading-color);
}

.modern-cv .title {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.modern-cv .section {
  margin-bottom: 25px;
}

.modern-cv .section-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--heading-color);
  border-left: 4px solid var(--accent-color);
  padding-left: 10px;
  margin-bottom: 15px;
}

.modern-cv .entry {
  margin-bottom: 12px;
}

.modern-cv .entry-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.modern-cv .entry-title {
  font-weight: 600;
}

.modern-cv .entry-subtitle {
  font-style: italic;
  color: #666;
}

.modern-cv .entry-date {
  font-size: 12px;
  color: #999;
}
  `;
}

export default ModernCVTemplate;
