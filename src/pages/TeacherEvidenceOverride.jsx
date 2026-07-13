import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import EvidenceOverrideForm from '../components/teacher/EvidenceOverrideForm';

export default function TeacherEvidenceOverride() {
  const { classId, studentId, evidenceId } = useParams();
  const location = useLocation();
  const evidence = location.state?.evidence || null;
  const student = location.state?.student || null;

  return (
    <main className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
      <div className="container-custom max-w-4xl">
        <Link to={`/classes/${classId}/learning`} className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-strong">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Back to class learning
        </Link>
        <header className="mb-9">
          <span className="font-hand text-xl text-accent -rotate-2 inline-block">teacher judgement stays in control</span>
          <h1 className="mt-2 text-5xl font-display font-extrabold tracking-tight text-text-primary md:text-6xl">Review evidence.</h1>
          <p className="mt-4 text-lg font-medium text-text-muted">
            {student?.name ? `${student.name} · ` : ''}Evidence {evidenceId}
          </p>
        </header>
        {!evidence && (
          <div className="mb-6 rounded-2xl bg-[color:var(--block-amber)] px-5 py-4 text-sm font-medium text-text-primary">
            The original response was not passed with this navigation. You can still correct its mark; leaving available marks blank preserves the original maximum.
          </div>
        )}
        <EvidenceOverrideForm
          classroomId={classId}
          studentId={studentId}
          evidenceId={evidenceId}
          evidence={evidence}
        />
      </div>
    </main>
  );
}

