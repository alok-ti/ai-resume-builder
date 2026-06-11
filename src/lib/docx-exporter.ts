import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  BorderStyle, 
  convertInchesToTwip
} from 'docx';
import { ResumeValues } from '@/types/resume-schema';

// Helper to remove HTML tags and return simple plain text for text runs
function cleanHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

// Helper to parse HTML <li> list items
function extractBullets(html: string): string[] {
  if (!html) return [];
  const matches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  if (matches.length > 0) {
    return matches.map(m => m[1].replace(/<[^>]*>/g, '').trim()).filter(Boolean);
  }
  // Fallback: split on newlines
  return html.replace(/<[^>]*>/g, '').split('\n').map(s => s.trim()).filter(Boolean);
}

export async function generateDocxBlob(data: ResumeValues): Promise<Blob> {
  const {
    personalInfo,
    workExperience = [],
    education = [],
    projects = [],
    skills,
    certificates = [],
    achievements = [],
    sectionOrder = [
      'personalInfo',
      'summary',
      'workExperience',
      'education',
      'projects',
      'skills',
      'certificates',
      'achievements'
    ],
  } = data;

  const visibleSections = (data.visibleSections || {}) as Record<string, any>;

  const children: any[] = [];

  // ==========================================
  // 1. HEADER SECTION (Contact Info)
  // ==========================================
  if (personalInfo?.fullName) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [
          new TextRun({
            text: personalInfo.fullName,
            bold: true,
            size: 48, // 24pt
            font: 'Arial',
            color: '1E293B' // Slate-800
          })
        ]
      })
    );
  }

  if (personalInfo?.title) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 180 },
        children: [
          new TextRun({
            text: personalInfo.title.toUpperCase(),
            bold: true,
            size: 22, // 11pt
            font: 'Arial',
            color: '4F46E5' // Indigo-600
          })
        ]
      })
    );
  }

  // Combine phone, email, location, links
  const contactParts: string[] = [];
  const isPersonalInfoVisible = visibleSections.personalInfo ?? true;
  
  if (isPersonalInfoVisible) {
    if (personalInfo?.email) contactParts.push(personalInfo.email);
    if (personalInfo?.phone) contactParts.push(personalInfo.phone);
    if (personalInfo?.location) contactParts.push(personalInfo.location);
  }
  
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [
          new TextRun({
            text: contactParts.join('  |  '),
            size: 19, // 9.5pt
            font: 'Arial',
            color: '64748B' // Slate-500
          })
        ]
      })
    );
  }

  // Links sub-bar
  const linkParts: string[] = [];
  if (isPersonalInfoVisible) {
    if (personalInfo?.linkedin) linkParts.push(personalInfo.linkedin);
    if (personalInfo?.github) linkParts.push(personalInfo.github);
    if (personalInfo?.portfolio) linkParts.push(personalInfo.portfolio);
  }

  if (linkParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 360 },
        children: [
          new TextRun({
            text: linkParts.join('   •   '),
            size: 18, // 9pt
            font: 'Arial',
            color: '3B82F6', // Blue-500
            underline: {}
          })
        ]
      })
    );
  }

  // Helper for Section Titles with clean bottom borders/rules
  const createSectionHeader = (title: string) => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      border: {
        bottom: {
          color: 'E2E8F0', // Slate-200
          space: 4,
          style: BorderStyle.SINGLE,
          size: 6 // 0.75pt border
        }
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 22, // 11pt
          font: 'Arial',
          color: '1E293B'
        })
      ]
    });
  };

  // Helper to render custom sections
  const renderCustomSection = (key: string) => {
    const section = data.customSections?.[key];
    if (!section || !section.items || section.items.length === 0) return;
    
    children.push(createSectionHeader(section.title || 'Custom Section'));
    
    section.items.forEach((item: any) => {
      const dateText = item.date || '';
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: item.title || '',
              bold: true,
              size: 20,
              font: 'Arial',
              color: '1E293B'
            }),
            item.subtitle ? new TextRun({
              text: `  |  ${item.subtitle}`,
              size: 20,
              font: 'Arial',
              color: '475569'
            }) : new TextRun({ text: '' }),
            dateText ? new TextRun({
              text: `\t\t${dateText}`,
              size: 19,
              font: 'Arial',
              color: '64748B',
              bold: true
            }) : new TextRun({ text: '' })
          ]
        })
      );
      
      if (item.description) {
        children.push(
          new Paragraph({
            spacing: { before: 40, after: 120 },
            children: [
              new TextRun({
                text: cleanHtml(item.description),
                size: 19,
                font: 'Arial',
                color: '334155'
              })
            ]
          })
        );
      }
    });
  };

  // Render individual sections
  const renderSection = (key: string) => {
    if (key.startsWith('custom_')) {
      renderCustomSection(key);
      return;
    }

    switch (key) {
      case 'summary':
        if (personalInfo?.summary) {
          children.push(createSectionHeader('Professional Summary'));
          children.push(
            new Paragraph({
              spacing: { before: 60, after: 180, line: 276, lineRule: 'auto' }, // 1.15 line height
              children: [
                new TextRun({
                  text: personalInfo.summary,
                  size: 20, // 10pt
                  font: 'Arial',
                  color: '334155' // Slate-700
                })
              ]
            })
          );
        }
        break;

      case 'workExperience':
        if (workExperience.length > 0) {
          children.push(createSectionHeader('Professional Experience'));

          workExperience.forEach((exp) => {
            const dateText = [exp.startDate, exp.endDate || (exp.current ? 'Present' : '')].filter(Boolean).join(' – ');
            const locationText = exp.location ? ` (${exp.location})` : '';

            children.push(
              new Paragraph({
                spacing: { before: 120, after: 40 },
                children: [
                  new TextRun({
                    text: exp.position,
                    bold: true,
                    size: 20,
                    font: 'Arial',
                    color: '1E293B'
                  }),
                  new TextRun({
                    text: `  |  ${exp.company}${locationText}`,
                    size: 20,
                    font: 'Arial',
                    color: '475569'
                  }),
                  new TextRun({
                    text: `\t\t${dateText}`,
                    size: 19,
                    font: 'Arial',
                    color: '64748B',
                    bold: true
                  })
                ]
              })
            );

            const bullets = extractBullets(exp.description || '');
            bullets.forEach((bullet) => {
              children.push(
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({
                      text: bullet,
                      size: 19, // 9.5pt
                      font: 'Arial',
                      color: '334155'
                    })
                  ]
                })
              );
            });
          });
        }
        break;

      case 'projects':
        if (projects.length > 0) {
          children.push(createSectionHeader('Key Projects'));

          projects.forEach((proj) => {
            const linkText = [proj.githubUrl, proj.liveUrl].filter(Boolean).join(' | ');

            children.push(
              new Paragraph({
                spacing: { before: 120, after: 40 },
                children: [
                  new TextRun({
                    text: proj.projectName,
                    bold: true,
                    size: 20,
                    font: 'Arial',
                    color: '1E293B'
                  }),
                  proj.technologies ? new TextRun({
                    text: ` (${proj.technologies})`,
                    size: 19,
                    font: 'Arial',
                    color: '4F46E5',
                    italics: true
                  }) : new TextRun({ text: '' }),
                  linkText ? new TextRun({
                    text: `  |  ${linkText}`,
                    size: 18,
                    font: 'Arial',
                    color: '3B82F6'
                  }) : new TextRun({ text: '' })
                ]
              })
            );

            if (proj.description) {
              children.push(
                new Paragraph({
                  spacing: { before: 40, after: 120 },
                  children: [
                    new TextRun({
                      text: cleanHtml(proj.description),
                      size: 19,
                      font: 'Arial',
                      color: '334155'
                    })
                  ]
                })
              );
            }
          });
        }
        break;

      case 'skills':
        const techSkills = skills?.technicalSkills || [];
        const softSkills = skills?.softSkills || [];
        if (techSkills.length > 0 || softSkills.length > 0) {
          children.push(createSectionHeader('Skills Summary'));

          if (techSkills.length > 0) {
            children.push(
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({
                    text: 'Technical Skills: ',
                    bold: true,
                    size: 19,
                    font: 'Arial',
                    color: '1E293B'
                  }),
                  new TextRun({
                    text: techSkills.join(', '),
                    size: 19,
                    font: 'Arial',
                    color: '334155'
                  })
                ]
              })
            );
          }

          if (softSkills.length > 0) {
            children.push(
              new Paragraph({
                spacing: { before: 60, after: 120 },
                children: [
                  new TextRun({
                    text: 'Soft Skills: ',
                    bold: true,
                    size: 19,
                    font: 'Arial',
                    color: '1E293B'
                  }),
                  new TextRun({
                    text: softSkills.join(', '),
                    size: 19,
                    font: 'Arial',
                    color: '334155'
                  })
                ]
              })
            );
          }
        }
        break;

      case 'education':
        if (education.length > 0) {
          children.push(createSectionHeader('Education'));

          education.forEach((edu) => {
            const dateText = [edu.startDate, edu.endDate || (edu.current ? 'Present' : '')].filter(Boolean).join(' – ');
            const studyField = edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : '';

            children.push(
              new Paragraph({
                spacing: { before: 120, after: 40 },
                children: [
                  new TextRun({
                    text: `${edu.degree}${studyField}`,
                    bold: true,
                    size: 20,
                    font: 'Arial',
                    color: '1E293B'
                  }),
                  new TextRun({
                    text: `  |  ${edu.school}`,
                    size: 20,
                    font: 'Arial',
                    color: '475569'
                  }),
                  new TextRun({
                    text: `\t\t${dateText}`,
                    size: 19,
                    font: 'Arial',
                    color: '64748B',
                    bold: true
                  })
                ]
              })
            );

            if (edu.description) {
              children.push(
                new Paragraph({
                  spacing: { before: 40, after: 120 },
                  children: [
                    new TextRun({
                      text: cleanHtml(edu.description),
                      size: 19,
                      font: 'Arial',
                      color: '334155'
                    })
                  ]
                })
              );
            }
          });
        }
        break;

      case 'certificates':
        if (certificates.length > 0) {
          children.push(createSectionHeader('Certifications'));
          certificates.forEach((cert) => {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: cert.name,
                    bold: true,
                    size: 19,
                    font: 'Arial',
                    color: '1E293B'
                  }),
                  cert.issuer ? new TextRun({
                    text: ` – ${cert.issuer}`,
                    size: 19,
                    font: 'Arial',
                    color: '334155'
                  }) : new TextRun({ text: '' }),
                  cert.date ? new TextRun({
                    text: ` (${cert.date})`,
                    size: 18,
                    font: 'Arial',
                    color: '64748B',
                    italics: true
                  }) : new TextRun({ text: '' })
                ]
              })
            );
          });
        }
        break;

      case 'achievements':
        if (achievements.length > 0) {
          children.push(createSectionHeader('Achievements & Awards'));
          achievements.forEach((ach) => {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: ach.title,
                    bold: true,
                    size: 19,
                    font: 'Arial',
                    color: '1E293B'
                  }),
                  ach.date ? new TextRun({
                    text: ` (${ach.date}): `,
                    size: 18,
                    font: 'Arial',
                    color: '64748B'
                  }) : new TextRun({ text: ': ' }),
                  new TextRun({
                    text: cleanHtml(ach.description),
                    size: 19,
                    font: 'Arial',
                    color: '334155'
                  })
                ]
              })
            );
          });
        }
        break;

      default:
        break;
    }
  };

  // Iterate over sectionOrder and render visible sections
  sectionOrder.forEach((key) => {
    if (key === 'personalInfo') return; // Handled by header
    const isVisible = visibleSections[key] ?? true;
    if (!isVisible) return;
    renderSection(key);
  });

  // Construct Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        children: children
      }
    ]
  });

  return await Packer.toBlob(doc);
}
