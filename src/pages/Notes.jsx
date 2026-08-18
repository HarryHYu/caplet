import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  LinkIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { InlineEmpty, LearningEmpty } from '../components/learning/LearningStates';
import useDialogFocus from '../lib/useDialogFocus';
import { useMySubjects } from '../lib/useMySubjects';
import { isGoogleDocUrl, isResourceUrl, useSubjectNotes } from '../lib/useSubjectNotes';

function NoteDialog({ note, subjects, initialSubject, onCancel, onSave }) {
  const [form, setForm] = useState(note || { subject: initialSubject, title: '', content: '' });
  const dialogRef = useDialogFocus({ onDismiss: onCancel });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="note-dialog-title" className="max-h-[92vh] w-full max-w-2xl animate-pop overflow-y-auto rounded-xl border border-line-soft bg-surface-body p-6 shadow-pop">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="note-dialog-title" className="font-display text-2xl font-extrabold">{note ? 'Edit note' : 'New note'}</h2><p className="mt-1 text-sm text-text-muted">Keep the useful part close to your subject.</p></div>
          <button type="button" onClick={onCancel} aria-label="Close note editor" className="press focus-ring grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, title: form.title.trim(), content: form.content.trim() }); }} className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-bold">Subject<select data-initial-focus required value={form.subject} onChange={update('subject')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent">{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Title<input required value={form.title} onChange={update('title')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" placeholder="e.g. Fiscal policy summary" /></label>
          <label className="grid gap-2 text-sm font-bold">Note<textarea required rows="12" value={form.content} onChange={update('content')} className="rounded-lg border border-line-soft bg-surface-raised px-3 py-3 font-medium leading-relaxed outline-none focus:border-accent" placeholder="Write your note…" /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save note</button></div>
        </form>
      </section>
    </div>
  );
}

function LinkDialog({ link, subjects, initialSubject, onCancel, onSave }) {
  const [form, setForm] = useState(link || { subject: initialSubject, title: '', url: '' });
  const [error, setError] = useState('');
  const dialogRef = useDialogFocus({ onDismiss: onCancel });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    if (!isGoogleDocUrl(form.url.trim())) return setError('Paste a valid Google Docs document link.');
    onSave({ ...form, title: form.title.trim(), url: form.url.trim() });
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="link-dialog-title" className="w-full max-w-xl animate-pop rounded-xl border border-line-soft bg-surface-body p-6 shadow-pop">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="link-dialog-title" className="font-display text-2xl font-extrabold">{link ? 'Edit Google Doc' : 'Add Google Doc'}</h2><p className="mt-1 text-sm text-text-muted">The document opens in Google Docs with its existing sharing permissions.</p></div>
          <button type="button" onClick={onCancel} aria-label="Close Google Doc editor" className="press focus-ring grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-bold">Subject<select required value={form.subject} onChange={update('subject')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent">{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Name<input data-initial-focus required value={form.title} onChange={update('title')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" placeholder="e.g. Economics class notes" /></label>
          <label className="grid gap-2 text-sm font-bold">Google Docs link<input required type="url" value={form.url} onChange={(event) => { update('url')(event); setError(''); }} aria-describedby={error ? 'google-doc-error' : undefined} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" placeholder="https://docs.google.com/document/d/…" /></label>
          {error && <p id="google-doc-error" role="alert" className="text-sm font-bold text-text-error">{error}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save link</button></div>
        </form>
      </section>
    </div>
  );
}

function ResourceDialog({ resource, subjects, initialSubject, onCancel, onSave }) {
  const [form, setForm] = useState(resource || { subject: initialSubject, title: '', url: '', description: '' });
  const [error, setError] = useState('');
  const dialogRef = useDialogFocus({ onDismiss: onCancel });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    if (!isResourceUrl(form.url.trim())) return setError('Paste a valid website link beginning with http:// or https://.');
    onSave({ ...form, title: form.title.trim(), url: form.url.trim(), description: form.description.trim() });
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="resource-dialog-title" className="w-full max-w-xl animate-pop rounded-xl border border-line-soft bg-surface-body p-6 shadow-pop">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="resource-dialog-title" className="font-display text-2xl font-extrabold">{resource ? 'Edit resource' : 'Add link or resource'}</h2><p className="mt-1 text-sm text-text-muted">Save a useful website, video, worksheet or reference.</p></div>
          <button type="button" onClick={onCancel} aria-label="Close resource editor" className="press focus-ring grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-bold">Subject<select required value={form.subject} onChange={update('subject')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent">{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Name<input data-initial-focus required value={form.title} onChange={update('title')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" placeholder="e.g. Chemistry formula sheet" /></label>
          <label className="grid gap-2 text-sm font-bold">Link<input required type="url" value={form.url} onChange={(event) => { update('url')(event); setError(''); }} aria-describedby={error ? 'resource-link-error' : undefined} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" placeholder="https://…" /></label>
          <label className="grid gap-2 text-sm font-bold">Description <span className="font-medium text-text-muted">(optional)</span><input value={form.description} onChange={update('description')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" placeholder="What this is useful for" /></label>
          {error && <p id="resource-link-error" role="alert" className="text-sm font-bold text-text-error">{error}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save resource</button></div>
        </form>
      </section>
    </div>
  );
}

function RemoveDialog({ title, onCancel, onConfirm }) {
  const dialogRef = useDialogFocus({ onDismiss: onCancel });
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4" role="presentation">
      <section ref={dialogRef} tabIndex="-1" role="alertdialog" aria-modal="true" aria-labelledby="notes-remove-title" className="w-full max-w-md animate-pop rounded-3xl bg-surface-raised p-7 shadow-pop">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-error text-text-error"><TrashIcon className="h-6 w-6" aria-hidden="true" /></span>
        <h2 id="notes-remove-title" className="mt-5 text-2xl font-display font-extrabold text-text-primary">Remove “{title}”?</h2>
        <p className="mt-2 text-sm font-medium text-text-muted">It will be removed from this device. This cannot be undone.</p>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" data-initial-focus onClick={onCancel} className="btn-secondary press">Keep it</button>
          <button type="button" onClick={onConfirm} className="press focus-ring inline-flex items-center justify-center rounded-2xl bg-text-error px-6 py-3 text-sm font-bold text-text-contrast">Remove</button>
        </div>
      </section>
    </div>
  );
}

export default function Notes() {
  const { mySubjects } = useMySubjects();
  const { notes, links, resources, saveNote, saveLink, saveResource, removeNote, removeLink, removeResource } = useSubjectNotes();
  const [searchParams, setSearchParams] = useSearchParams();
  // Derive the subject filter straight from the URL so back/forward stays in sync.
  const requestedSubject = searchParams.get('subject');
  const subject = mySubjects.includes(requestedSubject) ? requestedSubject : mySubjects[0] || '';
  const [editingNote, setEditingNote] = useState(undefined);
  const [editingLink, setEditingLink] = useState(undefined);
  const [editingResource, setEditingResource] = useState(undefined);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const visibleNotes = useMemo(() => notes.filter((note) => !subject || note.subject === subject), [notes, subject]);
  const visibleLinks = useMemo(() => links.filter((link) => !subject || link.subject === subject), [links, subject]);
  const visibleResources = useMemo(() => resources.filter((resource) => !subject || resource.subject === subject), [resources, subject]);
  const chooseSubject = (value) => { setSearchParams(value ? { subject: value } : {}); };
  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    const { kind, item } = pendingRemoval;
    if (kind === 'note') removeNote(item.id);
    else if (kind === 'link') removeLink(item.id);
    else removeResource(item.id);
    setPendingRemoval(null);
  };

  if (mySubjects.length === 0) return (
    <div className="min-h-screen bg-surface-body pb-24 pt-24 text-text-primary md:pt-28">
      <div className="container-custom max-w-5xl">
        <header className="minimal-page-header">
          <h1 className="minimal-page-title">Notes</h1>
          <p className="minimal-page-description">Your own notes and Google Docs, organised by subject.</p>
        </header>
        <div className="animate-rise grid min-h-[42vh] content-center">
          <LearningEmpty
            icon={DocumentTextIcon}
            title="Choose your subjects first"
            message="Your notes and Google Docs will be organised around the same subjects used on Today."
            action={<Link to="/library" className="btn-primary">Choose subjects</Link>}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-body pb-24 pt-24 text-text-primary md:pt-28">
      <div className="container-custom max-w-5xl">
        <header className="minimal-page-header flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="minimal-page-title">Notes</h1><p className="minimal-page-description">Your own notes and Google Docs, organised by subject.</p></div>
          <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setEditingLink(null)} className="btn-secondary"><LinkIcon className="h-4 w-4" /> Add Google Doc</button><button type="button" onClick={() => setEditingNote(null)} className="btn-primary"><PlusIcon className="h-4 w-4" /> New note</button></div>
        </header>

        <nav aria-label="Note subjects" className="nav-scrollbar-hidden mt-8 flex gap-2 overflow-x-auto scroll-smooth border-b border-line-soft pb-4">{mySubjects.map((item) => <button key={item} type="button" onClick={() => chooseSubject(item)} aria-pressed={subject === item} className={`press focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-bold ${subject === item ? 'bg-accent text-accent-contrast' : 'border border-line-soft text-text-muted hover:text-text-primary'}`}>{item}</button>)}</nav>

        <section className="surface-card mt-8 animate-rise" aria-labelledby="google-docs-heading">
          <h2 id="google-docs-heading" className="card-section-title mb-0">Google Docs</h2>
          {visibleLinks.length ? <div className="mt-2 divide-y divide-line-soft">{visibleLinks.map((item) => <article key={item.id} className="flex items-center gap-4 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><LinkIcon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate font-bold">{item.title}</h3><p className="mt-1 text-xs text-text-muted">{item.subject}</p></div><a href={item.url} target="_blank" rel="noreferrer" className="btn-secondary min-h-10 px-3">Open <ArrowTopRightOnSquareIcon className="h-4 w-4" /></a><button type="button" onClick={() => setEditingLink(item)} aria-label={`Edit ${item.title}`} className="press focus-ring grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft"><PencilSquareIcon className="h-4 w-4" /></button><button type="button" onClick={() => setPendingRemoval({ kind: 'link', item })} aria-label={`Remove ${item.title}`} className="press focus-ring grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft hover:text-text-error"><TrashIcon className="h-4 w-4" /></button></article>)}</div> : <InlineEmpty className="mt-4" icon={LinkIcon} title={`No Google Docs saved for ${subject}.`} message="Link a doc and it stays one tap away from this subject." action={<button type="button" onClick={() => setEditingLink(null)} className="btn-secondary"><LinkIcon className="h-4 w-4" /> Add your first Google Doc</button>} />}
        </section>

        <section className="surface-card mt-6 animate-rise" aria-labelledby="resources-heading">
          <div className="flex items-center justify-between gap-4">
            <h2 id="resources-heading" className="card-section-title mb-0">Links and Resources</h2>
            <button type="button" onClick={() => setEditingResource(null)} className="btn-secondary min-h-10 px-3"><PlusIcon className="h-4 w-4" /> Add link</button>
          </div>
          {visibleResources.length ? <div className="mt-2 divide-y divide-line-soft">{visibleResources.map((item) => <article key={item.id} className="flex items-center gap-4 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><ArrowTopRightOnSquareIcon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate font-bold">{item.title}</h3><p className="mt-1 truncate text-xs text-text-muted">{item.description || item.subject}</p></div><a href={item.url} target="_blank" rel="noreferrer" className="btn-secondary min-h-10 px-3">Open <ArrowTopRightOnSquareIcon className="h-4 w-4" /></a><button type="button" onClick={() => setEditingResource(item)} aria-label={`Edit ${item.title}`} className="press focus-ring grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft"><PencilSquareIcon className="h-4 w-4" /></button><button type="button" onClick={() => setPendingRemoval({ kind: 'resource', item })} aria-label={`Remove ${item.title}`} className="press focus-ring grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft hover:text-text-error"><TrashIcon className="h-4 w-4" /></button></article>)}</div> : <InlineEmpty className="mt-4" icon={ArrowTopRightOnSquareIcon} title={`No links or resources saved for ${subject}.`} message="Keep the pages you keep coming back to in one place." action={<button type="button" onClick={() => setEditingResource(null)} className="btn-secondary"><PlusIcon className="h-4 w-4" /> Add your first link</button>} />}
        </section>

        <section className="mt-8 animate-rise" aria-labelledby="caplet-notes-heading">
          <h2 id="caplet-notes-heading" className="font-display text-2xl font-extrabold tracking-tight">Caplet notes</h2>
          {visibleNotes.length ? <div className="mt-4 grid gap-4 md:grid-cols-2">{visibleNotes.map((item) => <article key={item.id} className="surface-card card-lift"><div className="flex items-start justify-between gap-4"><DocumentTextIcon className="h-5 w-5 text-accent" /><div className="flex gap-1"><button type="button" onClick={() => setEditingNote(item)} aria-label={`Edit ${item.title}`} className="press focus-ring grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-surface-soft"><PencilSquareIcon className="h-4 w-4" /></button><button type="button" onClick={() => setPendingRemoval({ kind: 'note', item })} aria-label={`Remove ${item.title}`} className="press focus-ring grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-surface-soft hover:text-text-error"><TrashIcon className="h-4 w-4" /></button></div></div><h3 className="mt-5 text-lg font-extrabold">{item.title}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{item.content}</p></article>)}</div> : <InlineEmpty className="mt-4" icon={DocumentTextIcon} title={`No Caplet notes for ${subject} yet.`} message="Write notes here and they stay attached to this subject." action={<button type="button" onClick={() => setEditingNote(null)} className="btn-secondary"><PlusIcon className="h-4 w-4" /> Write your first note</button>} />}
        </section>
      </div>
      {editingNote !== undefined && <NoteDialog note={editingNote} subjects={mySubjects} initialSubject={subject} onCancel={() => setEditingNote(undefined)} onSave={(value) => { saveNote(value); setEditingNote(undefined); }} />}
      {editingLink !== undefined && <LinkDialog link={editingLink} subjects={mySubjects} initialSubject={subject} onCancel={() => setEditingLink(undefined)} onSave={(value) => { saveLink(value); setEditingLink(undefined); }} />}
      {pendingRemoval && <RemoveDialog title={pendingRemoval.item.title} onCancel={() => setPendingRemoval(null)} onConfirm={confirmRemoval} />}
      {editingResource !== undefined && <ResourceDialog resource={editingResource} subjects={mySubjects} initialSubject={subject} onCancel={() => setEditingResource(undefined)} onSave={(value) => { saveResource(value); setEditingResource(undefined); }} />}
    </div>
  );
}
