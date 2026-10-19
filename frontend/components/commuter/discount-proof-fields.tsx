"use client";

import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { FileText, ImageIcon, Upload, X } from 'lucide-react';
import { compressImage, IMAGE_COMPRESSION } from '@/lib/utils/compress-image';
import { EDUCATION_LABELS, ENROLLMENT_TERMS, HIGH_SCHOOL_GRADES, type EducationLevel, type DiscountApplication } from '@/lib/shared/services/student-renewal.service';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const field = 'mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white transition-colors placeholder:text-white/50 focus:border-[#62A0EA] light:border-gray-200 light:bg-white light:text-gray-900 light:placeholder:text-gray-400 light:focus:border-[#1A5FB4] focus:outline-none focus:ring-2 focus:ring-[#62A0EA]/20 disabled:opacity-50';
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export function useDiscountProof() {
  const [schoolName, setSchoolName] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [term, setTerm] = useState('');
  const [document, setDocumentState] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  // Bumped on every pick/clear so a compression that finishes after the
  // document was cleared or replaced cannot overwrite the newer state.
  const pick = useRef(0);
  const setDocument = useCallback((file: File | null) => { pick.current += 1; setDocumentState(file); }, []);
  const incomplete = !schoolName.trim() || !educationLevel || !schoolYear.trim()
    || (educationLevel === 'HIGH_SCHOOL' && !gradeLevel) || (educationLevel === 'COLLEGE' && !term.trim());
  const prefill = useCallback((previous: DiscountApplication) => {
    setSchoolName(previous.school_name ?? '');
    setEducationLevel(previous.education_level && previous.education_level in EDUCATION_LABELS ? previous.education_level : '');
    setGradeLevel(HIGH_SCHOOL_GRADES.some(grade => grade === previous.grade_level) ? String(previous.grade_level) : '');
    setSchoolYear(previous.school_year ?? '');
    setTerm(ENROLLMENT_TERMS.some(item => item === previous.enrollment_term) ? previous.enrollment_term ?? '' : '');
  }, []);
  const chooseDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES || !ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Choose a JPG, PNG, WebP, or PDF document up to 5 MB.'); return;
    }
    setFileError('');
    const current = ++pick.current;
    // PDFs come back unchanged; images are downscaled before upload.
    const compressed = await compressImage(file, IMAGE_COMPRESSION.document);
    if (current === pick.current) setDocumentState(compressed);
  };
  const formData = (student = true, includeDocument = true) => {
    const body = new FormData();
    if (includeDocument && document) body.set('document', document);
    if (student) {
      body.set('school_name', schoolName.trim()); body.set('education_level', educationLevel);
      if (educationLevel === 'HIGH_SCHOOL') body.set('grade_level', gradeLevel);
      body.set('school_year', schoolYear.trim());
      if (term.trim()) body.set('enrollment_term', term.trim());
    }
    return body;
  };
  return { schoolName, setSchoolName, educationLevel, setEducationLevel, gradeLevel, setGradeLevel,
    schoolYear, setSchoolYear, term, setTerm, document, setDocument, fileError, chooseDocument, incomplete, prefill, formData };
}

export function DiscountProofFields({ proof, busy, proofId, year, student = true, documentLabel = 'Enrollment proof', studentSectionSpacing = false, showDocument = true }: {
  proof: ReturnType<typeof useDiscountProof>; busy: boolean; proofId: string; year: number; student?: boolean; documentLabel?: string; studentSectionSpacing?: boolean; showDocument?: boolean;
}) {
  const { schoolName, setSchoolName, educationLevel, setEducationLevel, gradeLevel, setGradeLevel,
    schoolYear, setSchoolYear, term, setTerm, document, setDocument, fileError, chooseDocument } = proof;
  return <>
    {student && <>
    <label className="block text-sm font-medium">School
      <input required maxLength={150} value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Name of your school or university" autoComplete="organization" disabled={busy} className={field} />
    </label>
    <div className={`grid gap-6 sm:grid-cols-2 ${studentSectionSpacing ? 'mt-6' : ''}`}>
      <fieldset disabled={busy} className="min-w-0 disabled:opacity-50">
        <legend className="text-sm font-medium">Education level</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(Object.keys(EDUCATION_LABELS) as EducationLevel[]).map(level => (
            <label key={level} className={`flex min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#99C1F1] ${busy ? '' : 'cursor-pointer'} ${educationLevel === level ? 'border-[#62A0EA] bg-[#62A0EA]/10 text-white light:border-[#1A5FB4] light:bg-[#1A5FB4]/10 light:text-[#1A5FB4]' : 'border-white/15 bg-white/5 text-white/70 hover:text-white light:border-gray-200 light:bg-white light:text-gray-600 light:hover:text-gray-900'}`}>
              <input type="radio" name="education_level" value={level} required checked={educationLevel === level} onChange={() => { setEducationLevel(level); if (level === 'COLLEGE') setGradeLevel(''); }} className="sr-only" />
              {EDUCATION_LABELS[level]}
            </label>
          ))}
        </div>
      </fieldset>
      {educationLevel === 'HIGH_SCHOOL' && (
        <label className="block text-sm font-medium">Grade level
          <select required value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} disabled={busy} className={`${field} scheme-dark light:scheme-light`}>
            {/* The select's translucent fill cannot paint the native
                option list, so the options carry an opaque tone. */}
            <option value="" disabled className="bg-[#0E1628] light:bg-white">Select grade</option>
            {HIGH_SCHOOL_GRADES.map(grade => <option key={grade} value={grade} className="bg-[#0E1628] light:bg-white">Grade {grade}</option>)}
          </select>
        </label>
      )}
    </div>
    <div className={`grid gap-6 sm:grid-cols-2 ${studentSectionSpacing ? 'mt-6' : ''}`}>
      <label className="block text-sm font-medium">School year
        <input required maxLength={20} value={schoolYear} onChange={e => setSchoolYear(e.target.value)} placeholder={`For example, ${year}–${year + 1}`} disabled={busy} className={field} />
      </label>
      <label className="block text-sm font-medium">Enrollment term{educationLevel === 'HIGH_SCHOOL' && <span className="font-normal text-white/50 light:text-gray-500"> (optional)</span>}
        {/* The term is optional for high school, so the empty
            choice stays selectable there to clear a pick. */}
        <select required={educationLevel === 'COLLEGE'} value={term} onChange={e => setTerm(e.target.value)} disabled={busy} className={`${field} scheme-dark light:scheme-light`}>
          <option value="" disabled={educationLevel !== 'HIGH_SCHOOL'} className="bg-[#0E1628] light:bg-white">{educationLevel === 'HIGH_SCHOOL' ? 'No term' : 'Select term'}</option>
          {ENROLLMENT_TERMS.map(item => <option key={item} value={item} className="bg-[#0E1628] light:bg-white">{item}</option>)}
        </select>
      </label>
    </div>
</>}
    {showDocument ? <div role="group" aria-labelledby={`${proofId}-label`} className={student && studentSectionSpacing ? 'mt-6' : undefined}>
      <p id={`${proofId}-label`} className="text-sm font-medium">{documentLabel}</p>
      {/* The frame and the row under it keep the same size with or
          without a file, so choosing one never moves the form. */}
      <div className={`mt-2 overflow-hidden rounded-lg border bg-white/5 light:bg-white ${fileError ? 'border-red-400/60' : 'border-white/15 light:border-gray-200'}`}>
        {document ? (
          // Show the selected document type and filename before submission.
          <div className="flex h-48 flex-col items-center justify-center gap-2 border-b border-white/10 bg-[#0E1628] light:border-gray-200 light:bg-gray-50 text-xs text-white/50 light:text-gray-500 sm:h-56">
            {document.type === 'application/pdf'
              ? <><FileText size={28} aria-hidden="true" className="text-[#99C1F1] light:text-[#1A5FB4]" />PDF document</>
              : <><ImageIcon size={28} aria-hidden="true" className="text-[#99C1F1] light:text-[#1A5FB4]" />Image preview</>}
          </div>
        ) : (
          <label className={`flex h-48 flex-col items-center justify-center gap-2 border-b border-white/10 bg-[#0E1628] light:border-gray-200 light:bg-gray-50 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#62A0EA]/60 sm:h-56 ${busy ? 'opacity-50' : 'cursor-pointer hover:bg-[#131C2E] light:hover:bg-gray-100'}`}>
            <Upload size={28} aria-hidden="true" className="text-[#99C1F1] light:text-[#1A5FB4]" />
            Choose a file
            <input type="file" accept={ACCEPTED_TYPES.join(',')} onChange={chooseDocument} disabled={busy} aria-describedby={`${proofId}-hint`} className="sr-only" />
          </label>
        )}
        <div className="flex min-h-14 items-center gap-3 py-2 pl-3.5 pr-2">
          {document ? <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{document.name}</p>
              <p className="text-xs text-white/60 light:text-gray-500">{formatSize(document.size)}</p>
            </div>
            <button type="button" onClick={() => setDocument(null)} disabled={busy} aria-label={`Remove ${document.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white light:text-gray-400 light:hover:bg-gray-100 light:hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-[#99C1F1] disabled:opacity-50">
              <X size={16} aria-hidden="true" />
            </button>
          </> : <p className="text-sm text-white/50 light:text-gray-500">No file selected</p>}
        </div>
      </div>
      {fileError && <p role="alert" className="mt-2 text-xs text-red-300 light:text-red-600">{fileError}</p>}
      <p id={`${proofId}-hint`} className="mt-2 text-xs leading-relaxed text-white/60 light:text-gray-500">JPG, PNG, WebP, or PDF; up to 5 MB. Your document is available only to authorized reviewers.</p>
    </div> : <p role="note" className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-relaxed text-amber-100/80 light:border-amber-200 light:bg-amber-50 light:text-amber-800">Local workflow testing: document upload is disabled. No file will be sent or stored.</p>}
  </>;
}
