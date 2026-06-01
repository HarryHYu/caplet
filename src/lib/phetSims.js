/**
 * Curated PhET Interactive Simulations catalogue.
 * All entries are HTML5 (iframe-embeddable, no Java/Flash required).
 *
 * Embed URL pattern:
 *   https://phet.colorado.edu/sims/html/{slug}/latest/{slug}_en.html
 */

export function getPhetEmbedUrl(slug) {
  return `https://phet.colorado.edu/sims/html/${slug}/latest/${slug}_en.html`;
}

export const PHET_SUBJECTS = [
  {
    label: 'Physics',
    sims: [
      { slug: 'forces-and-motion-basics',        name: 'Forces and Motion: Basics',       desc: 'Push objects, apply forces, explore friction' },
      { slug: 'projectile-motion',               name: 'Projectile Motion',               desc: 'Launch projectiles, explore range and trajectory' },
      { slug: 'energy-skate-park',               name: 'Energy Skate Park',               desc: 'Kinetic, potential and thermal energy on a skate ramp' },
      { slug: 'energy-skate-park-basics',        name: 'Energy Skate Park: Basics',       desc: 'Simplified energy conservation on a skate ramp' },
      { slug: 'pendulum-lab',                    name: 'Pendulum Lab',                    desc: 'Period, length, mass and gravity of a pendulum' },
      { slug: 'masses-and-springs',              name: 'Masses and Springs',              desc: 'Hooke\'s law and simple harmonic motion' },
      { slug: 'balancing-act',                   name: 'Balancing Act',                   desc: 'Torque and balance with a lever' },
      { slug: 'collision-lab',                   name: 'Collision Lab',                   desc: 'Elastic and inelastic collisions, momentum' },
      { slug: 'gravity-and-orbits',              name: 'Gravity and Orbits',              desc: 'Gravitational force, planetary orbits' },
      { slug: 'my-solar-system',                 name: 'My Solar System',                 desc: 'Build solar systems, explore orbital mechanics' },
      { slug: 'keplers-laws',                    name: 'Kepler\'s Laws',                  desc: 'Elliptical orbits and Kepler\'s three laws' },
      { slug: 'gravity-force-lab',               name: 'Gravity Force Lab',               desc: 'Newton\'s law of gravitation between two masses' },
      { slug: 'gravity-force-lab-basics',        name: 'Gravity Force Lab: Basics',       desc: 'Simplified gravitational force exploration' },
      { slug: 'wave-on-a-string',                name: 'Wave on a String',                desc: 'Transverse waves, frequency, amplitude, standing waves' },
      { slug: 'wave-interference',               name: 'Wave Interference',               desc: 'Interference, diffraction, double-slit patterns' },
      { slug: 'sound',                           name: 'Sound',                           desc: 'Sound waves, amplitude, frequency, speakers' },
      { slug: 'bending-light',                   name: 'Bending Light',                   desc: 'Refraction, Snell\'s law, total internal reflection' },
      { slug: 'geometric-optics',                name: 'Geometric Optics',                desc: 'Lenses, mirrors, focal length, ray diagrams' },
      { slug: 'circuit-construction-kit-dc',     name: 'Circuit Construction Kit: DC',    desc: 'Build DC circuits with batteries, bulbs, resistors' },
      { slug: 'circuit-construction-kit-ac',     name: 'Circuit Construction Kit: AC',    desc: 'Build AC circuits with capacitors and inductors' },
      { slug: 'charges-and-fields',              name: 'Charges and Fields',              desc: 'Electric field lines and equipotential surfaces' },
      { slug: 'coulombs-law',                    name: 'Coulomb\'s Law',                  desc: 'Electric force between point charges' },
      { slug: 'faradays-law',                    name: 'Faraday\'s Law',                  desc: 'Electromagnetic induction with a magnet and coil' },
      { slug: 'magnets-and-electromagnets',      name: 'Magnets and Electromagnets',      desc: 'Magnetic field lines, compass, electromagnet' },
      { slug: 'photoelectric-effect',            name: 'Photoelectric Effect',            desc: 'Light frequency, electron emission, work function' },
      { slug: 'rutherford-scattering',           name: 'Rutherford Scattering',           desc: 'Alpha particle scattering, nuclear model of atom' },
      { slug: 'models-of-the-hydrogen-atom',     name: 'Models of the Hydrogen Atom',     desc: 'Bohr model, quantum model, spectral lines' },
      { slug: 'nuclear-fission',                 name: 'Nuclear Fission',                 desc: 'Chain reactions, critical mass, reactor simulation' },
      { slug: 'radioactive-dating-game',         name: 'Radioactive Dating Game',         desc: 'Half-life, carbon dating, rock dating' },
      { slug: 'under-pressure',                  name: 'Under Pressure',                  desc: 'Fluid pressure, Pascal\'s principle' },
      { slug: 'fluid-pressure-and-flow',         name: 'Fluid Pressure and Flow',         desc: 'Bernoulli\'s principle, fluid dynamics' },
    ],
  },
  {
    label: 'Chemistry',
    sims: [
      { slug: 'build-an-atom',                   name: 'Build an Atom',                   desc: 'Protons, neutrons, electrons; mass number, charge' },
      { slug: 'atomic-interactions',             name: 'Atomic Interactions',             desc: 'Lennard-Jones potential, intermolecular forces' },
      { slug: 'isotopes-and-atomic-mass',        name: 'Isotopes and Atomic Mass',        desc: 'Isotope composition and average atomic mass' },
      { slug: 'molecular-shapes',                name: 'Molecular Shapes',                desc: 'VSEPR theory, 3D molecular geometry' },
      { slug: 'molecule-polarity',               name: 'Molecule Polarity',               desc: 'Electronegativity, bond polarity, dipole moment' },
      { slug: 'molecule-shapes',                 name: 'Molecule Shapes',                 desc: 'Build molecules and explore 3D geometry' },
      { slug: 'states-of-matter',                name: 'States of Matter',                desc: 'Solid, liquid, gas phase transitions at particle level' },
      { slug: 'states-of-matter-basics',         name: 'States of Matter: Basics',        desc: 'Simplified particle model, heating/cooling curves' },
      { slug: 'ph-scale',                        name: 'pH Scale',                        desc: 'Acids, bases, pH, concentration of H⁺/OH⁻' },
      { slug: 'acid-base-solutions',             name: 'Acid-Base Solutions',             desc: 'Weak/strong acids and bases, conductivity' },
      { slug: 'balancing-chemical-equations',    name: 'Balancing Chemical Equations',    desc: 'Balance equations by adjusting coefficients' },
      { slug: 'reactions-and-rates',             name: 'Reactions and Rates',             desc: 'Collision theory, activation energy, rate of reaction' },
      { slug: 'concentration',                   name: 'Concentration',                   desc: 'Molarity, dilution, Beer-Lambert law' },
      { slug: 'molarity',                        name: 'Molarity',                        desc: 'Dissolving solutes, concentration units' },
      { slug: 'beers-law-lab',                   name: 'Beer\'s Law Lab',                 desc: 'Absorbance, concentration, wavelength of light' },
      { slug: 'gas-properties',                  name: 'Gas Properties',                  desc: 'Ideal gas law, pressure, volume, temperature' },
      { slug: 'diffusion',                       name: 'Diffusion',                       desc: 'Particle diffusion, membrane transport' },
    ],
  },
  {
    label: 'Biology',
    sims: [
      { slug: 'natural-selection',               name: 'Natural Selection',               desc: 'Mutation, selection, population genetics over generations' },
      { slug: 'gene-expression-essentials',      name: 'Gene Expression Essentials',      desc: 'Transcription, translation, protein synthesis' },
      { slug: 'population-genetics',             name: 'Population Genetics',             desc: 'Allele frequencies, genetic drift, Hardy-Weinberg' },
    ],
  },
  {
    label: 'Earth Science',
    sims: [
      { slug: 'plate-tectonics',                 name: 'Plate Tectonics',                 desc: 'Continental drift, divergent/convergent/transform boundaries' },
      { slug: 'greenhouse-effect',               name: 'Greenhouse Effect',               desc: 'Infrared absorption, CO₂ levels, global temperature' },
    ],
  },
  {
    label: 'Math',
    sims: [
      { slug: 'graphing-lines',                  name: 'Graphing Lines',                  desc: 'Slope-intercept, standard form, point-slope form' },
      { slug: 'graphing-slope-intercept',        name: 'Graphing Slope-Intercept',        desc: 'y = mx + b, slope and y-intercept' },
      { slug: 'graphing-quadratics',             name: 'Graphing Quadratics',             desc: 'Vertex, axis of symmetry, roots of parabolas' },
      { slug: 'function-builder',                name: 'Function Builder',                desc: 'Input/output, composite functions, function machines' },
      { slug: 'area-model-algebra',              name: 'Area Model Algebra',              desc: 'Factoring and expanding quadratics with area model' },
      { slug: 'area-model-introduction',         name: 'Area Model Introduction',         desc: 'Multiplication with area model (integers & decimals)' },
      { slug: 'fractions-intro',                 name: 'Fractions: Intro',                desc: 'Part of a whole, equivalent fractions, mixed numbers' },
      { slug: 'fractions-equality',              name: 'Fractions: Equality',             desc: 'Comparing and equalising fractions' },
      { slug: 'fraction-matcher',                name: 'Fraction Matcher',                desc: 'Match equivalent fractions using visual representations' },
      { slug: 'number-line-integers',            name: 'Number Line: Integers',           desc: 'Positive and negative integers on the number line' },
      { slug: 'number-line-operations',          name: 'Number Line: Operations',         desc: 'Addition and subtraction on the number line' },
      { slug: 'plinko-probability',              name: 'Plinko Probability',              desc: 'Probability distributions, sample space, histograms' },
      { slug: 'mean-share-and-balance',          name: 'Mean: Share and Balance',         desc: 'Arithmetic mean, levelling, data distribution' },
      { slug: 'center-and-variability',          name: 'Center and Variability',          desc: 'Mean, median, mode, spread of data sets' },
      { slug: 'equality-explorer',               name: 'Equality Explorer',               desc: 'Balance scales, solving linear equations' },
      { slug: 'proportion-playground',           name: 'Proportion Playground',           desc: 'Ratios, proportions, scaling' },
    ],
  },
];
