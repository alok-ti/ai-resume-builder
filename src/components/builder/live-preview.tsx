'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ResumeValues } from '@/types/resume-schema';
import { Mail, Phone, MapPin, Globe, ExternalLink, Award, Trophy } from 'lucide-react';
import { LinkedinIcon as Linkedin, GithubIcon as Github } from '@/components/shared/icons';
import { EditableText } from './editable-text';

interface LivePreviewProps {
  data: ResumeValues;
}

export function LivePreview({ data }: LivePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

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

  const hasSkills = (skills?.technicalSkills?.length ?? 0) > 0 || (skills?.softSkills?.length ?? 0) > 0;

  // Track height of resume container for page break overlays
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const pageHeight = 1123; // Standard A4 height in pixels at 794px width (96 DPI)
  const pageCount = Math.max(1, Math.ceil(containerHeight / pageHeight));

  // Render horizontal dashed page breaks dynamically
  const renderPageBreakGuides = () => {
    const guides = [];
    for (let i = 1; i < pageCount; i++) {
      guides.push(
        <div
          key={i}
          style={{ top: `${i * pageHeight}px` }}
          className="absolute left-0 right-0 border-t-2 border-dashed border-rose-500/50 z-30 pointer-events-none flex justify-center items-center"
        >
          <span className="bg-rose-100 text-rose-700 text-[8px] font-extrabold px-2 py-0.5 rounded-full shadow-sm -translate-y-1/2 uppercase tracking-widest border border-rose-200">
            Page {i} / {i + 1} Boundary
          </span>
        </div>
      );
    }
    return guides;
  };

  // Helper to dynamically style section headers based on the current templateId
  const getSectionHeaderClass = () => {
    switch (templateId) {
      case 'ats':
        return 'font-serif text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-900 text-slate-950 mt-4 mb-2';
      case 'tech':
        return 'font-mono text-xs font-bold uppercase tracking-widest pb-1 border-b border-teal-500 text-teal-600 mt-4 mb-2';
      case 'executive':
        return 'font-sans text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-200 text-slate-800 mt-4 mb-2';
      case 'modern':
        return 'font-sans text-xs font-bold uppercase tracking-wide pb-1 border-l-4 border-indigo-600 pl-2 text-indigo-950 mt-4 mb-2';
      case 'minimal':
      case 'modern-minimalist':
        return 'font-sans text-[11px] font-semibold uppercase tracking-widest pb-0.5 border-b border-slate-150 text-slate-800 mt-4 mb-2';
      case 'creative':
        return 'font-sans text-xs font-black uppercase tracking-widest pb-1 border-b-2 border-rose-500 text-rose-600 mt-4 mb-2 flex items-center gap-1 before:content-[""] before:w-1.5 before:h-1.5 before:rounded-full before:bg-rose-500';
      case 'professional':
        return 'font-serif text-xs font-bold uppercase tracking-wider pb-1 border-b border-indigo-200 text-indigo-900 mt-4 mb-2';
      default:
        return 'font-sans text-slate-900 border-slate-200 pb-1 border-b mt-4 mb-2';
    }
  };

  // Helper to get project technologies badge style
  const getProjectTechClass = () => {
    switch (templateId) {
      case 'ats':
        return 'ml-2 text-[10px] text-slate-700 font-serif italic';
      case 'tech':
        return 'ml-2 text-[9px] font-mono text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100';
      case 'creative':
        return 'ml-2 text-[9px] font-sans text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100';
      case 'modern':
        return 'ml-2 text-[9px] font-sans text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100';
      case 'minimal':
      case 'modern-minimalist':
      default:
        return 'ml-2 text-[9px] font-sans text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-150';
    }
  };

  // Helper to render visual badge tags
  const renderBadge = (children: React.ReactNode) => {
    switch (templateId) {
      case 'ats':
        return <span className="font-serif text-slate-950 font-normal">{children}</span>;
      case 'tech':
        return (
          <span className="font-mono text-[9.5px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded shadow-sm">
            {children}
          </span>
        );
      case 'creative':
        return (
          <span className="font-sans text-[10px] bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 rounded-full shadow-xxs">
            {children}
          </span>
        );
      case 'modern':
        return (
          <span className="font-sans text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-650 px-2 py-0.5 rounded shadow-xxs">
            {children}
          </span>
        );
      case 'executive':
        return (
          <span className="font-sans text-[9px] bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
            {children}
          </span>
        );
      case 'minimal':
      case 'modern-minimalist':
      case 'professional':
      default:
        return (
          <span className="font-sans text-[10px] bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded shadow-sm">
            {children}
          </span>
        );
    }
  };

  // Render individual sections
  const renderSummary = () => {
    if (!personalInfo?.summary || !(visibleSections.summary ?? true)) return null;
    return (
      <div className="space-y-2">
        <h3 className={getSectionHeaderClass()}>
          Professional Summary
        </h3>
        <p className="text-xs leading-relaxed text-slate-750 whitespace-pre-line font-light">
          <EditableText fieldName="personalInfo.summary" value={personalInfo.summary} placeholder="Summary..." />
        </p>
      </div>
    );
  };

  const renderExperience = () => {
    if (workExperience.length === 0 || !visibleSections.workExperience) return null;
    return (
      <div className="space-y-3">
        <h3 className={getSectionHeaderClass()}>
          Professional Experience
        </h3>
        <div className="space-y-4">
          {workExperience.map((exp, index) => (
            <div key={exp.id || index} className="space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`font-bold text-xs text-slate-900 ${templateId === 'professional' || templateId === 'ats' ? 'font-serif' : ''}`}>
                    <EditableText fieldName={`workExperience.${index}.position`} value={exp.position} placeholder="Position title" />
                  </span>
                  <span className="text-slate-400 mx-1.5">|</span>
                  <span className="font-semibold text-xs text-slate-705">
                    <EditableText fieldName={`workExperience.${index}.company`} value={exp.company} placeholder="Company name" />
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-100/80 border border-slate-200/50 rounded px-2 py-0.5 whitespace-nowrap">
                  <EditableText fieldName={`workExperience.${index}.startDate`} value={exp.startDate} placeholder="Start Date" />
                  {" – "}
                  <EditableText fieldName={`workExperience.${index}.endDate`} value={exp.endDate} placeholder="End Date" />
                </span>
              </div>
              {exp.location && (
                <div className="text-[10px] text-slate-500 italic">
                  <EditableText fieldName={`workExperience.${index}.location`} value={exp.location} placeholder="Location" />
                </div>
              )}
              {exp.description && (
                <div className="preview-rich-text text-xs text-slate-700 leading-relaxed font-light">
                  <EditableText fieldName={`workExperience.${index}.description`} value={exp.description} isHtml={true} placeholder="Description" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProjects = () => {
    if (projects.length === 0 || !visibleSections.projects) return null;
    return (
      <div className="space-y-3">
        <h3 className={getSectionHeaderClass()}>
          Projects
        </h3>
        <div className="space-y-4">
          {projects.map((proj, index) => (
            <div key={proj.id || index} className="space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`font-bold text-xs text-slate-900 ${templateId === 'professional' || templateId === 'ats' ? 'font-serif' : ''}`}>
                    <EditableText fieldName={`projects.${index}.projectName`} value={proj.projectName} placeholder="Project Name" />
                  </span>
                  {proj.technologies && (
                    <span className={getProjectTechClass()}>
                      <EditableText fieldName={`projects.${index}.technologies`} value={proj.technologies} placeholder="Technologies" />
                    </span>
                  )}
                </div>
                <div className="flex gap-2 text-[10px] text-slate-500 shrink-0">
                  {proj.githubUrl && (
                    <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:text-indigo-650 font-semibold transition-colors">
                      GitHub <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {proj.liveUrl && (
                    <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:text-indigo-650 font-semibold transition-colors">
                      Live <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
              {proj.description && (
                <div className="preview-rich-text text-xs text-slate-700 leading-relaxed font-light">
                  <EditableText fieldName={`projects.${index}.description`} value={proj.description} placeholder="Description" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEducation = () => {
    if (education.length === 0 || !visibleSections.education) return null;
    return (
      <div className="space-y-3">
        <h3 className={getSectionHeaderClass()}>
          Education
        </h3>
        <div className="space-y-3">
          {education.map((edu, index) => (
            <div key={edu.id || index} className="flex justify-between items-start">
              <div>
                <span className={`font-bold text-xs text-slate-900 ${templateId === 'professional' || templateId === 'ats' ? 'font-serif' : ''}`}>
                  <EditableText fieldName={`education.${index}.degree`} value={edu.degree} placeholder="Degree" />
                </span>
                {edu.fieldOfStudy && (
                  <>
                    <span className="text-slate-400 mx-1.5 font-light">in</span>
                    <span className="font-semibold text-xs text-slate-705">
                      <EditableText fieldName={`education.${index}.fieldOfStudy`} value={edu.fieldOfStudy} placeholder="Field of study" />
                    </span>
                  </>
                )}
                <div className="text-xs text-slate-600 mt-0.5 font-medium">
                  <EditableText fieldName={`education.${index}.school`} value={edu.school} placeholder="School" />
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-100/80 border border-slate-200/50 rounded px-2 py-0.5 whitespace-nowrap">
                <EditableText fieldName={`education.${index}.startDate`} value={edu.startDate} placeholder="Start Date" />
                {" – "}
                <EditableText fieldName={`education.${index}.endDate`} value={edu.endDate} placeholder="End Date" />
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSkills = () => {
    if (!hasSkills || !visibleSections.skills) return null;
    const isAts = templateId === 'ats';
    return (
      <div className="space-y-3">
        <h3 className={getSectionHeaderClass()}>
          Skills
        </h3>
        <div className="grid grid-cols-1 gap-3 text-xs">
          {skills?.technicalSkills && skills.technicalSkills.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-950 mb-1">Technical Skills</h4>
              {isAts ? (
                <p className="text-slate-755 leading-relaxed font-serif flex flex-wrap gap-1">
                  {skills.technicalSkills.map((sk, idx) => (
                    <span key={idx} className="inline-block">
                      <EditableText fieldName={`skills.technicalSkills.${idx}`} value={sk} placeholder="Skill" />
                      {idx < skills.technicalSkills.length - 1 && <span className="text-slate-400 mr-1">,</span>}
                    </span>
                  ))}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-0.5 animate-fade-in">
                  {skills.technicalSkills.map((sk, idx) => (
                    <span key={idx} className="inline-block">
                      {renderBadge(
                        <EditableText fieldName={`skills.technicalSkills.${idx}`} value={sk} placeholder="Skill" />
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {skills?.softSkills && skills.softSkills.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-950 mb-1">Soft Skills</h4>
              {isAts ? (
                <p className="text-slate-755 leading-relaxed font-serif flex flex-wrap gap-1">
                  {skills.softSkills.map((sk, idx) => (
                    <span key={idx} className="inline-block">
                      <EditableText fieldName={`skills.softSkills.${idx}`} value={sk} placeholder="Skill" />
                      {idx < skills.softSkills.length - 1 && <span className="text-slate-400 mr-1">,</span>}
                    </span>
                  ))}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-0.5 animate-fade-in">
                  {skills.softSkills.map((sk, idx) => (
                    <span key={idx} className="inline-block">
                      {renderBadge(
                        <EditableText fieldName={`skills.softSkills.${idx}`} value={sk} placeholder="Skill" />
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCertificates = () => {
    if (certificates.length === 0 || !visibleSections.certificates) return null;
    return (
      <div className="space-y-3">
        <h3 className={getSectionHeaderClass()}>
          Certifications
        </h3>
        <ul className="space-y-2 text-xs">
          {certificates.map((cert, idx) => (
            <li key={cert.id || idx} className="space-y-0.5">
              <div className="flex justify-between">
                <span className="font-bold text-slate-900">
                  <EditableText fieldName={`certificates.${idx}.name`} value={cert.name} placeholder="Certificate name" />
                </span>
                <span className="text-slate-400 text-[10px] font-medium shrink-0">
                  <EditableText fieldName={`certificates.${idx}.date`} value={cert.date} placeholder="Date" />
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span className="font-medium">
                  <EditableText fieldName={`certificates.${idx}.issuer`} value={cert.issuer} placeholder="Issuer" />
                </span>
                {cert.url && (
                  <a href={cert.url} target="_blank" rel="noreferrer" className="text-indigo-650 hover:underline flex items-center gap-0.5 font-bold">
                    Verify <ExternalLink className="w-2 h-2" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderAchievements = () => {
    if (achievements.length === 0 || !visibleSections.achievements) return null;
    return (
      <div className="space-y-3">
        <h3 className={getSectionHeaderClass()}>
          Achievements
        </h3>
        <ul className="space-y-2 text-xs">
          {achievements.map((ach, idx) => (
            <li key={ach.id || idx} className="space-y-0.5">
              <div className="flex justify-between">
                <span className="font-bold text-slate-900">
                  <EditableText fieldName={`achievements.${idx}.title`} value={ach.title} placeholder="Achievement title" />
                </span>
                <span className="text-slate-400 text-[10px] font-medium shrink-0">
                  <EditableText fieldName={`achievements.${idx}.date`} value={ach.date} placeholder="Date" />
                </span>
              </div>
              {ach.description && (
                <p className="text-[10px] text-slate-650 leading-relaxed font-light">
                  <EditableText fieldName={`achievements.${idx}.description`} value={ach.description} placeholder="Description" />
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderCustomSection = (key: string) => {
    const section = data.customSections?.[key] as any;
    const isVisible = visibleSections?.[key] ?? true;
    if (!section || !isVisible) return null;
    return (
      <div className="space-y-3">
        <h3 className={getSectionHeaderClass()}>
          <EditableText
            fieldName={`customSections.${key}.title`}
            value={section.title}
            placeholder="Custom Section Title"
          />
        </h3>
        <ul className="space-y-2 text-xs">
          {(section.items || []).map((item: any, idx: number) => (
            <li key={item.id || idx} className="space-y-0.5">
              <div className="flex justify-between">
                <span className="font-bold text-slate-900">
                  <EditableText
                    fieldName={`customSections.${key}.items.${idx}.title`}
                    value={item.title}
                    placeholder="Item Title"
                  />
                </span>
                <span className="text-slate-400 text-[10px] font-medium shrink-0">
                  <EditableText
                    fieldName={`customSections.${key}.items.${idx}.date`}
                    value={item.date || ''}
                    placeholder="Date"
                  />
                </span>
              </div>
              {item.subtitle && (
                <div className="text-[10px] text-slate-500 font-medium">
                  <EditableText
                    fieldName={`customSections.${key}.items.${idx}.subtitle`}
                    value={item.subtitle}
                    placeholder="Subtitle"
                  />
                </div>
              )}
              {item.description && (
                <p className="text-[10px] text-slate-600 leading-relaxed font-light whitespace-pre-line">
                  <EditableText
                    fieldName={`customSections.${key}.items.${idx}.description`}
                    value={item.description}
                    placeholder="Description"
                  />
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderSection = (key: string) => {
    if (key.startsWith('custom_')) {
      return renderCustomSection(key);
    }
    switch (key) {
      case 'summary':
        return renderSummary();
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

  const renderContactsList = (layout: 'inline' | 'stacked') => {
    const items = [
      personalInfo?.email && { icon: <Mail className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.email, field: 'personalInfo.email', ph: 'Email' },
      personalInfo?.phone && { icon: <Phone className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.phone, field: 'personalInfo.phone', ph: 'Phone' },
      personalInfo?.location && { icon: <MapPin className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.location, field: 'personalInfo.location', ph: 'Location' },
      personalInfo?.linkedin && { icon: <Linkedin className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.linkedin, field: 'personalInfo.linkedin', ph: 'LinkedIn' },
      personalInfo?.github && { icon: <Github className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.github, field: 'personalInfo.github', ph: 'GitHub' },
      personalInfo?.portfolio && { icon: <Globe className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.portfolio, field: 'personalInfo.portfolio', ph: 'Portfolio' },
    ].filter(Boolean) as Array<{ icon: React.ReactNode; val: string; field: string; ph: string }>;

    if (layout === 'stacked') {
      return (
        <div className="space-y-1.5 text-[10px] text-slate-400 font-light">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              {item.icon}
              <span className="truncate">
                <EditableText fieldName={item.field} value={item.val} placeholder={item.ph} />
              </span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-500 font-medium">
        {items.map((item, index) => (
          <span key={index} className="flex items-center gap-1">
            {item.icon}
            <EditableText fieldName={item.field} value={item.val} placeholder={item.ph} />
          </span>
        ))}
      </div>
    );
  };

  // ==========================================
  // TEMPLATE RENDER PIPELINES
  // ==========================================

  // 1. ATS Template (Georgia/Times Serif style, strictly single column, text-only)
  if (templateId === 'ats') {
    return (
      <div className="w-[794px] min-h-[1123px] relative bg-white text-slate-950 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between select-none font-serif">
        <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
          {renderPageBreakGuides()}
          
          <div className="p-10 flex flex-col gap-4">
            <div className="text-center border-b border-slate-900 pb-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 leading-tight">
                <EditableText fieldName="personalInfo.fullName" value={personalInfo?.fullName || ''} placeholder="Your Name" />
              </h1>
              <p className="text-xs font-semibold text-slate-800 mt-1 italic">
                <EditableText fieldName="personalInfo.title" value={personalInfo?.title || ''} placeholder="Professional Title" />
              </p>
              {(visibleSections.personalInfo ?? true) && (
                <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[9.5px] text-slate-800">
                  {personalInfo?.email && (
                    <span className="flex items-center gap-1">
                      <EditableText fieldName="personalInfo.email" value={personalInfo.email} placeholder="Email" />
                    </span>
                  )}
                  {personalInfo?.phone && <span>|</span>}
                  {personalInfo?.phone && (
                    <span className="flex items-center gap-1">
                      <EditableText fieldName="personalInfo.phone" value={personalInfo.phone} placeholder="Phone" />
                    </span>
                  )}
                  {personalInfo?.location && <span>|</span>}
                  {personalInfo?.location && (
                    <span className="flex items-center gap-1">
                      <EditableText fieldName="personalInfo.location" value={personalInfo.location} placeholder="Location" />
                    </span>
                  )}
                  {personalInfo?.linkedin && <span>|</span>}
                  {personalInfo?.linkedin && (
                    <span className="flex items-center gap-1">
                      <EditableText fieldName="personalInfo.linkedin" value={personalInfo.linkedin} placeholder="LinkedIn" />
                    </span>
                  )}
                  {personalInfo?.github && <span>|</span>}
                  {personalInfo?.github && (
                    <span className="flex items-center gap-1">
                      <EditableText fieldName="personalInfo.github" value={personalInfo.github} placeholder="GitHub" />
                    </span>
                  )}
                  {personalInfo?.portfolio && <span>|</span>}
                  {personalInfo?.portfolio && (
                    <span className="flex items-center gap-1">
                      <EditableText fieldName="personalInfo.portfolio" value={personalInfo.portfolio} placeholder="Portfolio" />
                    </span>
                  )}
                </div>
              )}
            </div>

            {sectionOrder.map((sectionKey) => (
              <React.Fragment key={sectionKey}>
                {renderSection(sectionKey)}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-3 text-center text-[9px] text-slate-400 z-10 font-sans">
          Created using AI Resume Builder
        </div>
      </div>
    );
  }

  // 2. Tech Template (Developer & Tech centric layout with teal branding)
  if (templateId === 'tech') {
    return (
      <div className="w-[794px] min-h-[1123px] relative bg-white text-slate-900 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between select-none font-sans">
        <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
          {renderPageBreakGuides()}
          
          <div className="flex flex-col h-full min-h-[1123px]">
            {/* Header Block */}
            <div className="bg-slate-950 text-white p-6 border-b-4 border-teal-500 flex justify-between items-end">
              <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
                  <EditableText fieldName="personalInfo.fullName" value={personalInfo?.fullName || ''} placeholder="Your Name" />
                </h1>
                <p className="text-xs font-bold text-teal-400 font-mono uppercase tracking-widest">
                  <EditableText fieldName="personalInfo.title" value={personalInfo?.title || ''} placeholder="Professional Title" />
                </p>
              </div>
              
              {(visibleSections.personalInfo ?? true) && (
                <div className="text-right text-[9px] text-slate-300 font-mono space-y-0.5">
                  {personalInfo?.email && <div>{personalInfo.email}</div>}
                  {personalInfo?.phone && <div>{personalInfo.phone}</div>}
                  {personalInfo?.location && <div>{personalInfo.location}</div>}
                </div>
              )}
            </div>

            {/* Split Columns */}
            <div className="flex flex-1 p-6 gap-6">
              {/* Main Column */}
              <div className="w-[65%] flex flex-col gap-4">
                {sectionOrder
                  .filter(key => key !== 'skills' && key !== 'certificates' && key !== 'education')
                  .map((sectionKey) => (
                    <React.Fragment key={sectionKey}>
                      {renderSection(sectionKey)}
                    </React.Fragment>
                  ))}
              </div>

              {/* Sidebar Column */}
              <div className="w-[35%] flex flex-col gap-4 border-l border-slate-100 pl-6">
                {visibleSections.education && education.length > 0 && (
                  <div>
                    {renderSection('education')}
                  </div>
                )}
                {visibleSections.skills && hasSkills && (
                  <div>
                    {renderSection('skills')}
                  </div>
                )}
                {visibleSections.certificates && certificates.length > 0 && (
                  <div>
                    {renderSection('certificates')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-3 text-center text-[9px] text-slate-400 z-10">
          Created using AI Resume Builder
        </div>
      </div>
    );
  }

  // 3. Executive Template (Left Sidebar dark theme, serif-regular)
  if (templateId === 'executive') {
    return (
      <div className="w-[794px] min-h-[1123px] relative bg-white text-slate-900 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between select-none">
        <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
          {renderPageBreakGuides()}
          
          <div className="flex h-full min-h-[1123px]">
            {/* Sidebar Column */}
            <div className="w-[30%] bg-slate-950 text-slate-300 p-6 flex flex-col gap-5 border-r border-slate-900">
              <div className="space-y-0.5">
                <h2 className="text-base font-extrabold text-white tracking-tight leading-tight">
                  <EditableText fieldName="personalInfo.fullName" value={personalInfo?.fullName || ''} placeholder="Your Name" />
                </h2>
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                  <EditableText fieldName="personalInfo.title" value={personalInfo?.title || ''} placeholder="Professional Title" />
                </p>
              </div>

              {(visibleSections.personalInfo ?? true) && (
                <div className="space-y-2 pt-1 border-t border-slate-900">
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-450">Contact</h4>
                  {renderContactsList('stacked')}
                </div>
              )}

              {hasSkills && visibleSections.skills && (
                <div className="space-y-2">
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-450">Skills</h4>
                  {skills?.technicalSkills && skills.technicalSkills.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Technical</h5>
                      <div className="flex flex-wrap gap-1">
                        {skills.technicalSkills.map((sk, i) => (
                          <span key={i} className="inline-block">
                            {renderBadge(
                              <EditableText fieldName={`skills.technicalSkills.${i}`} value={sk} placeholder="Skill" />
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {skills?.softSkills && skills.softSkills.length > 0 && (
                    <div className="space-y-1 mt-1">
                      <h5 className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Soft</h5>
                      <div className="flex flex-wrap gap-1">
                        {skills.softSkills.map((sk, i) => (
                          <span key={i} className="inline-block">
                            {renderBadge(
                              <EditableText fieldName={`skills.softSkills.${i}`} value={sk} placeholder="Skill" />
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {certificates.length > 0 && visibleSections.certificates && (
                <div className="space-y-2">
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-450">Certifications</h4>
                  <ul className="space-y-2 text-[9px] font-light">
                    {certificates.map((cert, idx) => (
                      <li key={cert.id || idx} className="space-y-0.5">
                        <div className="font-bold text-white leading-tight">
                          <EditableText fieldName={`certificates.${idx}.name`} value={cert.name} placeholder="Certificate name" />
                        </div>
                        <div className="text-slate-400 text-[8px]">
                          <EditableText fieldName={`certificates.${idx}.issuer`} value={cert.issuer} placeholder="Issuer" />
                          {" ("}
                          <EditableText fieldName={`certificates.${idx}.date`} value={cert.date} placeholder="Date" />
                          {")"}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="w-[70%] p-8 flex flex-col gap-6">
              {sectionOrder
                .filter(key => key !== 'skills' && key !== 'certificates')
                .map((sectionKey) => (
                  <React.Fragment key={sectionKey}>
                    {renderSection(sectionKey)}
                  </React.Fragment>
                ))}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-3 text-center text-[9px] text-slate-400 z-10">
          Created using AI Resume Builder
        </div>
      </div>
    );
  }

  // 4. Modern Template (Centered, elegant indigo banner styling)
  if (templateId === 'modern') {
    return (
      <div className="w-[794px] min-h-[1123px] relative bg-white text-slate-900 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between select-none font-sans">
        <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
          {renderPageBreakGuides()}
          
          <div className="p-8 flex flex-col gap-5">
            {/* Top decorative gradient bar */}
            <div className="h-2 bg-gradient-to-r from-indigo-650 via-purple-500 to-indigo-700 -mx-8 -mt-8 mb-4 shadow-sm" />
            
            {/* Header Block */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  <EditableText fieldName="personalInfo.fullName" value={personalInfo?.fullName || ''} placeholder="Your Name" />
                </h1>
                <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
                  <EditableText fieldName="personalInfo.title" value={personalInfo?.title || ''} placeholder="Professional Title" />
                </p>
              </div>

              {(visibleSections.personalInfo ?? true) && (
                <div className="text-right text-[10px] text-slate-500 font-light space-y-1 pt-1.5 shrink-0 max-w-[40%]">
                  {personalInfo?.email && <div className="flex items-center justify-end gap-1"><Mail className="w-3 h-3 text-indigo-400" /> {personalInfo.email}</div>}
                  {personalInfo?.phone && <div className="flex items-center justify-end gap-1"><Phone className="w-3 h-3 text-indigo-400" /> {personalInfo.phone}</div>}
                  {personalInfo?.location && <div className="flex items-center justify-end gap-1"><MapPin className="w-3 h-3 text-indigo-400" /> {personalInfo.location}</div>}
                </div>
              )}
            </div>

            {sectionOrder.map((sectionKey) => (
              <React.Fragment key={sectionKey}>
                {renderSection(sectionKey)}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-3 text-center text-[9px] text-slate-400 z-10">
          Created using AI Resume Builder
        </div>
      </div>
    );
  }

  // 5. Minimal / Minimalist Clean (Ultra whitespace and thin separators)
  if (templateId === 'minimal' || templateId === 'modern-minimalist') {
    return (
      <div className="w-[794px] min-h-[1123px] relative bg-white text-slate-900 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between select-none font-sans font-light">
        <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
          {renderPageBreakGuides()}
          
          <div className="p-10 flex flex-col gap-5">
            <div className="border-b border-slate-150 pb-4">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 leading-none">
                <EditableText fieldName="personalInfo.fullName" value={personalInfo?.fullName || ''} placeholder="Your Name" />
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">
                <EditableText fieldName="personalInfo.title" value={personalInfo?.title || ''} placeholder="Professional Title" />
              </p>
              {(visibleSections.personalInfo ?? true) && renderContactsList('inline')}
            </div>

            {sectionOrder.map((sectionKey) => (
              <React.Fragment key={sectionKey}>
                {renderSection(sectionKey)}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-3 text-center text-[9px] text-slate-400 z-10">
          Created using AI Resume Builder
        </div>
      </div>
    );
  }

  // 6. Creative Template (Rose branding, asymmetrical, bold layout)
  if (templateId === 'creative') {
    return (
      <div className="w-[794px] min-h-[1123px] relative bg-white text-slate-900 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between select-none font-sans">
        <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
          {renderPageBreakGuides()}
          
          <div className="p-8 flex flex-col gap-5">
            {/* Creative Top Header layout */}
            <div className="flex justify-between items-start bg-rose-50/45 p-6 rounded-2xl border border-rose-100/50">
              <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tighter text-rose-600 leading-tight">
                  <EditableText fieldName="personalInfo.fullName" value={personalInfo?.fullName || ''} placeholder="Your Name" />
                </h1>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  <EditableText fieldName="personalInfo.title" value={personalInfo?.title || ''} placeholder="Professional Title" />
                </p>
              </div>

              {(visibleSections.personalInfo ?? true) && (
                <div className="text-right text-[10px] text-slate-605 font-medium space-y-1 shrink-0 max-w-[50%]">
                  {personalInfo?.email && <div className="flex items-center justify-end gap-1"><Mail className="w-3.5 h-3.5 text-rose-500" /> {personalInfo.email}</div>}
                  {personalInfo?.phone && <div className="flex items-center justify-end gap-1"><Phone className="w-3.5 h-3.5 text-rose-500" /> {personalInfo.phone}</div>}
                  {personalInfo?.location && <div className="flex items-center justify-end gap-1"><MapPin className="w-3.5 h-3.5 text-rose-500" /> {personalInfo.location}</div>}
                </div>
              )}
            </div>

            {sectionOrder.map((sectionKey) => (
              <React.Fragment key={sectionKey}>
                {renderSection(sectionKey)}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-3 text-center text-[9px] text-rose-500 z-10 font-bold">
          Created using AI Resume Builder
        </div>
      </div>
    );
  }

  // 7. Professional Template (Serif elegant headings - Legacy fallback)
  return (
    <div className="w-[794px] min-h-[1123px] relative bg-white text-slate-900 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between select-none">
      <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
        {renderPageBreakGuides()}
        
        <div className="p-10 flex flex-col gap-6">
          <div className="text-center border-b pb-4 border-indigo-200">
            <h1 className="text-3xl font-extrabold tracking-tight text-indigo-950 font-serif leading-tight">
              <EditableText fieldName="personalInfo.fullName" value={personalInfo?.fullName || ''} placeholder="Your Name" />
            </h1>
            <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-widest font-sans">
              <EditableText fieldName="personalInfo.title" value={personalInfo?.title || ''} placeholder="Professional Title" />
            </p>
            {(visibleSections.personalInfo ?? true) && (
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-sans">
                {personalInfo?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-indigo-400" />
                    <EditableText fieldName="personalInfo.email" value={personalInfo.email} placeholder="Email" />
                  </span>
                )}
                {personalInfo?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-indigo-400" />
                    <EditableText fieldName="personalInfo.phone" value={personalInfo.phone} placeholder="Phone" />
                  </span>
                )}
                {personalInfo?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    <EditableText fieldName="personalInfo.location" value={personalInfo.location} placeholder="Location" />
                  </span>
                )}
                {personalInfo?.linkedin && (
                  <span className="flex items-center gap-1">
                    <Linkedin className="w-3 h-3 text-indigo-400" />
                    <EditableText fieldName="personalInfo.linkedin" value={personalInfo.linkedin} placeholder="LinkedIn" />
                  </span>
                )}
                {personalInfo?.github && (
                  <span className="flex items-center gap-1">
                    <Github className="w-3 h-3 text-indigo-400" />
                    <EditableText fieldName="personalInfo.github" value={personalInfo.github} placeholder="GitHub" />
                  </span>
                )}
                {personalInfo?.portfolio && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-indigo-400" />
                    <EditableText fieldName="personalInfo.portfolio" value={personalInfo.portfolio} placeholder="Portfolio" />
                  </span>
                )}
              </div>
            )}
          </div>

          {sectionOrder.map((sectionKey) => (
            <React.Fragment key={sectionKey}>
              {renderSection(sectionKey)}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-3 text-center text-[9px] text-slate-400 z-10">
        Created using AI Resume Builder
      </div>
    </div>
  );
}
