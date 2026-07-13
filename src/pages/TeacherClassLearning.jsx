import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChartBarSquareIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import AdaptiveAssignmentForm from '../components/teacher/AdaptiveAssignmentForm';
import MasteryHeatmap from '../components/teacher/MasteryHeatmap';
import {
  InterventionQueue,
  MisconceptionList,
  RemediationGroups,
  StudentProfilePanel,
} from '../components/teacher/TeacherInsights';
import { LearningError, LearningLoader } from '../components/learning/LearningStates';
import api from '../services/api';

function SummaryCard(props) {
  const Icon = props.icon;
  return (
    <div className="rounded-3xl bg-surface-raised p-5 shadow-[0_18px_42px_-34px_rgba(20,20,18,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-text-dim">{props.label}</p>
          <p className="mt-2 text-3xl font-display font-extrabold text-text-primary">{props.value}</p>
          <p className="mt-1 text-xs font-semibold text-text-muted">{props.detail}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      </div>
    </div>
  );
}

export default function TeacherClassLearning() {
  const { classId } = useParams();
  const [threshold, setThreshold] = useState('0.6');
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [assignmentDraft, setAssignmentDraft] = useState(null);
  const [assignmentNotice, setAssignmentNotice] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await api.request(`/teacher-learning/classes/${classId}/analytics?subject=economics&threshold=${threshold}`);
      setState({ loading: false, error: '', data });
    } catch (error) {
      setState({ loading: false, error: error.message || 'Could not load class learning data.', data: null });
    }
  }, [classId, threshold]);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: '' }));
    api.request(`/teacher-learning/classes/${classId}/analytics?subject=economics&threshold=${threshold}`).then((data) => {
      if (active) setState({ loading: false, error: '', data });
    }).catch((error) => {
      if (active) setState({ loading: false, error: error.message || 'Could not load class learning data.', data: null });
    });
    return () => { active = false; };
  }, [classId, threshold]);

  const analytics = state.data?.analytics;
  const outcomes = analytics?.heatmap?.outcomes || [];
  const students = analytics?.heatmap?.students || [];
  const outcomeById = new Map(outcomes.map((outcome) => [String(outcome.id), outcome]));
  const selectedProfile = analytics?.individualProfiles?.find((profile) => profile.student.id === selectedStudentId) || null;

  const createFromGroup = (group) => {
    setAssignmentDraft({
      key: `${group.id}:${Date.now()}`,
      title: `${group.outcome.code} ${group.recommendedMode === 'diagnostic' ? 'diagnostic' : 'remediation'}`,
      mode: group.recommendedMode || 'remediation',
      outcomeIds: [group.outcome.id],
      studentIds: group.studentIds,
    });
    setAssignmentNotice('The suggested group is pre-filled below. Review it, then create the assignment.');
    const section = document.getElementById('adaptive-assignment');
    section?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const closeStudentProfile = () => {
    const triggerId = selectedStudentId ? `student-profile-trigger-${selectedStudentId}` : '';
    setSelectedStudentId(null);
    window.requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  };

  if (state.loading && !state.data) {
    return <main className="min-h-screen bg-surface-body pt-24"><LearningLoader message="Reading class learning evidence…" /></main>;
  }
  if (state.error && !state.data) {
    return <main className="min-h-screen bg-surface-body pt-24"><LearningError message={state.error} onRetry={load} /></main>;
  }

  const summary = analytics?.summary || {};

  return (
    <main className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <Link to={`/classes/${classId}`} className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-strong">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Back to class
        </Link>
        <header className="mb-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="font-hand text-xl text-accent -rotate-2 inline-block">teach from evidence</span>
            <h1 className="mt-2 text-5xl font-display font-extrabold tracking-tight text-text-primary md:text-7xl">Class learning.</h1>
            <p className="mt-4 text-lg font-medium text-text-muted">{state.data?.classroom?.name || 'Economics class'} · Outcome-level signals and next actions</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label htmlFor="intervention-threshold" className="text-xs font-bold text-text-muted">
              Intervention threshold
              <select id="intervention-threshold" value={threshold} onChange={(event) => setThreshold(event.target.value)} className="mt-2 block min-h-11 rounded-xl border border-line-soft bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                <option value="0.5">Below 50%</option>
                <option value="0.6">Below 60%</option>
                <option value="0.7">Below 70%</option>
              </select>
            </label>
            <button type="button" onClick={load} disabled={state.loading} className="btn-secondary">
              <ArrowPathIcon className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
            </button>
          </div>
        </header>

        {state.error && <div role="alert" className="mb-6 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">{state.error}</div>}

        <section className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Class learning summary">
          <SummaryCard icon={UserGroupIcon} label="Students" value={summary.studentCount || 0} detail="Current class members" />
          <SummaryCard icon={ChartBarSquareIcon} label="Outcomes" value={summary.outcomeCount || 0} detail="In this mastery view" />
          <SummaryCard icon={ClipboardDocumentCheckIcon} label="Evidence" value={summary.evidenceCount || 0} detail="Current records" />
          <SummaryCard icon={ArrowPathIcon} label="Need attention" value={summary.studentsNeedingIntervention || 0} detail={`Below ${Math.round(Number(threshold) * 100)}% or overdue`} />
        </section>

        <section className="mb-12" aria-labelledby="heatmap-heading">
          <div className="mb-5">
            <span className="section-kicker">Outcome heatmap</span>
            <h2 id="heatmap-heading" className="text-3xl font-display font-extrabold text-text-primary">See the whole class clearly</h2>
            <p className="mt-2 text-sm font-medium text-text-muted">Select a student name to inspect their outcome profile.</p>
          </div>
          <MasteryHeatmap heatmap={analytics?.heatmap} onSelectStudent={setSelectedStudentId} />
        </section>

        {selectedProfile && (
          <div className="mb-12">
            <StudentProfilePanel profile={selectedProfile} classroomId={classId} onClose={closeStudentProfile} />
          </div>
        )}

        <div className="mb-12 grid gap-6 xl:grid-cols-3">
          <InterventionQueue items={analytics?.studentsNeedingIntervention || []} onSelectStudent={setSelectedStudentId} />
          <MisconceptionList items={analytics?.commonMisconceptions || []} outcomeById={outcomeById} />
          <RemediationGroups groups={analytics?.recommendedGroups || []} onCreateAssignment={createFromGroup} />
        </div>

        <section id="adaptive-assignment" className="scroll-mt-28" aria-label="Adaptive assignment creator">
          {assignmentNotice && <div role="status" aria-live="polite" className="mb-5 rounded-2xl bg-[color:var(--block-blue)] px-5 py-4 text-sm font-bold text-text-primary">{assignmentNotice}</div>}
          <AdaptiveAssignmentForm
            classroomId={classId}
            outcomes={outcomes}
            students={students}
            initialDraft={assignmentDraft}
            onCreated={() => {
              setAssignmentNotice('Assignment created. It is now available in each selected student’s Teacher assigned practice.');
              load();
            }}
          />
        </section>
      </div>
    </main>
  );
}
