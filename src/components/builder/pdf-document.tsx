'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import { ResumeValues } from '@/types/resume-schema';

// Helper function to parse rich HTML tags into React-PDF components.
// Exclude DOMParser so it compiles successfully both server-side and client-side.
function parseHtmlToPdf(html: string, fontRegular: string, fontHeader: string) {
  if (!html) return null;

  // Split by <li> tags first to isolate list items
  const segments = html.split(/<li[^>]*>/gi);
  const bulletItems: string[] = [];
  let nonBulletText = '';

  if (segments.length > 1) {
    segments.forEach((seg, idx) => {
      if (idx === 0) {
        // Text before the list
        const cleaned = seg.replace(/<ul[^>]*>/gi, '').replace(/<\/ul>/gi, '').trim();
        if (cleaned) nonBulletText = cleaned;
      } else {
        // Extract content between <li> and </li>
        const bulletContent = seg.split(/<\/li>/gi)[0];
        bulletItems.push(bulletContent);
      }
    });
  } else {
    nonBulletText = html;
  }

  // Parse formatting tokens (strong/b, em/i, u) inside each segment
  const parseFormattedText = (textStr: string) => {
    const tokens = textStr.split(/(<\/?[a-zA-Z0-9]+[^>]*>)/g);
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;

    return tokens.map((token, index) => {
      if (token.startsWith('<') && token.endsWith('>')) {
        const tag = token.toLowerCase();
        if (tag.startsWith('<strong') || tag.startsWith('<b')) {
          isBold = true;
        } else if (tag === '</strong>' || tag === '</b>') {
          isBold = false;
        } else if (tag.startsWith('<em') || tag.startsWith('<i')) {
          isItalic = true;
        } else if (tag === '</em>' || tag === '</i>') {
          isItalic = false;
        } else if (tag.startsWith('<u')) {
          isUnderline = true;
        } else if (tag === '</u>') {
          isUnderline = false;
        }
        return null;
      } else {
        if (!token) return null;

        const style: any = { fontSize: 8, color: '#334155' };
        if (isBold) {
          style.fontFamily = fontHeader;
        } else {
          style.fontFamily = fontRegular;
        }
        if (isItalic) {
          style.fontStyle = 'italic';
        }
        if (isUnderline) {
          style.textDecoration = 'underline';
        }

        const decodedText = token
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ');

        return (
          <Text key={index} style={style}>
            {decodedText}
          </Text>
        );
      }
    }).filter(Boolean);
  };

  return (
    <View style={{ marginTop: 2 }}>
      {nonBulletText ? (
        <Text style={{ marginBottom: 4 }}>
          {parseFormattedText(nonBulletText)}
        </Text>
      ) : null}
      {bulletItems.map((bullet, idx) => (
        <View key={idx} style={{ flexDirection: 'row', marginBottom: 1.5, paddingLeft: 10 }}>
          <Text style={{ fontSize: 8, marginRight: 4, fontFamily: fontRegular }}>•</Text>
          <Text style={{ fontSize: 8, flex: 1 }}>
            {parseFormattedText(bullet)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  
  // Minimalist
  minimalistHeader: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    marginBottom: 12,
  },
  minimalistName: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  minimalistTitle: {
    fontSize: 11,
    color: '#4f46e5',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Helvetica-Bold',
  },
  minimalistContacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    fontSize: 7.5,
    color: '#475569',
  },
  minimalistContactItem: {
    marginRight: 12,
    marginBottom: 2,
  },
  minimalistSectionTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#0f172a',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 6,
    marginTop: 8,
  },
  
  // Professional
  professionalHeader: {
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#c7d2fe',
    paddingBottom: 10,
    marginBottom: 12,
  },
  professionalName: {
    fontSize: 22,
    fontFamily: 'Times-Bold',
    color: '#1e1b4b',
  },
  professionalTitle: {
    fontSize: 10,
    color: '#4f46e5',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  professionalContacts: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
    fontSize: 7.5,
    color: '#475569',
  },
  professionalContactItem: {
    marginHorizontal: 6,
    marginBottom: 2,
  },
  professionalSectionTitle: {
    fontSize: 9.5,
    fontFamily: 'Times-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#1e1b4b',
    borderBottomWidth: 0.5,
    borderBottomColor: '#c7d2fe',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 6,
    marginTop: 8,
  },

  // Executive
  executiveContainer: {
    flexDirection: 'row',
    height: '100%',
    margin: -30,
  },
  executiveSidebar: {
    width: '30%',
    backgroundColor: '#0f172a',
    padding: 20,
    color: '#cbd5e1',
  },
  executiveMain: {
    width: '70%',
    padding: 25,
    backgroundColor: '#ffffff',
  },
  executiveSidebarName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  executiveSidebarTitle: {
    fontSize: 8,
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 15,
  },
  executiveSidebarSectionTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#94a3b8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#334155',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 6,
    marginTop: 15,
  },
  executiveSidebarContactItem: {
    fontSize: 7,
    marginBottom: 5,
    color: '#cbd5e1',
  },
  executiveSkillBadge: {
    fontSize: 7.5,
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    padding: '2 4',
    borderRadius: 2,
    marginBottom: 3,
    marginRight: 3,
  },

  itemDate: {
    fontSize: 7.5,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  itemLocation: {
    fontSize: 7,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 1,
  },
  projectBadge: {
    fontSize: 7,
    color: '#4f46e5',
    backgroundColor: '#f5f3ff',
    borderWidth: 0.5,
    borderColor: '#ddd6fe',
    borderStyle: 'solid',
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 2,
    marginLeft: 4,
  },
  projectLinks: {
    flexDirection: 'row',
    fontSize: 7,
    color: '#64748b',
    marginTop: 2,
  },
  projectLink: {
    marginRight: 8,
    color: '#4f46e5',
    textDecoration: 'none',
  },
  certItem: {
    marginBottom: 6,
  },
  achItem: {
    marginBottom: 6,
  },
});

interface PDFDocumentProps {
  data: ResumeValues;
}

export function ResumePDFDocument({ data }: PDFDocumentProps) {
  const {
    personalInfo,
    workExperience = [],
    education = [],
    projects = [],
    skills,
    certificates = [],
    achievements = [],
    templateId = 'modern-minimalist',
    sectionOrder = ['personalInfo', 'workExperience', 'education', 'projects', 'skills', 'certificates', 'achievements'],
    visibleSections = {
      personalInfo: true,
      workExperience: true,
      education: true,
      projects: true,
      skills: true,
      certificates: true,
      achievements: true,
    },
  } = data;

  const fontHeader = templateId === 'professional' ? 'Times-Bold' : 'Helvetica-Bold';
  const fontRegular = templateId === 'professional' ? 'Times-Roman' : 'Helvetica';

  const renderSummary = () => {
    if (!personalInfo?.summary || !visibleSections.personalInfo) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={[
          templateId === 'professional' ? styles.professionalSectionTitle : styles.minimalistSectionTitle,
          { fontFamily: fontHeader }
        ]}>
          Professional Summary
        </Text>
        <Text style={{ fontSize: 8, lineHeight: 1.3, fontFamily: fontRegular, color: '#334155' }}>
          {personalInfo.summary}
        </Text>
      </View>
    );
  };

  const renderExperience = () => {
    if (workExperience.length === 0 || !visibleSections.workExperience) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={[
          templateId === 'professional' ? styles.professionalSectionTitle : styles.minimalistSectionTitle,
          { fontFamily: fontHeader }
        ]}>
          Professional Experience
        </Text>
        {workExperience.map((exp, index) => (
          <View key={exp.id || index} style={{ marginBottom: 8 }} wrap={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', maxWidth: '80%' }}>
                <Text style={{ fontSize: 8.5, fontFamily: fontHeader, color: '#0f172a' }}>{exp.position}</Text>
                <Text style={{ fontSize: 8.5, color: '#94a3b8', marginHorizontal: 4 }}>|</Text>
                <Text style={{ fontSize: 8.5, fontFamily: fontRegular, color: '#475569' }}>{exp.company}</Text>
              </View>
              <Text style={styles.itemDate}>{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</Text>
            </View>
            {exp.location ? <Text style={styles.itemLocation}>{exp.location}</Text> : null}
            {exp.description ? parseHtmlToPdf(exp.description, fontRegular, fontHeader) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderProjects = () => {
    if (projects.length === 0 || !visibleSections.projects) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={[
          templateId === 'professional' ? styles.professionalSectionTitle : styles.minimalistSectionTitle,
          { fontFamily: fontHeader }
        ]}>
          Projects
        </Text>
        {projects.map((proj, index) => (
          <View key={proj.id || index} style={{ marginBottom: 8 }} wrap={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', maxWidth: '75%' }}>
                <Text style={{ fontSize: 8.5, fontFamily: fontHeader, color: '#0f172a' }}>{proj.projectName}</Text>
                {proj.technologies ? <Text style={styles.projectBadge}>{proj.technologies}</Text> : null}
              </View>
              <View style={styles.projectLinks}>
                {proj.githubUrl ? <Link style={styles.projectLink} src={proj.githubUrl}>GitHub</Link> : null}
                {proj.liveUrl ? <Link style={styles.projectLink} src={proj.liveUrl}>Live Demo</Link> : null}
              </View>
            </View>
            {proj.description ? parseHtmlToPdf(proj.description, fontRegular, fontHeader) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderEducation = () => {
    if (education.length === 0 || !visibleSections.education) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={[
          templateId === 'professional' ? styles.professionalSectionTitle : styles.minimalistSectionTitle,
          { fontFamily: fontHeader }
        ]}>
          Education
        </Text>
        {education.map((edu, index) => (
          <View key={edu.id || index} style={{ marginBottom: 6 }} wrap={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ maxWidth: '80%' }}>
                <Text style={{ fontSize: 8.5, fontFamily: fontHeader, color: '#0f172a' }}>
                  {edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
                </Text>
                <Text style={{ fontSize: 7.5, color: '#475569', marginTop: 1, fontFamily: fontRegular }}>{edu.school}</Text>
              </View>
              <Text style={styles.itemDate}>{edu.startDate} - {edu.current ? 'Present' : edu.endDate}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSkills = () => {
    if ((!skills?.technicalSkills?.length && !skills?.softSkills?.length) || !visibleSections.skills) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={[
          templateId === 'professional' ? styles.professionalSectionTitle : styles.minimalistSectionTitle,
          { fontFamily: fontHeader }
        ]}>
          Skills
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {skills?.technicalSkills?.length ? (
            <View style={{ width: skills.softSkills?.length ? '48%' : '100%' }}>
              <Text style={{ fontSize: 8, fontFamily: fontHeader, color: '#0f172a', marginBottom: 2 }}>Technical Skills</Text>
              <Text style={{ fontSize: 8, fontFamily: fontRegular, color: '#334155', lineHeight: 1.3 }}>{skills.technicalSkills.join(', ')}</Text>
            </View>
          ) : null}
          {skills?.softSkills?.length ? (
            <View style={{ width: skills.technicalSkills?.length ? '48%' : '100%' }}>
              <Text style={{ fontSize: 8, fontFamily: fontHeader, color: '#0f172a', marginBottom: 2 }}>Soft Skills</Text>
              <Text style={{ fontSize: 8, fontFamily: fontRegular, color: '#334155', lineHeight: 1.3 }}>{skills.softSkills.join(', ')}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderCertificates = () => {
    if (certificates.length === 0 || !visibleSections.certificates) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={[
          templateId === 'professional' ? styles.professionalSectionTitle : styles.minimalistSectionTitle,
          { fontFamily: fontHeader }
        ]}>
          Certifications
        </Text>
        {certificates.map((cert, index) => (
          <View key={cert.id || index} style={styles.certItem} wrap={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 8, fontFamily: fontHeader, color: '#0f172a' }}>{cert.name}</Text>
              <Text style={{ fontSize: 7, color: '#64748b' }}>{cert.date}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 }}>
              <Text style={{ fontSize: 7, color: '#475569', fontFamily: fontRegular }}>{cert.issuer}</Text>
              {cert.url ? <Link style={{ fontSize: 7, color: '#4f46e5' }} src={cert.url}>Verify</Link> : null}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderAchievements = () => {
    if (achievements.length === 0 || !visibleSections.achievements) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={[
          templateId === 'professional' ? styles.professionalSectionTitle : styles.minimalistSectionTitle,
          { fontFamily: fontHeader }
        ]}>
          Achievements
        </Text>
        {achievements.map((ach, index) => (
          <View key={ach.id || index} style={styles.achItem} wrap={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 8, fontFamily: fontHeader, color: '#0f172a' }}>{ach.title}</Text>
              <Text style={{ fontSize: 7, color: '#64748b' }}>{ach.date}</Text>
            </View>
            {ach.description ? (
              <Text style={{ fontSize: 7.5, color: '#475569', marginTop: 1, fontFamily: fontRegular, lineHeight: 1.2 }}>
                {ach.description}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderCustomSection = (key: string) => {
    const section = data.customSections?.[key] as any;
    const isVisible = visibleSections?.[key] ?? true;
    if (!section || !isVisible || !section.items || section.items.length === 0) return null;
    return (
      <View style={{ marginBottom: 10 }} wrap={false}>
        <Text style={[
          templateId === 'professional' ? styles.professionalSectionTitle : styles.minimalistSectionTitle,
          { fontFamily: fontHeader }
        ]}>
          {section.title}
        </Text>
        {(section.items || []).map((item: any, index: number) => (
          <View key={item.id || index} style={{ marginBottom: 6 }} wrap={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ maxWidth: '80%' }}>
                <Text style={{ fontSize: 8.5, fontFamily: fontHeader, color: '#0f172a' }}>{item.title}</Text>
                {item.subtitle ? <Text style={{ fontSize: 7.5, color: '#475569', marginTop: 1, fontFamily: fontRegular }}>{item.subtitle}</Text> : null}
              </View>
              {item.date ? <Text style={styles.itemDate}>{item.date}</Text> : null}
            </View>
            {item.description ? (
              <Text style={{ fontSize: 7.5, color: '#475569', marginTop: 2, fontFamily: fontRegular, lineHeight: 1.2 }}>
                {item.description}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderSection = (key: string) => {
    if (key.startsWith('custom_')) {
      return renderCustomSection(key);
    }
    switch (key) {
      case 'workExperience':
        return renderExperience();
      case 'education':
        return renderEducation();
      case 'projects':
        return renderProjects();
      case 'skills':
        return renderSkills();
      case 'certificates':
        return renderCertificates();
      case 'achievements':
        return renderAchievements();
      default:
        return null;
    }
  };

  const renderExecutiveContacts = () => {
    const items = [
      personalInfo?.email && { label: 'Email', val: personalInfo.email },
      personalInfo?.phone && { label: 'Phone', val: personalInfo.phone },
      personalInfo?.location && { label: 'Loc', val: personalInfo.location },
      personalInfo?.linkedin && { label: 'In', val: personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '') },
      personalInfo?.github && { label: 'Git', val: personalInfo.github.replace(/^https?:\/\/(www\.)?/, '') },
      personalInfo?.portfolio && { label: 'Web', val: personalInfo.portfolio.replace(/^https?:\/\/(www\.)?/, '') },
    ].filter(Boolean) as Array<{ label: string; val: string }>;

    return (
      <View style={{ marginTop: 10 }}>
        {items.map((item, index) => (
          <Text key={index} style={styles.executiveSidebarContactItem}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.label}: </Text>
            {item.val}
          </Text>
        ))}
      </View>
    );
  };

  // ==========================================
  // TEMPLATES OUTPUTS
  // ==========================================

  // 1. EXECUTIVE
  if (templateId === 'executive') {
    return (
      <Document>
        <Page size="A4" style={[styles.page, { padding: 30 }]}>
          <View style={styles.executiveContainer}>
            <View style={styles.executiveSidebar}>
              <Text style={styles.executiveSidebarName}>{personalInfo?.fullName || 'Your Name'}</Text>
              <Text style={styles.executiveSidebarTitle}>{personalInfo?.title || 'Professional Title'}</Text>

              <Text style={styles.executiveSidebarSectionTitle}>Contact</Text>
              {renderExecutiveContacts()}

              {skills?.technicalSkills?.length && visibleSections.skills ? (
                <View>
                  <Text style={styles.executiveSidebarSectionTitle}>Skills</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                    {skills.technicalSkills.map((sk, i) => (
                      <Text key={i} style={styles.executiveSkillBadge}>{sk}</Text>
                    ))}
                    {skills.softSkills?.map((sk, i) => (
                      <Text key={i} style={styles.executiveSkillBadge}>{sk}</Text>
                    ))}
                  </View>
                </View>
              ) : null}

              {certificates.length > 0 && visibleSections.certificates ? (
                <View>
                  <Text style={styles.executiveSidebarSectionTitle}>Certifications</Text>
                  {certificates.map((cert, idx) => (
                    <View key={cert.id || idx} style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{cert.name}</Text>
                      <Text style={{ fontSize: 6.5, color: '#94a3b8' }}>{cert.issuer} ({cert.date})</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.executiveMain}>
              {renderSummary()}
              {sectionOrder
                .filter(key => key !== 'skills' && key !== 'certificates')
                .map((sectionKey) => (
                  <View key={sectionKey}>
                    {renderSection(sectionKey)}
                  </View>
                ))}
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  // 2. PROFESSIONAL
  if (templateId === 'professional') {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.professionalHeader}>
            <Text style={styles.professionalName}>{personalInfo?.fullName || 'Your Full Name'}</Text>
            <Text style={styles.professionalTitle}>{personalInfo?.title || 'Professional Title'}</Text>
            
            <View style={styles.professionalContacts}>
              {personalInfo?.email ? <Text style={styles.professionalContactItem}>{personalInfo.email}</Text> : null}
              {personalInfo?.phone ? <Text style={styles.professionalContactItem}>{personalInfo.phone}</Text> : null}
              {personalInfo?.location ? <Text style={styles.professionalContactItem}>{personalInfo.location}</Text> : null}
              {personalInfo?.linkedin ? <Text style={styles.professionalContactItem}>{personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</Text> : null}
              {personalInfo?.github ? <Text style={styles.professionalContactItem}>{personalInfo.github.replace(/^https?:\/\/(www\.)?/, '')}</Text> : null}
              {personalInfo?.portfolio ? <Text style={styles.professionalContactItem}>{personalInfo.portfolio.replace(/^https?:\/\/(www\.)?/, '')}</Text> : null}
            </View>
          </View>

          {renderSummary()}

          {sectionOrder.map((sectionKey) => (
            <View key={sectionKey}>
              {renderSection(sectionKey)}
            </View>
          ))}
        </Page>
      </Document>
    );
  }

  // 3. MODERN MINIMALIST
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.minimalistHeader}>
          <Text style={styles.minimalistName}>{personalInfo?.fullName || 'Your Full Name'}</Text>
          <Text style={styles.minimalistTitle}>{personalInfo?.title || 'Professional Title'}</Text>
          
          <View style={styles.minimalistContacts}>
            {personalInfo?.email ? <Text style={styles.minimalistContactItem}>Email: {personalInfo.email}</Text> : null}
            {personalInfo?.phone ? <Text style={styles.minimalistContactItem}>Phone: {personalInfo.phone}</Text> : null}
            {personalInfo?.location ? <Text style={styles.minimalistContactItem}>Location: {personalInfo.location}</Text> : null}
            {personalInfo?.linkedin ? <Text style={styles.minimalistContactItem}>LinkedIn: {personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</Text> : null}
            {personalInfo?.github ? <Text style={styles.minimalistContactItem}>GitHub: {personalInfo.github.replace(/^https?:\/\/(www\.)?/, '')}</Text> : null}
            {personalInfo?.portfolio ? <Text style={styles.minimalistContactItem}>Web: {personalInfo.portfolio.replace(/^https?:\/\/(www\.)?/, '')}</Text> : null}
          </View>
        </View>

        {renderSummary()}

        {sectionOrder.map((sectionKey) => (
          <View key={sectionKey}>
            {renderSection(sectionKey)}
          </View>
        ))}
      </Page>
    </Document>
  );
}
