const DEFAULT_META = {
  title: 'Caplet — Build, learn, and ship anything.',
  description: 'A free open platform for structured courses, interactive tools, and collaborative workspaces.',
  canonicalPath: '/',
  noIndex: false,
};

const PUBLIC_META = [
  { match: /^\/$/, title: DEFAULT_META.title, description: DEFAULT_META.description },
  { match: /^\/library(?:\/|$)/, title: 'Learning Library — Caplet', description: 'Explore structured study resources, exam practice, and subject libraries on Caplet.' },
  { match: /^\/courses(?:\/|$)/, title: 'Curriculum — Caplet', description: 'Explore structured, interactive courses on Caplet.' },
  { match: /^\/fintools\/tax-calculator$/, title: 'Australian Income Tax Calculator — Caplet', description: 'Estimate Australian resident income tax and a simplified Medicare levy for supported financial years.' },
  { match: /^\/fintools(?:\/|$)/, title: 'Financial Calculators — Caplet', description: 'Free educational calculators for Australian tax, budgeting, loans, super, savings, and investing.' },
  { match: /^\/money\/economy\/inflation$/, title: 'Inflation and Everyday Prices — Caplet', description: 'Understand a dated, provenance-labelled Australian CPI observation and try a clearly labelled hypothetical inflation scenario.' },
  { match: /^\/money\/tools(?:\/|$)/, title: 'Money Tools — Caplet', description: 'Explore educational Australian calculators for pay, saving, borrowing, tax and everyday money questions.' },
  { match: /^\/money\/my-money$/, title: 'My Money — Caplet', description: 'A private place to try and save personal money scenarios on Caplet.' },
  { match: /^\/money(?:\/|$)/, title: 'Money — Caplet', description: 'Understand Australian money and economic data, learn useful ideas and try educational scenarios.' },
  { match: /^\/edutools(?:\/|$)/, title: 'Education Tools — Caplet', description: 'Practical study, writing, revision, and classroom tools from Caplet.' },
  { match: /^\/demo$/, title: 'School Product Demo — Caplet', description: 'Explore how Caplet connects curriculum, classroom delivery, student learning, and evidence-led teaching.' },
  { match: /^\/pitch$/, title: 'CapletMark — Caplet', description: 'CapletMark product vision, marking workflow, opportunity, and roadmap.' },
  { match: /^\/contact$/, title: 'Contact — Caplet', description: 'Contact the Caplet team.' },
  { match: /^\/trust$/, title: 'Trust Center — Caplet', description: 'How Caplet handles educational guidance, financial tools, privacy, and responsible AI.' },
  { match: /^\/terms$/, title: 'Terms — Caplet', description: 'Terms for using Caplet.' },
  { match: /^\/login$/, title: 'Sign in — Caplet', description: 'Sign in to your Caplet account.' },
  { match: /^\/register$/, title: 'Create an account — Caplet', description: 'Create a free Caplet account.' },
  { match: /^\/play$/, title: 'Join Caplet Live', description: 'Join an interactive Caplet Live session.' },
];

const PRIVATE_PATHS = [
  /^\/login$/,
  /^\/register$/,
  /^\/dashboard(?:\/|$)/,
  /^\/money\/my-money$/,
  /^\/study-plan(?:\/|$)/,
  /^\/practice(?:\/|$)/,
  /^\/mastery(?:\/|$)/,
  /^\/revision(?:\/|$)/,
  /^\/essays(?:\/|$)/,
  /^\/classes(?:\/|$)/,
  /^\/settings(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/metrics(?:\/|$)/,
  /^\/operations(?:\/|$)/,
  /^\/survey-results(?:\/|$)/,
  /^\/editor(?:\/|$)/,
  /^\/guardian-consent(?:\/|$)/,
  /^\/live\/host(?:\/|$)/,
];

export function getRouteMeta(pathname) {
  const publicMeta = PUBLIC_META.find((entry) => entry.match.test(pathname));
  const noIndex = PRIVATE_PATHS.some((pattern) => pattern.test(pathname));

  return {
    ...DEFAULT_META,
    ...(publicMeta || {}),
    canonicalPath: publicMeta ? pathname : DEFAULT_META.canonicalPath,
    noIndex,
  };
}

export default PUBLIC_META;
