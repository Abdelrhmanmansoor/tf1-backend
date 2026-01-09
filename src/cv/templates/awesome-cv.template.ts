/**
 * Awesome CV Template
 * Professional and modern CV template based on LaTeX
 * 
 * Features:
 * - Modern design with colored headers
 * - Section-based layout
 * - Customizable colors and fonts
 * - Clean and professional appearance
 */

import { BaseTemplate, ITemplate, RenderOptions } from './base.template';

export class AwesomeCVTemplate extends BaseTemplate {
  readonly metadata: ITemplate = {
    id: 'awesome-cv',
    name: 'AwesomeCV',
    displayName: 'Awesome CV',
    description: 'Professional and modern CV template with colored headers',
    category: 'modern',
    format: 'latex',
    version: '1.0.0',
    defaultTheme: 'blue',
  };

  readonly latexSource = `
\\documentclass[11pt, a4paper]{awesome-cv}

\\geometry{left=2cm, top=1.5cm, right=2cm, bottom=2cm, footskip=.5cm}

\\fontdir[fonts/]

\\colorlet{accent}{${accent}}
\\colorlet{emphasis}{${emphasis}}
\\colorlet{heading}{${heading}}

\\renewcommand{\\acvheaderfont}{\\fontspec{Roboto Medium}\\color{heading}}
\\renewcommand{\\acvtitlefont}{\\fontspec{Roboto}\\color{heading}}
\\renewcommand{\\acvsubtitlefont}{\\fontspec{Roboto Light}\\small\\color{text}}

\\begin{document}

%% Header
\\makecvheader[C]{
  {{personalInfo.name}}
}{
  {{personalInfo.title}}
}{
  {{personalInfo.email}} | {{personalInfo.phone}} | {{personalInfo.location}}
}

%% Summary
{{#if summary}}
\\cvsection{Professional Summary}
\\begin{cvparagraph}
{{summary}}
\\end{cvparagraph}
{{/if}}

%% Experience
{{#if experience}}
\\cvsection{Experience}
{{#each experience}}
\\cventry
{{{this.jobTitle}}}
{{{this.company}}}
{{{this.location}}}
{{{monthYear this.startDate}} -- {{#if this.currentlyWorking}}Present{{else}}{{monthYear this.endDate}}{{/if}}}
{
{{#if this.description}}
\\begin{cvitems}
\\item {{this.description}}
\\end{cvitems}
{{/if}}
}
{{/each}}
\\cvsection{}
{{/if}}

%% Education
{{#if education}}
\\cvsection{Education}
{{#each education}}
\\cventry
{{{this.fieldOfStudy}}}
{{{this.institution}}}
{{{this.location}}}
{Graduated {{monthYear this.endDate}}}
{
{{#if this.gpa}}
\\begin{cvitems}
\\item GPA: {{this.gpa}}
\\end{cvitems}
{{/if}}
}
{{/each}}
{{/if}}

%% Skills
{{#if skills}}
\\cvsection{Skills}
\\begin{cvskills}
{{#each skills}}
  \\cvskill
    {{{this.category}}}
    {{{join this.items ', '}}}
{{/each}}
\\end{cvskills}
{{/if}}

%% Projects
{{#if projects}}
\\cvsection{Projects}
{{#each projects}}
\\cventry
{{{this.name}}}
{{{this.description}}}
{}
{}
{
{{#if this.technologies}}
\\begin{cvitems}
\\item Technologies: {{join this.technologies ', '}}
\\end{cvitems}
{{/if}}
}
{{/each}}
{{/if}}

%% Certifications
{{#if certifications}}
\\cvsection{Certifications}
\\begin{cvitems}
{{#each certifications}}
  \\item {{this.name}} -- {{this.issuer}} ({{monthYear this.date}})
{{/each}}
\\end{cvitems}
{{/if}}

%% Languages
{{#if languages}}
\\cvsection{Languages}
\\begin{cvskills}
{{#each languages}}
  \\cvskill
    {{{this.language}}}
    {{{this.proficiency}}}
{{/each}}
\\end{cvskills}
{{/if}}

\\end{document}
  `;

  readonly supportedSections = [
    'personalInfo',
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'languages',
    'volunteer',
    'publications',
    'awards',
  ];

  readonly cssSource = `
.awesome-cv {
  font-family: 'Roboto', sans-serif;
  color: #333;
  line-height: 1.6;
}

.awesome-cv header {
  background-color: var(--primary-color);
  color: white;
  padding: 30px 20px;
  margin-bottom: 30px;
}

.awesome-cv h2 {
  color: var(--heading-color);
  border-left: 4px solid var(--accent-color);
  padding-left: 10px;
  margin-top: 20px;
  margin-bottom: 10px;
}

.awesome-cv .entry {
  margin-bottom: 15px;
}

.awesome-cv .entry-title {
  font-weight: 600;
  color: var(--heading-color);
}

.awesome-cv .entry-subtitle {
  font-style: italic;
  color: #666;
}
  `;
}

export default AwesomeCVTemplate;
