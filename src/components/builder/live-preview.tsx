'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ResumeValues } from '@/types/resume-schema';
import { Mail, Phone, MapPin, Globe, ExternalLink, Award, Trophy } from 'lucide-react';
import { LinkedinIcon as Linkedin, GithubIcon as Github } from '@/components/shared/icons';

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

  // Render individual sections
  const renderSummary = () => {
    if (!personalInfo?.summary || !visibleSections.personalInfo) return null;
    return (
      <div className="space-y-2">
        <h3 className={`text-xs font-bold uppercase tracking-wider pb-1 border-b ${
          templateId === 'professional'
            ? 'font-serif text-indigo-900 border-indigo-200'
            : templateId === 'executive'
            ? 'font-sans text-slate-800 border-slate-200'
            : 'font-sans text-slate-900 border-slate-200'
        }`}>
          Professional Summary
        </h3>
        <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line font-light">
          {personalInfo.summary}
        </p>
      </div>
    );
  };

  const renderExperience = () => {
    if (workExperience.length === 0 || !visibleSections.workExperience) return null;
    return (
      <div className="space-y-3">
        <h3 className={`text-xs font-bold uppercase tracking-wider pb-1 border-b ${
          templateId === 'professional'
            ? 'font-serif text-indigo-900 border-indigo-200'
            : templateId === 'executive'
            ? 'font-sans text-slate-800 border-slate-200'
            : 'font-sans text-slate-900 border-slate-200'
        }`}>
          Professional Experience
        </h3>
        <div className="space-y-4">
          {workExperience.map((exp, index) => (
            <div key={exp.id || index} className="space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`font-bold text-xs text-slate-900 ${templateId === 'professional' ? 'font-serif' : ''}`}>{exp.position}</span>
                  <span className="text-slate-400 mx-1.5">|</span>
                  <span className="font-semibold text-xs text-slate-700">{exp.company}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-100/80 border border-slate-200/50 rounded px-2 py-0.5 whitespace-nowrap">
                  {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                </span>
              </div>
              {exp.location && (
                <div className="text-[10px] text-slate-500 italic">{exp.location}</div>
              )}
              {exp.description && (
                <div 
                  className="preview-rich-text text-xs text-slate-700 leading-relaxed font-light"
                  dangerouslySetInnerHTML={{ __html: exp.description }}
                />
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
        <h3 className={`text-xs font-bold uppercase tracking-wider pb-1 border-b ${
          templateId === 'professional'
            ? 'font-serif text-indigo-900 border-indigo-200'
            : templateId === 'executive'
            ? 'font-sans text-slate-800 border-slate-200'
            : 'font-sans text-slate-900 border-slate-200'
        }`}>
          Projects
        </h3>
        <div className="space-y-4">
          {projects.map((proj, index) => (
            <div key={proj.id || index} className="space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`font-bold text-xs text-slate-900 ${templateId === 'professional' ? 'font-serif' : ''}`}>{proj.projectName}</span>
                  {proj.technologies && (
                    <span className="ml-2 text-[9px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-semibold border border-indigo-100">
                      {proj.technologies}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 text-[10px] text-slate-500 shrink-0">
                  {proj.githubUrl && (
                    <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:text-indigo-600 font-semibold transition-colors">
                      GitHub <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {proj.liveUrl && (
                    <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:text-indigo-600 font-semibold transition-colors">
                      Live <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
              {proj.description && (
                <div 
                  className="preview-rich-text text-xs text-slate-700 leading-relaxed font-light"
                  dangerouslySetInnerHTML={{ __html: proj.description }}
                />
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
        <h3 className={`text-xs font-bold uppercase tracking-wider pb-1 border-b ${
          templateId === 'professional'
            ? 'font-serif text-indigo-900 border-indigo-200'
            : templateId === 'executive'
            ? 'font-sans text-slate-800 border-slate-200'
            : 'font-sans text-slate-900 border-slate-200'
        }`}>
          Education
        </h3>
        <div className="space-y-3">
          {education.map((edu, index) => (
            <div key={edu.id || index} className="flex justify-between items-start">
              <div>
                <span className={`font-bold text-xs text-slate-900 ${templateId === 'professional' ? 'font-serif' : ''}`}>{edu.degree}</span>
                {edu.fieldOfStudy && (
                  <>
                    <span className="text-slate-400 mx-1.5 font-light">in</span>
                    <span className="font-semibold text-xs text-slate-700">{edu.fieldOfStudy}</span>
                  </>
                )}
                <div className="text-xs text-slate-600 mt-0.5 font-medium">{edu.school}</div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-100/80 border border-slate-200/50 rounded px-2 py-0.5 whitespace-nowrap">
                {edu.startDate} – {edu.current ? 'Present' : edu.endDate}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSkills = () => {
    if (!hasSkills || !visibleSections.skills) return null;
    return (
      <div className="space-y-3">
        <h3 className={`text-xs font-bold uppercase tracking-wider pb-1 border-b ${
          templateId === 'professional'
            ? 'font-serif text-indigo-900 border-indigo-200'
            : templateId === 'executive'
            ? 'font-sans text-slate-800 border-slate-200'
            : 'font-sans text-slate-900 border-slate-200'
        }`}>
          Skills
        </h3>
        <div className="grid grid-cols-1 gap-3 text-xs">
          {skills?.technicalSkills && skills.technicalSkills.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-950 mb-0.5">Technical Skills</h4>
              <p className="text-slate-700 leading-relaxed font-light">
                {skills.technicalSkills.join(', ')}
              </p>
            </div>
          )}
          {skills?.softSkills && skills.softSkills.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-950 mb-0.5">Soft Skills</h4>
              <p className="text-slate-700 leading-relaxed font-light">
                {skills.softSkills.join(', ')}
              </p>
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
        <h3 className={`text-xs font-bold uppercase tracking-wider pb-1 border-b ${
          templateId === 'professional'
            ? 'font-serif text-indigo-900 border-indigo-200'
            : templateId === 'executive'
            ? 'font-sans text-slate-800 border-slate-200'
            : 'font-sans text-slate-900 border-slate-200'
        } flex items-center gap-1`}>
          <Award className="w-3.5 h-3.5 text-slate-800" />
          Certifications
        </h3>
        <ul className="space-y-2 text-xs">
          {certificates.map((cert, idx) => (
            <li key={cert.id || idx} className="space-y-0.5">
              <div className="flex justify-between">
                <span className="font-bold text-slate-900">{cert.name}</span>
                <span className="text-slate-400 text-[10px] font-medium shrink-0">{cert.date}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span className="font-medium">{cert.issuer}</span>
                {cert.url && (
                  <a href={cert.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5 font-bold">
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
        <h3 className={`text-xs font-bold uppercase tracking-wider pb-1 border-b ${
          templateId === 'professional'
            ? 'font-serif text-indigo-900 border-indigo-200'
            : templateId === 'executive'
            ? 'font-sans text-slate-800 border-slate-200'
            : 'font-sans text-slate-900 border-slate-200'
        } flex items-center gap-1`}>
          <Trophy className="w-3.5 h-3.5 text-slate-800" />
          Achievements
        </h3>
        <ul className="space-y-2 text-xs">
          {achievements.map((ach, idx) => (
            <li key={ach.id || idx} className="space-y-0.5">
              <div className="flex justify-between">
                <span className="font-bold text-slate-900">{ach.title}</span>
                <span className="text-slate-400 text-[10px] font-medium shrink-0">{ach.date}</span>
              </div>
              {ach.description && (
                <p className="text-[10px] text-slate-600 leading-relaxed font-light">{ach.description}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderSection = (key: string) => {
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

  const renderContactsList = (layout: 'inline' | 'stacked') => {
    const items = [
      personalInfo?.email && { icon: <Mail className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.email },
      personalInfo?.phone && { icon: <Phone className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.phone },
      personalInfo?.location && { icon: <MapPin className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.location },
      personalInfo?.linkedin && { icon: <Linkedin className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '') },
      personalInfo?.github && { icon: <Github className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.github.replace(/^https?:\/\/(www\.)?/, '') },
      personalInfo?.portfolio && { icon: <Globe className="w-3 h-3 text-slate-400 shrink-0" />, val: personalInfo.portfolio.replace(/^https?:\/\/(www\.)?/, '') },
    ].filter(Boolean) as Array<{ icon: React.ReactNode; val: string }>;

    if (layout === 'stacked') {
      return (
        <div className="space-y-1.5 text-[10px] text-slate-300 font-light">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              {item.icon}
              <span className="truncate">{item.val}</span>
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
            {item.val}
          </span>
        ))}
      </div>
    );
  };

  // ==========================================
  // TEMPLATES: 1. EXECUTIVE TEMPLATE (2-Column)
  // ==========================================
  if (templateId === 'executive') {
    return (
      <div className="w-[794px] min-h-[1123px] relative bg-white text-slate-900 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between select-none">
        
        {/* Render page break horizontal guides inside canvas */}
        <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
          {renderPageBreakGuides()}
          
          <div className="flex h-full min-h-[1123px]">
            {/* Sidebar Column */}
            <div className="w-[30%] bg-slate-950 text-slate-300 p-6 flex flex-col gap-5 border-r border-slate-900">
              <div className="space-y-0.5">
                <h2 className="text-base font-extrabold text-white tracking-tight leading-tight">
                  {personalInfo?.fullName || 'Your Name'}
                </h2>
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                  {personalInfo?.title || 'Professional Title'}
                </p>
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-900">
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Contact</h4>
                {renderContactsList('stacked')}
              </div>

              {hasSkills && visibleSections.skills && (
                <div className="space-y-2">
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Skills</h4>
                  {skills?.technicalSkills && skills.technicalSkills.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Technical</h5>
                      <div className="flex flex-wrap gap-1">
                        {skills.technicalSkills.map((sk, i) => (
                          <span key={i} className="text-[9px] bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-medium">{sk}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {skills?.softSkills && skills.softSkills.length > 0 && (
                    <div className="space-y-1 mt-1">
                      <h5 className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Soft</h5>
                      <div className="flex flex-wrap gap-1">
                        {skills.softSkills.map((sk, i) => (
                          <span key={i} className="text-[9px] bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-medium">{sk}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {certificates.length > 0 && visibleSections.certificates && (
                <div className="space-y-2">
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Certifications</h4>
                  <ul className="space-y-2 text-[9px] font-light">
                    {certificates.map((cert, idx) => (
                      <li key={cert.id || idx} className="space-y-0.5">
                        <div className="font-bold text-white leading-tight">{cert.name}</div>
                        <div className="text-slate-400 text-[8px]">{cert.issuer} ({cert.date})</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Main Area Column */}
            <div className="w-[70%] p-8 flex flex-col gap-6">
              {renderSummary()}
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

  // ==========================================
  // TEMPLATES: 2. PROFESSIONAL (Serif headings)
  // ==========================================
  if (templateId === 'professional') {
    return (
      <div className="w-[794px] min-h-[1123px] relative bg-white text-slate-900 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between select-none">
        
        {/* Render guides inside canvas */}
        <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
          {renderPageBreakGuides()}
          
          <div className="p-10 flex flex-col gap-6">
            <div className="text-center border-b pb-4 border-indigo-200">
              <h1 className="text-3xl font-extrabold tracking-tight text-indigo-950 font-serif leading-tight">
                {personalInfo?.fullName || 'Your Full Name'}
              </h1>
              <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-widest font-sans">
                {personalInfo?.title || 'Professional Title'}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-sans">
                {personalInfo?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-indigo-400" />{personalInfo.email}</span>}
                {personalInfo?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-indigo-400" />{personalInfo.phone}</span>}
                {personalInfo?.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-indigo-400" />{personalInfo.location}</span>}
                {personalInfo?.linkedin && <span className="flex items-center gap-1"><Linkedin className="w-3 h-3 text-indigo-400" />{personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                {personalInfo?.github && <span className="flex items-center gap-1"><Github className="w-3 h-3 text-indigo-400" />{personalInfo.github.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                {personalInfo?.portfolio && <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-indigo-400" />{personalInfo.portfolio.replace(/^https?:\/\/(www\.)?/, '')}</span>}
              </div>
            </div>

            {renderSummary()}

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

  // ==========================================
  // TEMPLATES: 3. MODERN MINIMALIST (Standard)
  // ==========================================
  return (
    <div className="w-[794px] min-h-[1123px] relative bg-white text-slate-900 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between select-none">
      
      {/* Render guides inside canvas */}
      <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
        {renderPageBreakGuides()}
        
        <div className="p-10 flex flex-col gap-6">
          <div className="border-b-2 border-slate-950 pb-4">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">
              {personalInfo?.fullName || 'Your Full Name'}
            </h1>
            <p className="text-xs font-bold text-indigo-600 mt-1.5 uppercase tracking-widest">
              {personalInfo?.title || 'Professional Title'}
            </p>
            {renderContactsList('inline')}
          </div>

          {renderSummary()}

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
