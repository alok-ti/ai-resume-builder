import { ResumeValues } from '@/types/resume-schema';

export interface ResumeDifference {
  id: string; // unique ID of difference card
  section: string; // e.g., 'personalInfo', 'workExperience', 'skills', etc.
  fieldPath: string; // exact react-hook-form path to modify
  itemLabel?: string; // human readable context (e.g. "Google - Software Engineer")
  changeType: 'added' | 'deleted' | 'modified';
  baseValue: any;
  currentValue: any;
}

// Helper to strip HTML tags for text-only comparison
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export function getResumeDifferences(base: ResumeValues, current: ResumeValues): ResumeDifference[] {
  const diffs: ResumeDifference[] = [];

  if (!base || !current) return diffs;

  // ==========================================
  // 1. Personal Info Section
  // ==========================================
  const personalFields = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'title', label: 'Professional Title' },
    { key: 'email', label: 'Email Address' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'location', label: 'Location' },
    { key: 'linkedin', label: 'LinkedIn Profile' },
    { key: 'github', label: 'GitHub Profile' },
    { key: 'portfolio', label: 'Portfolio Website' },
    { key: 'summary', label: 'Professional Summary' }
  ] as const;

  personalFields.forEach(({ key, label }) => {
    const baseVal = base.personalInfo?.[key] || '';
    const currVal = current.personalInfo?.[key] || '';
    
    if (baseVal !== currVal) {
      diffs.push({
        id: `personalInfo.${key}`,
        section: 'personalInfo',
        fieldPath: `personalInfo.${key}`,
        itemLabel: label,
        changeType: 'modified',
        baseValue: baseVal,
        currentValue: currVal
      });
    }
  });

  // ==========================================
  // 2. Skills Section
  // ==========================================
  const skillTypes = [
    { key: 'technicalSkills', label: 'Technical Skills' },
    { key: 'softSkills', label: 'Soft Skills' }
  ] as const;

  skillTypes.forEach(({ key, label }) => {
    const baseList = base.skills?.[key] || [];
    const currList = current.skills?.[key] || [];

    // Simple join comparison to see if skills changed
    if (JSON.stringify(baseList) !== JSON.stringify(currList)) {
      diffs.push({
        id: `skills.${key}`,
        section: 'skills',
        fieldPath: `skills.${key}`,
        itemLabel: label,
        changeType: 'modified',
        baseValue: baseList,
        currentValue: currList
      });
    }
  });

  // ==========================================
  // 3. Work Experience Section
  // ==========================================
  const baseExp = base.workExperience || [];
  const currExp = current.workExperience || [];

  // Track item statuses
  currExp.forEach((currItem, currIdx) => {
    const baseItem = baseExp.find(b => b.id === currItem.id);
    if (!baseItem) {
      // Newly added experience item
      diffs.push({
        id: `workExperience.add.${currItem.id}`,
        section: 'workExperience',
        fieldPath: `workExperience`,
        itemLabel: `Added Experience: ${currItem.position || 'Role'} at ${currItem.company || 'Company'}`,
        changeType: 'added',
        baseValue: null,
        currentValue: currItem
      });
    } else {
      // Modified fields within experience item
      const fieldsToCompare = [
        { key: 'company', label: 'Company' },
        { key: 'position', label: 'Position Title' },
        { key: 'location', label: 'Location' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' },
        { key: 'description', label: 'Description/Bullets' }
      ] as const;

      fieldsToCompare.forEach(({ key, label }) => {
        const baseVal = baseItem[key] || '';
        const currVal = currItem[key] || '';

        // If description, strip html tags before exact comparison or compare raw HTML
        const isDiff = key === 'description' 
          ? stripHtml(baseVal as string) !== stripHtml(currVal as string)
          : baseVal !== currVal;

        if (isDiff) {
          diffs.push({
            id: `workExperience.${currIdx}.${key}`,
            section: 'workExperience',
            fieldPath: `workExperience.${currIdx}.${key}`,
            itemLabel: `${currItem.position || 'Role'} at ${currItem.company || 'Company'} - ${label}`,
            changeType: 'modified',
            baseValue: baseVal,
            currentValue: currVal
          });
        }
      });
    }
  });

  // Deletions check
  baseExp.forEach((baseItem) => {
    const exists = currExp.some(c => c.id === baseItem.id);
    if (!exists) {
      diffs.push({
        id: `workExperience.delete.${baseItem.id}`,
        section: 'workExperience',
        fieldPath: `workExperience`,
        itemLabel: `Removed Experience: ${baseItem.position || 'Role'} at ${baseItem.company || 'Company'}`,
        changeType: 'deleted',
        baseValue: baseItem,
        currentValue: null
      });
    }
  });

  // ==========================================
  // 4. Education Section
  // ==========================================
  const baseEdu = base.education || [];
  const currEdu = current.education || [];

  currEdu.forEach((currItem, currIdx) => {
    const baseItem = baseEdu.find(b => b.id === currItem.id);
    if (!baseItem) {
      diffs.push({
        id: `education.add.${currItem.id}`,
        section: 'education',
        fieldPath: `education`,
        itemLabel: `Added Education: ${currItem.degree} from ${currItem.school}`,
        changeType: 'added',
        baseValue: null,
        currentValue: currItem
      });
    } else {
      const fields = [
        { key: 'school', label: 'School' },
        { key: 'degree', label: 'Degree' },
        { key: 'fieldOfStudy', label: 'Field of Study' },
        { key: 'location', label: 'Location' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' }
      ] as const;

      fields.forEach(({ key, label }) => {
        const baseVal = baseItem[key] || '';
        const currVal = currItem[key] || '';
        if (baseVal !== currVal) {
          diffs.push({
            id: `education.${currIdx}.${key}`,
            section: 'education',
            fieldPath: `education.${currIdx}.${key}`,
            itemLabel: `${currItem.degree || 'Degree'} from ${currItem.school || 'School'} - ${label}`,
            changeType: 'modified',
            baseValue: baseVal,
            currentValue: currVal
          });
        }
      });
    }
  });

  baseEdu.forEach((baseItem) => {
    const exists = currEdu.some(c => c.id === baseItem.id);
    if (!exists) {
      diffs.push({
        id: `education.delete.${baseItem.id}`,
        section: 'education',
        fieldPath: `education`,
        itemLabel: `Removed Education: ${baseItem.degree} from ${baseItem.school}`,
        changeType: 'deleted',
        baseValue: baseItem,
        currentValue: null
      });
    }
  });

  // ==========================================
  // 5. Projects Section
  // ==========================================
  const baseProj = base.projects || [];
  const currProj = current.projects || [];

  currProj.forEach((currItem, currIdx) => {
    const baseItem = baseProj.find(b => b.id === currItem.id);
    if (!baseItem) {
      diffs.push({
        id: `projects.add.${currItem.id}`,
        section: 'projects',
        fieldPath: `projects`,
        itemLabel: `Added Project: ${currItem.projectName}`,
        changeType: 'added',
        baseValue: null,
        currentValue: currItem
      });
    } else {
      const fields = [
        { key: 'projectName', label: 'Project Name' },
        { key: 'description', label: 'Description' },
        { key: 'technologies', label: 'Technologies' },
        { key: 'githubUrl', label: 'GitHub Link' },
        { key: 'liveUrl', label: 'Live Link' }
      ] as const;

      fields.forEach(({ key, label }) => {
        const baseVal = baseItem[key] || '';
        const currVal = currItem[key] || '';
        if (baseVal !== currVal) {
          diffs.push({
            id: `projects.${currIdx}.${key}`,
            section: 'projects',
            fieldPath: `projects.${currIdx}.${key}`,
            itemLabel: `Project "${currItem.projectName || 'Project'}" - ${label}`,
            changeType: 'modified',
            baseValue: baseVal,
            currentValue: currVal
          });
        }
      });
    }
  });

  baseProj.forEach((baseItem) => {
    const exists = currProj.some(c => c.id === baseItem.id);
    if (!exists) {
      diffs.push({
        id: `projects.delete.${baseItem.id}`,
        section: 'projects',
        fieldPath: `projects`,
        itemLabel: `Removed Project: ${baseItem.projectName}`,
        changeType: 'deleted',
        baseValue: baseItem,
        currentValue: null
      });
    }
  });

  // ==========================================
  // 6. Certifications Section
  // ==========================================
  const baseCert = base.certificates || [];
  const currCert = current.certificates || [];

  currCert.forEach((currItem, currIdx) => {
    const baseItem = baseCert.find(b => b.id === currItem.id);
    if (!baseItem) {
      diffs.push({
        id: `certificates.add.${currItem.id}`,
        section: 'certificates',
        fieldPath: `certificates`,
        itemLabel: `Added Certification: ${currItem.name}`,
        changeType: 'added',
        baseValue: null,
        currentValue: currItem
      });
    } else {
      const fields = [
        { key: 'name', label: 'Certificate Name' },
        { key: 'issuer', label: 'Issuer' },
        { key: 'date', label: 'Date' },
        { key: 'url', label: 'Verification URL' }
      ] as const;

      fields.forEach(({ key, label }) => {
        const baseVal = baseItem[key] || '';
        const currVal = currItem[key] || '';
        if (baseVal !== currVal) {
          diffs.push({
            id: `certificates.${currIdx}.${key}`,
            section: 'certificates',
            fieldPath: `certificates.${currIdx}.${key}`,
            itemLabel: `Certificate "${currItem.name || 'Cert'}" - ${label}`,
            changeType: 'modified',
            baseValue: baseVal,
            currentValue: currVal
          });
        }
      });
    }
  });

  baseCert.forEach((baseItem) => {
    const exists = currCert.some(c => c.id === baseItem.id);
    if (!exists) {
      diffs.push({
        id: `certificates.delete.${baseItem.id}`,
        section: 'certificates',
        fieldPath: `certificates`,
        itemLabel: `Removed Certification: ${baseItem.name}`,
        changeType: 'deleted',
        baseValue: baseItem,
        currentValue: null
      });
    }
  });

  // ==========================================
  // 7. Achievements Section
  // ==========================================
  const baseAch = base.achievements || [];
  const currAch = current.achievements || [];

  currAch.forEach((currItem, currIdx) => {
    const baseItem = baseAch.find(b => b.id === currItem.id);
    if (!baseItem) {
      diffs.push({
        id: `achievements.add.${currItem.id}`,
        section: 'achievements',
        fieldPath: `achievements`,
        itemLabel: `Added Achievement: ${currItem.title}`,
        changeType: 'added',
        baseValue: null,
        currentValue: currItem
      });
    } else {
      const fields = [
        { key: 'title', label: 'Achievement Title' },
        { key: 'date', label: 'Date' },
        { key: 'description', label: 'Description' }
      ] as const;

      fields.forEach(({ key, label }) => {
        const baseVal = baseItem[key] || '';
        const currVal = currItem[key] || '';
        if (baseVal !== currVal) {
          diffs.push({
            id: `achievements.${currIdx}.${key}`,
            section: 'achievements',
            fieldPath: `achievements.${currIdx}.${key}`,
            itemLabel: `Achievement "${currItem.title || 'Achievement'}" - ${label}`,
            changeType: 'modified',
            baseValue: baseVal,
            currentValue: currVal
          });
        }
      });
    }
  });

  baseAch.forEach((baseItem) => {
    const exists = currAch.some(c => c.id === baseItem.id);
    if (!exists) {
      diffs.push({
        id: `achievements.delete.${baseItem.id}`,
        section: 'achievements',
        fieldPath: `achievements`,
        itemLabel: `Removed Achievement: ${baseItem.title}`,
        changeType: 'deleted',
        baseValue: baseItem,
        currentValue: null
      });
    }
  });

  return diffs;
}
