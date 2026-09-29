import { LanguageIcon } from '@heroicons/react/24/outline';

export default function MoneyReadingHelp() {
  return <details className="mt-5 rounded-2xl border border-line-soft bg-surface-raised px-5 py-4">
    <summary className="min-h-6 cursor-pointer text-sm font-semibold text-text-primary"><LanguageIcon className="mr-2 inline h-5 w-5 text-accent" aria-hidden="true" />Prefer another language or need help reading?</summary>
    <div className="mt-4 grid gap-5 border-t border-line-soft pt-4 text-sm leading-7 text-text-muted sm:grid-cols-2">
      <div><h2 className="font-bold text-text-primary">Read in your language</h2><p>These lessons are written in English. If your browser offers Translate, open its menu and choose your preferred language.</p><p className="mt-2 text-xs leading-6">Automatic translations have not been reviewed and can change the meaning of money terms. Check the original source if something is unclear.</p></div>
      <div><h2 className="font-bold text-text-primary">Take your time</h2><p>Each lesson has a “Money words” link to its glossary — a list of words and their meanings. Use “Larger text” to make the lesson easier to read. You can repeat a lesson as often as you like.</p></div>
    </div>
  </details>;
}
