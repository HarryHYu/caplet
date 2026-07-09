const officialBase = 'https://curriculum.nsw.edu.au/learning-areas/hsie/economics-11-12-2025';
const legacySyllabusUrl = 'https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsie/economics-stage-6-2009';
const legacyAssessmentUrl =
  'https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsie/economics-stage-6-2009/assessment-and-reporting';
const hscExamPapersUrl = 'https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers/economics';
const hscStandardsUrl = 'https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-standards/economics';

export const economicsOutcomes = {
  'ECO-11-01': 'uses economic terms, concepts and principles in a range of contexts',
  'ECO-11-02': 'explains the economic role of individuals, businesses, institutions and government',
  'ECO-11-03': 'explains the role and operation of markets in the Australian and global economy',
  'ECO-11-04': 'explains the causes of economic issues and their consequences for individuals, businesses, government and the economy',
  'ECO-11-05': 'discusses the perspectives of individuals, businesses, institutions and government on a range of economic issues',
  'ECO-11-06': 'explains how policies are used to manage the economy',
  'ECO-11-07': 'discusses policy measures to address economic issues in actual or hypothetical contexts',
  'ECO-11-08': 'analyses data for patterns and relationships to support economic arguments and decision-making',
  'ECO-11-09': 'applies mathematical concepts, formulas and techniques in economic contexts',
  'ECO-11-10': 'communicates economic ideas and information in a range of forms appropriate to purpose and audience',
  'ECO-12-01': 'applies economic terms, concepts and principles in a range of contexts',
  'ECO-12-02': 'analyses the economic role of individuals, businesses, institutions and government',
  'ECO-12-03': 'explains the role and effects of markets in the Australian and global economy',
  'ECO-12-04': 'analyses the causes of economic issues and their consequences for individuals, businesses, government and the economy',
  'ECO-12-05': 'assesses the perspectives of individuals, businesses, institutions and government on a range of economic issues',
  'ECO-12-06': 'evaluates the effectiveness of economic policies used to manage issues in the Australian and global economy',
  'ECO-12-07': 'proposes and justifies policy measures to address economic issues in actual or hypothetical contexts',
  'ECO-12-08': 'analyses data for patterns and relationships to make predictions and support economic arguments and decision-making',
  'ECO-12-09': 'applies mathematical concepts, formulas and techniques in economic contexts',
  'ECO-12-10': 'communicates economic ideas, perspectives and information in a range of forms appropriate to purpose and audience',
};

const bandRubric20 = [
  '17-20: sustained judgement, precise economic terminology, explicit data/stimulus integration, clear cause-effect chains and policy evaluation',
  '13-16: sound analysis with relevant examples and mostly accurate terminology; evaluation is present but may be uneven',
  '9-12: descriptive explanation with some economic reasoning; limited integration of data, diagrams or policy constraints',
  '5-8: identifies relevant concepts but relies on general statements, unsupported claims or weak structure',
  '1-4: fragmented knowledge with minimal economic reasoning or application to the question',
];

const makeMultipleChoice = (id, stem, options, answer, explanation, outcomes, difficulty = 'Core') => ({
  id,
  type: 'multipleChoice',
  stem,
  options,
  answer,
  explanation,
  outcomes,
  difficulty,
});

const makeShortAnswer = (id, marks, question, stimulus, markingGuide, sampleAnswer, outcomes, difficulty = 'Exam practice') => ({
  id,
  type: 'shortAnswer',
  marks,
  question,
  stimulus,
  markingGuide,
  sampleAnswer,
  outcomes,
  difficulty,
});

const makeExtendedResponse = (id, prompt, planningFrame, exemplarThesis, outcomes, difficulty = 'HSC style') => ({
  id,
  type: 'extendedResponse',
  marks: 20,
  prompt,
  planningFrame,
  exemplarThesis,
  rubric: bandRubric20,
  outcomes,
  difficulty,
});

const makeTopicDrill = (area, group) => {
  const spec = topicDrillSpecs[group];
  if (!spec) {
    return null;
  }

  return {
    id: `${area.id}-${group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
    type: 'topicDrill',
    title: group,
    difficulty: spec.difficulty || 'Content group drill',
    marks: spec.marks || 5,
    keyIdea: spec.keyIdea,
    quickCheck: spec.quickCheck,
    practicePrompt: spec.practicePrompt,
    markingGuide: spec.markingGuide,
    sampleAnswer: spec.sampleAnswer,
    teacherMove: spec.teacherMove,
    outcomes: spec.outcomes || area.outcomes.slice(0, 3),
  };
};

const makeStimulusSet = (area, spec, index) => ({
  id: `${area.id}-stimulus-${index + 1}`,
  type: 'stimulusSet',
  title: spec.title,
  difficulty: spec.difficulty || 'Stimulus analysis',
  marks: spec.questions.reduce((sum, question) => sum + question.marks, 0),
  context: spec.context,
  sourceNote: spec.sourceNote || 'Original Caplet practice stimulus, designed for syllabus-aligned interpretation and analysis.',
  data: spec.data,
  questions: spec.questions,
  sampleResponse: spec.sampleResponse,
  teacherMove: spec.teacherMove,
  outcomes: spec.outcomes || area.outcomes.slice(0, 4),
});

const makeExamPracticePack = (spec) => ({
  ...spec,
  type: 'examPracticePack',
  sourceNote: spec.sourceNote || 'Original Caplet practice paper. Use the official NESA links for past papers and standards materials.',
});

const topicDrillSpecs = {
  'Economic thinking': {
    keyIdea: 'Economic thinking starts with scarcity, choice, incentives and trade-offs. Strong responses explain who makes the decision, what is scarce, and what is forgone.',
    quickCheck: {
      stem: 'Which question is most central to economic thinking?',
      options: ['How can every want be satisfied?', 'How should scarce resources be allocated?', 'How can prices be removed from markets?', 'How can opportunity cost be avoided?'],
      answer: 'B',
      explanation: 'Economics begins with scarcity, so allocation choices and opportunity cost are unavoidable.',
    },
    practicePrompt: 'Explain how incentives and opportunity cost influence one decision made by households, businesses or government.',
    markingGuide: ['Defines incentives and opportunity cost', 'Identifies a clear economic decision-maker', 'Explains the trade-off created by scarcity', 'Uses a relevant example'],
    sampleAnswer: 'A household deciding whether to work extra hours compares the extra income with the time forgone for leisure or study. The wage is an incentive to supply more labour, while the opportunity cost is the next best use of that time. Scarcity means the household cannot choose both options fully.',
    teacherMove: 'Ask students to identify the decision-maker before they start explaining the trade-off.',
    outcomes: ['ECO-11-01', 'ECO-11-02', 'ECO-11-10'],
  },
  'Operation of an economy': {
    keyIdea: 'An economy operates through interactions between households, firms, government, financial institutions and the international sector.',
    quickCheck: {
      stem: 'Which pair best represents a real flow and a money flow?',
      options: ['Labour and wages', 'Taxes and subsidies', 'Savings and imports', 'Inflation and unemployment'],
      answer: 'A',
      explanation: 'Labour is a real flow from households to firms, while wages are a money flow from firms to households.',
    },
    practicePrompt: 'Explain how one sector of the economy can influence another sector.',
    markingGuide: ['Identifies two sectors', 'Explains the direction of influence', 'Uses circular-flow language', 'Links the effect to income, spending, output or employment'],
    sampleAnswer: 'If businesses reduce investment, demand for labour may fall. This reduces household income and can lower consumption spending. The effect then flows back to firms through weaker sales, showing interdependence between the business and household sectors.',
    teacherMove: 'Require arrows or cause-effect verbs in student explanations.',
    outcomes: ['ECO-11-02', 'ECO-11-04', 'ECO-11-10'],
  },
  'Economic model: production possibilities': {
    keyIdea: 'The production possibilities model shows scarcity, efficiency, opportunity cost and growth using combinations of two outputs.',
    quickCheck: {
      stem: 'A point outside a production possibilities curve is:',
      options: ['efficient', 'inefficient', 'unattainable with current resources', 'always equitable'],
      answer: 'C',
      explanation: 'A point beyond the curve cannot be reached with current resources and technology.',
    },
    practicePrompt: 'Use the production possibilities model to explain the difference between efficiency and economic growth.',
    markingGuide: ['Describes efficient points on the curve', 'Describes inefficient points inside the curve', 'Explains outward shifts as growth', 'Uses opportunity cost accurately'],
    sampleAnswer: 'A point on the production possibilities curve is efficient because all available resources are being used to produce maximum output combinations. Economic growth is shown by an outward shift of the curve, caused by more resources or better technology, allowing more of both goods to be produced over time.',
    teacherMove: 'Have students label one efficient, one inefficient and one unattainable point before writing.',
    outcomes: ['ECO-11-01', 'ECO-11-08', 'ECO-11-09'],
  },
  'Economic model: circular flow of income': {
    keyIdea: 'The circular flow model explains how income, spending and output move between sectors, and how leakages and injections affect activity.',
    quickCheck: {
      stem: 'Which is an injection into the circular flow?',
      options: ['Saving', 'Taxation', 'Imports', 'Investment'],
      answer: 'D',
      explanation: 'Investment spending adds demand to the flow, while saving, taxation and imports are leakages.',
    },
    practicePrompt: 'Explain how an increase in investment can affect the circular flow of income.',
    markingGuide: ['Identifies investment as an injection', 'Links investment to firm demand or production', 'Explains income/employment effects', 'Recognises multiplier or flow-on effects'],
    sampleAnswer: 'Investment is an injection because it adds spending to the circular flow. Higher investment can increase demand for capital goods and labour, raising output and household income. Higher income may then increase consumption, creating further flow-on effects.',
    teacherMove: 'Ask students to classify each example as leakage, injection, money flow or real flow.',
    outcomes: ['ECO-11-02', 'ECO-11-04', 'ECO-11-10'],
  },
  'Economic model: business cycle': {
    keyIdea: 'The business cycle describes fluctuations in economic activity around the long-term growth trend.',
    quickCheck: {
      stem: 'Which indicator would usually rise during an expansion?',
      options: ['Cyclical unemployment', 'Business investment', 'Spare capacity', 'Bankruptcies'],
      answer: 'B',
      explanation: 'Expansions usually involve stronger demand, higher confidence and more investment.',
    },
    practicePrompt: 'Explain how a downturn in the business cycle can affect households and businesses.',
    markingGuide: ['Defines downturn or contraction', 'Explains lower demand or confidence', 'Links to household income/employment', 'Links to business revenue/investment'],
    sampleAnswer: 'During a downturn, aggregate demand and business confidence weaken. Firms may reduce output, investment and hiring, increasing unemployment or underemployment. Households then face lower income growth and may cut consumption, which can reinforce weaker business conditions.',
    teacherMove: 'Make students distinguish a cyclical downturn from long-term structural change.',
    outcomes: ['ECO-11-04', 'ECO-11-08', 'ECO-11-10'],
  },
  'Role of markets': {
    keyIdea: 'Markets coordinate buyers and sellers through prices, which signal scarcity, preferences and production incentives.',
    quickCheck: {
      stem: 'In a market, a higher price usually signals producers to:',
      options: ['reduce supply', 'increase quantity supplied', 'ignore consumer demand', 'stop production immediately'],
      answer: 'B',
      explanation: 'A higher price can increase expected profitability, encouraging a higher quantity supplied.',
    },
    practicePrompt: 'Explain how prices help allocate resources in a market economy.',
    markingGuide: ['Identifies prices as signals', 'Explains consumer and producer responses', 'Links responses to resource allocation', 'Uses an example'],
    sampleAnswer: 'Prices signal relative scarcity and value. If the price of solar panels rises because demand increases, producers have an incentive to allocate more resources to production. Consumers may reduce quantity demanded or seek substitutes. These responses help allocate resources to where they are most valued.',
    teacherMove: 'Require both buyer and seller responses in every market-allocation answer.',
    outcomes: ['ECO-11-03', 'ECO-11-08', 'ECO-11-10'],
  },
  Demand: {
    keyIdea: 'Demand shows the quantity consumers are willing and able to buy at different prices, holding other factors constant.',
    quickCheck: {
      stem: 'A rise in consumer income is most likely to shift demand for a normal good:',
      options: ['left', 'right', 'nowhere because price is unchanged', 'down along the curve'],
      answer: 'B',
      explanation: 'Higher income increases demand for normal goods, shifting the demand curve to the right.',
    },
    practicePrompt: 'Distinguish between a movement along a demand curve and a shift of the demand curve.',
    markingGuide: ['Links movement to price change', 'Links shift to non-price determinants', 'Uses correct diagram language', 'Provides an example'],
    sampleAnswer: 'A movement along the demand curve occurs when the good\'s own price changes, causing a change in quantity demanded. A shift occurs when a non-price factor changes, such as income, preferences or the price of substitutes. For example, higher petrol prices may cause movement along demand for petrol, while a rise in income shifts demand for normal goods.',
    teacherMove: 'Mark down answers that use demand and quantity demanded interchangeably.',
    outcomes: ['ECO-11-01', 'ECO-11-03', 'ECO-11-10'],
  },
  Supply: {
    keyIdea: 'Supply shows the quantity producers are willing and able to sell at different prices, influenced by costs, technology and expectations.',
    quickCheck: {
      stem: 'A fall in production costs will usually:',
      options: ['shift supply right', 'shift demand left', 'reduce equilibrium quantity', 'make supply perfectly inelastic'],
      answer: 'A',
      explanation: 'Lower costs make production more profitable at each price, increasing supply.',
    },
    practicePrompt: 'Explain how a change in input costs affects supply and market equilibrium.',
    markingGuide: ['Identifies input costs as a supply determinant', 'Explains direction of supply shift', 'Links shift to price and quantity outcomes', 'Uses clear market terminology'],
    sampleAnswer: 'If input costs rise, firms are less willing to supply the same quantity at each price, so supply shifts left. This creates excess demand at the original price. The new equilibrium usually has a higher price and lower quantity, assuming demand is unchanged.',
    teacherMove: 'Ask students to write the disequilibrium step before the new equilibrium result.',
    outcomes: ['ECO-11-03', 'ECO-11-08', 'ECO-11-10'],
  },
  'Market equilibrium': {
    keyIdea: 'Market equilibrium occurs where quantity demanded equals quantity supplied, so there is no tendency for price to change.',
    quickCheck: {
      stem: 'At a price above equilibrium, a market will usually experience:',
      options: ['shortage', 'surplus', 'perfect efficiency', 'no seller response'],
      answer: 'B',
      explanation: 'At a high price, quantity supplied exceeds quantity demanded, creating a surplus.',
    },
    practicePrompt: 'Explain how a surplus causes a market to move toward equilibrium.',
    markingGuide: ['Defines surplus', 'Explains seller incentives to lower price', 'Links lower price to demand and supply responses', 'States the new equilibrium condition'],
    sampleAnswer: 'A surplus occurs when quantity supplied exceeds quantity demanded at the current price. Sellers have unsold stock, so they may lower prices to attract buyers. As price falls, quantity demanded rises and quantity supplied falls until the surplus is removed and the market reaches equilibrium.',
    teacherMove: 'Require students to explain the adjustment mechanism, not just the final result.',
    outcomes: ['ECO-11-03', 'ECO-11-08', 'ECO-11-10'],
  },
  'Price elasticity of demand': {
    keyIdea: 'Price elasticity of demand measures how responsive quantity demanded is to a change in price.',
    quickCheck: {
      stem: 'If a 10% price rise causes quantity demanded to fall by 2%, demand is:',
      options: ['elastic', 'inelastic', 'unit elastic', 'perfectly elastic'],
      answer: 'B',
      explanation: 'The percentage change in quantity demanded is smaller than the percentage change in price, so demand is inelastic.',
    },
    practicePrompt: 'Explain why elasticity matters when a firm changes price.',
    markingGuide: ['Defines price elasticity of demand', 'Links elasticity to total revenue', 'Explains elastic and inelastic cases', 'Uses an example'],
    sampleAnswer: 'Elasticity matters because it affects total revenue. If demand is elastic, a price rise causes quantity demanded to fall proportionally more, reducing revenue. If demand is inelastic, quantity falls proportionally less, so revenue may rise. Firms therefore need to understand consumer responsiveness before changing price.',
    teacherMove: 'Have students calculate elasticity before explaining revenue effects.',
    outcomes: ['ECO-11-03', 'ECO-11-09', 'ECO-11-10'],
  },
  'Price elasticity of supply': {
    keyIdea: 'Price elasticity of supply measures how responsive quantity supplied is to a change in price.',
    quickCheck: {
      stem: 'Supply is likely to be more elastic when firms:',
      options: ['cannot store output', 'have spare capacity', 'face fixed production limits', 'need years to expand output'],
      answer: 'B',
      explanation: 'Spare capacity allows firms to increase output more quickly when price rises.',
    },
    practicePrompt: 'Explain two factors that influence price elasticity of supply.',
    markingGuide: ['Defines price elasticity of supply', 'Explains time period', 'Explains capacity, stocks or factor mobility', 'Uses relevant examples'],
    sampleAnswer: 'Supply is more elastic over longer periods because firms have time to expand production. It is also more elastic when firms have spare capacity or can easily access inputs. For example, a cafe may increase coffee output quickly if staff and machines are available, but housing supply is less elastic because construction takes time.',
    teacherMove: 'Push students to mention time period as a default elasticity factor.',
    outcomes: ['ECO-11-03', 'ECO-11-09', 'ECO-11-10'],
  },
  'Market structures and competition for sellers': {
    keyIdea: 'Market structure affects pricing power, efficiency, innovation and consumer choice.',
    quickCheck: {
      stem: 'A monopoly is best described as a market with:',
      options: ['many sellers and identical products', 'one dominant seller and high barriers to entry', 'no barriers to entry', 'only government buyers'],
      answer: 'B',
      explanation: 'A monopoly has a single or dominant seller and barriers that limit competition.',
    },
    practicePrompt: 'Compare the likely outcomes of perfect competition and monopoly for consumers.',
    markingGuide: ['Identifies key structural differences', 'Explains price and output effects', 'Discusses consumer choice or innovation', 'Makes a balanced comparison'],
    sampleAnswer: 'Perfect competition usually gives consumers lower prices and more efficient output because firms have little pricing power. Monopoly can lead to higher prices and lower output because the seller faces limited competition. However, monopolies may fund innovation if profits are reinvested, so the consumer outcome depends on regulation and market behaviour.',
    teacherMove: 'Have students compare price, output, choice and efficiency in a table before writing.',
    outcomes: ['ECO-11-03', 'ECO-11-05', 'ECO-11-10'],
  },
  'Nature and types of market failure': {
    keyIdea: 'Market failure occurs when free markets allocate resources inefficiently or inequitably from society\'s perspective.',
    quickCheck: {
      stem: 'Which example is a negative externality?',
      options: ['A firm paying wages', 'Pollution affecting nearby residents', 'A consumer buying bread', 'A bank paying interest'],
      answer: 'B',
      explanation: 'A negative externality is an external cost imposed on third parties.',
    },
    practicePrompt: 'Explain why externalities can lead to inefficient market outcomes.',
    markingGuide: ['Defines externality', 'Distinguishes private and social costs/benefits', 'Explains overproduction or underproduction', 'Uses an example'],
    sampleAnswer: 'Externalities create inefficiency because market prices do not reflect all social costs or benefits. In the case of pollution, producers and consumers may ignore costs imposed on third parties. The good is overproduced because the private cost is lower than the social cost.',
    teacherMove: 'Ask students to state whether the outcome is overproduction or underproduction.',
    outcomes: ['ECO-11-04', 'ECO-11-07', 'ECO-11-10'],
  },
  'Government intervention in market failures': {
    keyIdea: 'Governments can use taxes, subsidies, regulation or direct provision to address market failure, but each policy has trade-offs.',
    quickCheck: {
      stem: 'A subsidy for vaccinations is mainly designed to address:',
      options: ['negative externalities', 'positive externalities', 'monopoly profit only', 'currency depreciation'],
      answer: 'B',
      explanation: 'Vaccinations create external benefits, so a subsidy can increase consumption closer to the socially efficient level.',
    },
    practicePrompt: 'Assess one policy that could reduce a market failure.',
    markingGuide: ['Identifies the market failure', 'Explains how the policy changes incentives', 'Assesses benefits', 'Assesses limitations or unintended consequences'],
    sampleAnswer: 'A carbon tax can reduce pollution by raising the private cost of emissions. This encourages firms and consumers to switch toward cleaner production and consumption. It improves efficiency by internalising external costs, but it may raise prices and affect low-income households unless compensation is provided.',
    teacherMove: 'Require one benefit and one limitation for every intervention answer.',
    outcomes: ['ECO-11-04', 'ECO-11-07', 'ECO-11-10'],
  },
  'Households: the consumption of goods and services': {
    keyIdea: 'Household consumption depends on income, wealth, confidence, interest rates, prices and expectations.',
    quickCheck: {
      stem: 'A rise in consumer confidence is most likely to increase:',
      options: ['consumption spending', 'company tax revenue only', 'the cash rate automatically', 'imports only'],
      answer: 'A',
      explanation: 'Confidence affects willingness to spend, especially on discretionary goods and services.',
    },
    practicePrompt: 'Analyse two factors that influence household consumption.',
    markingGuide: ['Identifies two relevant factors', 'Explains each factor\'s effect on spending', 'Links to household decision-making', 'Uses economic terminology'],
    sampleAnswer: 'Income is a key influence because higher disposable income increases households\' ability to buy goods and services. Confidence also matters because households are more willing to make major purchases when they expect stable income and employment. Higher interest rates may reduce consumption by increasing loan repayments and encouraging saving.',
    teacherMove: 'Ask students to separate ability to spend from willingness to spend.',
    outcomes: ['ECO-11-02', 'ECO-11-04', 'ECO-11-10'],
  },
  'Households: the provision of labour': {
    keyIdea: 'Households supply labour in response to wages, skills, preferences, working conditions and opportunity cost.',
    quickCheck: {
      stem: 'An increase in the wage rate can encourage households to supply more labour because:',
      options: ['the opportunity cost of leisure rises', 'all taxes disappear', 'demand for labour falls', 'firms stop hiring'],
      answer: 'A',
      explanation: 'A higher wage increases the income forgone from leisure, encouraging more labour supply for some workers.',
    },
    practicePrompt: 'Explain how wages and non-wage factors influence labour supply.',
    markingGuide: ['Explains wage incentives', 'Explains at least one non-wage factor', 'Recognises individual preferences or constraints', 'Uses a labour-market example'],
    sampleAnswer: 'Higher wages can increase labour supply by raising the reward for work and the opportunity cost of leisure. Non-wage factors such as flexibility, location, childcare and working conditions also matter. A parent may prefer flexible hours even if another job pays more, showing that labour supply depends on both income and preferences.',
    teacherMove: 'Use real job choices to make labour-supply trade-offs concrete.',
    outcomes: ['ECO-11-02', 'ECO-11-05', 'ECO-11-10'],
  },
  'Businesses: production of goods and services': {
    keyIdea: 'Businesses combine land, labour, capital and enterprise to produce goods and services for sale.',
    quickCheck: {
      stem: 'A productivity improvement means a business can produce:',
      options: ['less output from more inputs', 'more output from the same inputs', 'the same output only at higher cost', 'without any resources'],
      answer: 'B',
      explanation: 'Productivity measures output per unit of input, so improvement means more output from given resources.',
    },
    practicePrompt: 'Explain how productivity affects business decisions and economic performance.',
    markingGuide: ['Defines productivity', 'Links productivity to costs or output', 'Explains business profitability or competitiveness', 'Links to wider economic performance'],
    sampleAnswer: 'Higher productivity means firms can produce more output from the same inputs. This lowers unit costs and can improve profits, prices or competitiveness. Across the economy, productivity growth can lift real incomes and long-term economic growth because scarce resources are used more efficiently.',
    teacherMove: 'Ask students to connect firm-level productivity to economy-wide living standards.',
    outcomes: ['ECO-11-02', 'ECO-11-04', 'ECO-11-10'],
  },
  'Businesses: the provision of income': {
    keyIdea: 'Businesses provide income through wages, salaries, rent, interest and profits, linking production decisions to household income.',
    quickCheck: {
      stem: 'Which is a factor income paid by businesses to households?',
      options: ['GST', 'Wages', 'Imports', 'Tariffs'],
      answer: 'B',
      explanation: 'Wages are income paid to labour, a factor of production supplied by households.',
    },
    practicePrompt: 'Explain how business conditions can affect household income.',
    markingGuide: ['Identifies business revenue or profitability', 'Links business decisions to wages, employment or profits', 'Explains flow-on effects to households', 'Uses circular-flow language'],
    sampleAnswer: 'When business revenue and confidence rise, firms may increase production, hire more workers or pay higher bonuses and dividends. This raises household income through wages and profits. If conditions weaken, firms may reduce hours or employment, lowering income and consumption.',
    teacherMove: 'Have students name the factor of production linked to each income type.',
    outcomes: ['ECO-11-02', 'ECO-11-04', 'ECO-11-10'],
  },
  'Role of financial sector': {
    keyIdea: 'The financial sector channels savings to borrowers and investors, supports payments, manages risk and helps allocate capital.',
    quickCheck: {
      stem: 'The financial sector most directly links:',
      options: ['savers and borrowers', 'only exporters and tourists', 'only governments and voters', 'prices and weather'],
      answer: 'A',
      explanation: 'Financial institutions and markets transfer funds from savers to borrowers and investors.',
    },
    practicePrompt: 'Explain why the financial sector is important for economic activity.',
    markingGuide: ['Identifies savings and borrowing channels', 'Explains investment or consumption effects', 'Mentions risk, liquidity or payments', 'Uses a relevant example'],
    sampleAnswer: 'The financial sector allows households to save and borrow and allows firms to raise funds for investment. Banks, equity markets and debt markets help allocate capital to productive uses. Efficient finance supports consumption smoothing, business expansion and economic growth, while poor lending can create instability.',
    teacherMove: 'Ask students to include both a benefit and a risk of finance.',
    outcomes: ['ECO-11-02', 'ECO-11-03', 'ECO-11-10'],
  },
  'Types of financial markets: equity markets': {
    keyIdea: 'Equity markets allow firms to raise capital by selling ownership claims and allow investors to trade risk and return.',
    quickCheck: {
      stem: 'A shareholder receives a return mainly through:',
      options: ['interest only', 'dividends and capital gains', 'tariffs', 'transfer payments'],
      answer: 'B',
      explanation: 'Equity holders own shares and may receive dividends or capital gains if share prices rise.',
    },
    practicePrompt: 'Distinguish equity finance from debt finance from a business perspective.',
    markingGuide: ['Defines equity finance', 'Defines debt finance', 'Compares repayment/control implications', 'Uses business examples'],
    sampleAnswer: 'Equity finance raises funds by selling ownership shares. It does not require fixed interest repayments, but it dilutes ownership and gives investors a claim on profits. Debt finance involves borrowing that must be repaid with interest, increasing financial risk but allowing existing owners to keep control.',
    teacherMove: 'Use a business expansion scenario and ask which finance source fits the risk profile.',
    outcomes: ['ECO-11-01', 'ECO-11-02', 'ECO-11-10'],
  },
  'Types of financial markets: debt markets': {
    keyIdea: 'Debt markets allow governments and firms to borrow through instruments such as bonds, with interest payments to lenders.',
    quickCheck: {
      stem: 'A bond is best described as:',
      options: ['an ownership share', 'a debt instrument', 'a tax on imports', 'a transfer payment'],
      answer: 'B',
      explanation: 'A bond is a form of borrowing where the issuer promises payments to lenders.',
    },
    practicePrompt: 'Explain how higher interest rates can affect borrowers and lenders in debt markets.',
    markingGuide: ['Identifies borrowers and lenders', 'Explains higher borrowing costs', 'Explains higher returns to lenders', 'Links to investment or consumption decisions'],
    sampleAnswer: 'Higher interest rates raise the cost of borrowing for firms and governments issuing debt, which can reduce investment or increase budget servicing costs. Lenders receive higher returns on new debt instruments, making saving more attractive. Existing bond prices may fall when market rates rise.',
    teacherMove: 'Push advanced students to distinguish new debt yields from existing bond prices.',
    outcomes: ['ECO-11-02', 'ECO-11-04', 'ECO-11-09'],
  },
  'Role of government': {
    keyIdea: 'Government influences allocation, distribution and stability through laws, spending, taxation and regulation.',
    quickCheck: {
      stem: 'Which objective is most directly linked to redistribution?',
      options: ['Reducing income inequality', 'Increasing import prices', 'Removing all public goods', 'Eliminating opportunity cost'],
      answer: 'A',
      explanation: 'Redistribution aims to change the distribution of income or access to resources.',
    },
    practicePrompt: 'Explain two economic roles of government.',
    markingGuide: ['Identifies two roles', 'Explains each role with economic reasoning', 'Uses examples', 'Connects to efficiency, equity or stability'],
    sampleAnswer: 'Government can improve equity through progressive taxation and transfer payments. It can also correct market failure, for example by regulating pollution or providing public goods. These roles influence how resources are allocated and how income and wellbeing are distributed.',
    teacherMove: 'Have students classify policies as allocation, redistribution or stabilisation.',
    outcomes: ['ECO-11-02', 'ECO-11-06', 'ECO-11-07'],
  },
  Taxation: {
    keyIdea: 'Taxation raises revenue, redistributes income and changes incentives for households and businesses.',
    quickCheck: {
      stem: 'A progressive tax means:',
      options: ['everyone pays the same amount', 'average tax rates rise with income', 'tax only applies to imports', 'tax revenue is always zero'],
      answer: 'B',
      explanation: 'Progressive taxation takes a larger average share of income as income increases.',
    },
    practicePrompt: 'Analyse one efficiency effect and one equity effect of taxation.',
    markingGuide: ['Explains an efficiency effect such as incentives or deadweight loss', 'Explains an equity effect such as redistribution', 'Uses tax terminology', 'Makes a balanced judgement'],
    sampleAnswer: 'Taxation can reduce efficiency if high marginal tax rates weaken incentives to work, save or invest. However, progressive income tax can improve equity by funding services and transfer payments for lower-income households. The impact depends on the tax base, rates and how revenue is used.',
    teacherMove: 'Require students to separate revenue-raising from incentive effects.',
    outcomes: ['ECO-11-05', 'ECO-11-06', 'ECO-11-10'],
  },
  'Government spending': {
    keyIdea: 'Government spending affects aggregate demand, public service provision, infrastructure and income distribution.',
    quickCheck: {
      stem: 'Public infrastructure spending is most directly an example of:',
      options: ['government expenditure', 'private saving', 'a leakage only', 'equity finance'],
      answer: 'A',
      explanation: 'Infrastructure projects are government expenditure and can add to aggregate demand and productive capacity.',
    },
    practicePrompt: 'Explain how government spending can affect both demand and supply in an economy.',
    markingGuide: ['Explains short-run demand effect', 'Explains long-run supply/productivity effect', 'Uses a spending example', 'Recognises possible budget constraints'],
    sampleAnswer: 'Government spending on infrastructure increases aggregate demand in the short run by paying firms and workers. In the long run, better transport or digital infrastructure can improve productivity and productive capacity. However, spending must be financed through taxation, borrowing or reprioritisation.',
    teacherMove: 'Ask students to label every spending example as recurrent, capital, transfer or direct provision.',
    outcomes: ['ECO-11-04', 'ECO-11-06', 'ECO-11-10'],
  },
  'International trade': {
    keyIdea: 'International trade allows specialisation and access to larger markets, but also exposes firms and workers to global competition.',
    quickCheck: {
      stem: 'Comparative advantage means a country should specialise where it has:',
      options: ['the lowest opportunity cost', 'the highest population', 'no imports', 'the strongest currency'],
      answer: 'A',
      explanation: 'Comparative advantage is based on relative opportunity cost, not absolute size or currency strength.',
    },
    practicePrompt: 'Explain one benefit and one cost of international trade for Australia.',
    markingGuide: ['Explains a benefit such as specialisation, lower prices or export income', 'Explains a cost such as structural change or exposure to shocks', 'Uses Australian examples', 'Balances the response'],
    sampleAnswer: 'Trade benefits Australia by allowing resource and service exporters to access larger markets, increasing income and economies of scale. It can also lower consumer prices through imports. However, trade can expose import-competing firms to pressure, causing structural adjustment and job losses in some regions.',
    teacherMove: 'Insist on an Australia-specific example in trade answers.',
    outcomes: ['ECO-11-03', 'ECO-11-05', 'ECO-11-10'],
  },
  'International investment': {
    keyIdea: 'International investment moves capital across borders through direct investment, portfolio investment and lending.',
    quickCheck: {
      stem: 'Foreign direct investment usually involves:',
      options: ['ownership or control of productive assets overseas', 'buying only consumer goods', 'a tariff on exports', 'a local transfer payment'],
      answer: 'A',
      explanation: 'FDI involves cross-border investment with a lasting interest or control in productive assets.',
    },
    practicePrompt: 'Analyse how foreign investment can affect economic growth and external stability.',
    markingGuide: ['Explains capital access or productivity effects', 'Explains income outflow or debt-servicing risks', 'Links to growth', 'Links to external stability'],
    sampleAnswer: 'Foreign investment can support growth by funding projects that domestic savings cannot fully finance, increasing capital stock and productivity. However, returns may flow overseas through profits, dividends or interest, affecting the income balance. Borrowing from overseas can also increase vulnerability if debt servicing becomes difficult.',
    teacherMove: 'Ask students to distinguish investment inflow benefits from income outflow costs.',
    outcomes: ['ECO-11-02', 'ECO-11-04', 'ECO-11-10'],
  },
  'Exchange rates': {
    keyIdea: 'Exchange rates influence export competitiveness, import prices, inflation, income flows and the value of international transactions.',
    quickCheck: {
      stem: 'An appreciation of the Australian dollar usually makes imports:',
      options: ['cheaper in Australian dollars', 'more expensive in Australian dollars', 'illegal', 'unaffected in all cases'],
      answer: 'A',
      explanation: 'An appreciation means each Australian dollar buys more foreign currency, reducing the Australian-dollar price of imports.',
    },
    practicePrompt: 'Analyse one effect of an exchange rate depreciation on Australia.',
    markingGuide: ['Defines depreciation', 'Explains export or import price effect', 'Links to inflation, growth or external balance', 'Recognises elasticity/time lag'],
    sampleAnswer: 'A depreciation makes Australian exports cheaper for foreign buyers and imports more expensive for Australians. This may improve export revenue and reduce imports if demand is responsive. It can also add to inflation by raising import prices, especially for fuel, machinery and consumer goods.',
    teacherMove: 'Require students to state whether they are using Australian-dollar or foreign-currency prices.',
    outcomes: ['ECO-11-03', 'ECO-11-08', 'ECO-12-03'],
  },
  'Balance of payments': {
    keyIdea: 'The balance of payments records economic transactions between residents and the rest of the world, including current, capital and financial flows.',
    quickCheck: {
      stem: 'Exports of services are recorded in the:',
      options: ['current account', 'capital account only', 'government budget', 'labour force survey'],
      answer: 'A',
      explanation: 'Goods and services exports are current account credits.',
    },
    practicePrompt: 'Explain how a rise in export prices can affect the current account.',
    markingGuide: ['Identifies export revenue as a current account credit', 'Explains price and volume effects', 'Links to trade balance or net goods/services', 'Uses external-sector terminology'],
    sampleAnswer: 'Higher export prices can increase export revenue if volumes do not fall proportionally. This improves net goods and services, a major part of the current account. The effect may also improve national income through stronger terms of trade, although income outflows and import spending also affect the final current account balance.',
    teacherMove: 'Make students classify each transaction as credit/debit and current/financial account.',
    outcomes: ['ECO-11-01', 'ECO-11-08', 'ECO-12-08'],
  },
  'Economic growth': {
    keyIdea: 'Economic growth is an increase in real output over time, affecting employment, income, living standards and sustainability.',
    quickCheck: {
      stem: 'Real GDP growth adjusts nominal GDP for:',
      options: ['price changes', 'population only', 'imports only', 'tax rates only'],
      answer: 'A',
      explanation: 'Real GDP removes inflation effects to measure changes in output volume.',
    },
    practicePrompt: 'Analyse one benefit and one limitation of economic growth.',
    markingGuide: ['Defines economic growth', 'Explains a benefit such as jobs or incomes', 'Explains a limitation such as inequality or environmental cost', 'Makes a balanced judgement'],
    sampleAnswer: 'Economic growth can increase employment and household incomes by raising demand for output and labour. It can also increase tax revenue for public services. However, growth may not be evenly distributed and can create environmental pressures if it relies on resource depletion or emissions-intensive production.',
    teacherMove: 'Ask students to distinguish growth in total GDP from growth in living standards.',
    outcomes: ['ECO-12-04', 'ECO-12-05', 'ECO-12-08'],
  },
  'Employment and unemployment': {
    keyIdea: 'Employment outcomes depend on labour demand, labour supply, productivity, wages, skills and the business cycle.',
    quickCheck: {
      stem: 'Cyclical unemployment is most closely linked to:',
      options: ['weak aggregate demand', 'retirement decisions only', 'seasonal fruit picking only', 'a permanent skills mismatch only'],
      answer: 'A',
      explanation: 'Cyclical unemployment rises when aggregate demand and output weaken.',
    },
    practicePrompt: 'Explain the difference between structural and cyclical unemployment.',
    markingGuide: ['Defines cyclical unemployment', 'Defines structural unemployment', 'Explains different causes', 'Uses an example for each'],
    sampleAnswer: 'Cyclical unemployment is caused by weak aggregate demand during downturns, when firms need fewer workers. Structural unemployment occurs when workers\' skills, location or industry experience do not match available jobs, often due to technology or industry change. Cyclical unemployment may fall with demand stimulus, while structural unemployment usually needs retraining or mobility support.',
    teacherMove: 'Use classification drills with scenarios before asking for policy evaluation.',
    outcomes: ['ECO-12-04', 'ECO-12-06', 'ECO-12-10'],
  },
  Inflation: {
    keyIdea: 'Inflation is a sustained increase in the general price level, caused by demand, cost and expectation pressures.',
    quickCheck: {
      stem: 'Demand-pull inflation is most likely when:',
      options: ['aggregate demand grows faster than productive capacity', 'all input costs fall', 'unemployment is always zero', 'exports are banned'],
      answer: 'A',
      explanation: 'Demand-pull inflation occurs when spending pressure exceeds the economy\'s capacity to supply goods and services.',
    },
    practicePrompt: 'Analyse two economic costs of high inflation.',
    markingGuide: ['Identifies two costs', 'Explains each with cause-effect logic', 'Links to households, firms or external stability', 'Uses accurate inflation terminology'],
    sampleAnswer: 'High inflation reduces purchasing power when wages do not keep pace with prices. It can also increase uncertainty for businesses, discouraging investment because future costs and returns are harder to predict. If domestic inflation exceeds trading partners, export competitiveness may weaken.',
    teacherMove: 'Do not accept "things are expensive" without explaining economic consequences.',
    outcomes: ['ECO-12-04', 'ECO-12-08', 'ECO-12-10'],
  },
  Inequality: {
    keyIdea: 'Inequality refers to uneven distribution of income, wealth and opportunity, shaped by labour markets, education, assets and policy.',
    quickCheck: {
      stem: 'A progressive income tax can reduce:',
      options: ['income inequality after tax', 'all productivity growth', 'every price in the CPI', 'the need for skills'],
      answer: 'A',
      explanation: 'Progressive tax systems can reduce disposable income inequality by taking a higher average share from higher incomes.',
    },
    practicePrompt: 'Analyse one cause and one consequence of income inequality.',
    markingGuide: ['Identifies a cause such as skills, assets or unemployment', 'Explains the cause', 'Identifies a consequence', 'Links to efficiency, equity or social outcomes'],
    sampleAnswer: 'A major cause of income inequality is unequal access to education and skills, which affects wages and employment opportunities. Inequality can reduce social mobility and limit human capital development if low-income households cannot access quality education, health or housing. It may also reduce social cohesion.',
    teacherMove: 'Encourage students to separate income inequality from wealth inequality.',
    outcomes: ['ECO-12-04', 'ECO-12-05', 'ECO-12-10'],
  },
  'Environmental sustainability': {
    keyIdea: 'Environmental sustainability requires economic activity to meet current needs without reducing future wellbeing or productive capacity.',
    quickCheck: {
      stem: 'Pollution from production is often treated as a:',
      options: ['negative externality', 'positive externality', 'public saving', 'factor income'],
      answer: 'A',
      explanation: 'Pollution imposes external costs on others and future generations.',
    },
    practicePrompt: 'Evaluate one policy that could improve environmental sustainability.',
    markingGuide: ['Identifies a policy', 'Explains how it changes incentives or behaviour', 'Evaluates benefits', 'Evaluates costs, equity or implementation limits'],
    sampleAnswer: 'An emissions pricing scheme can improve sustainability by making firms pay for pollution, encouraging cleaner technology and lower emissions. It can reduce negative externalities, but it may raise costs for households and firms. Effectiveness depends on coverage, price level, compensation and availability of substitutes.',
    teacherMove: 'Require students to discuss transition costs as well as environmental benefits.',
    outcomes: ['ECO-12-04', 'ECO-12-06', 'ECO-12-07'],
  },
  'Economic objectives': {
    keyIdea: 'Economic management balances objectives such as growth, low inflation, full employment, equity, external stability and sustainability.',
    quickCheck: {
      stem: 'Which pair of objectives can conflict in the short run?',
      options: ['Low inflation and strong demand growth', 'Literacy and numeracy', 'Exports and imports as categories', 'Scarcity and opportunity cost as definitions'],
      answer: 'A',
      explanation: 'Strong demand growth can reduce unemployment but may increase inflationary pressure.',
    },
    practicePrompt: 'Explain why governments may face conflicts between economic objectives.',
    markingGuide: ['Identifies two objectives', 'Explains the conflict mechanism', 'Uses a policy or economic example', 'Recognises short-run/long-run differences'],
    sampleAnswer: 'Governments may pursue lower unemployment through expansionary policy, but if the economy is near capacity this can increase inflation. Similarly, environmental sustainability policies may raise short-run costs for some firms while improving long-run wellbeing. Policy design must balance these trade-offs.',
    teacherMove: 'Ask students to frame evaluation around objectives, not just policies.',
    outcomes: ['ECO-12-04', 'ECO-12-06', 'ECO-12-10'],
  },
  'Fiscal policy': {
    keyIdea: 'Fiscal policy uses government spending, taxation and the budget balance to influence demand, distribution and long-term capacity.',
    quickCheck: {
      stem: 'Expansionary fiscal policy usually involves:',
      options: ['higher spending or lower taxation', 'higher cash rates', 'lower money supply only', 'removing all imports'],
      answer: 'A',
      explanation: 'Expansionary fiscal settings increase aggregate demand through spending increases or tax reductions.',
    },
    practicePrompt: 'Analyse how expansionary fiscal policy can affect economic growth and inflation.',
    markingGuide: ['Explains spending/tax transmission', 'Links to aggregate demand and growth', 'Explains inflation risk', 'Recognises multiplier, lags or capacity constraints'],
    sampleAnswer: 'Expansionary fiscal policy increases aggregate demand through higher government spending or lower taxation. This can raise output and employment, especially when spare capacity exists. If the economy is near full capacity, stronger demand may instead add to inflation. The effect depends on the size, timing and target of the policy.',
    teacherMove: 'Have students identify whether a fiscal measure is discretionary or automatic.',
    outcomes: ['ECO-12-06', 'ECO-12-07', 'ECO-12-08'],
  },
  'Monetary policy': {
    keyIdea: 'Monetary policy influences demand and inflation mainly through interest rates, credit, asset prices and exchange-rate channels.',
    quickCheck: {
      stem: 'A rise in the cash rate is designed to:',
      options: ['reduce inflationary pressure by lowering demand', 'increase borrowing immediately', 'remove all fiscal policy', 'increase quantity supplied in every market'],
      answer: 'A',
      explanation: 'Higher interest rates reduce borrowing and spending, easing demand-side inflation pressure.',
    },
    practicePrompt: 'Explain two channels through which monetary policy affects the economy.',
    markingGuide: ['Identifies two channels', 'Explains each transmission path', 'Links to inflation, growth or employment', 'Uses precise policy language'],
    sampleAnswer: 'The interest-rate channel affects borrowing and saving decisions: higher rates discourage borrowing and consumption while encouraging saving. The exchange-rate channel can make the currency appreciate when rates rise, reducing import prices but making exports less competitive. Both channels influence aggregate demand and inflation.',
    teacherMove: 'Require students to move beyond "rates go up, spending goes down" by naming channels.',
    outcomes: ['ECO-12-06', 'ECO-12-08', 'ECO-12-10'],
  },
  'Microeconomic policy': {
    keyIdea: 'Microeconomic policy targets individual markets and supply-side efficiency to improve productivity, competition and resource allocation.',
    quickCheck: {
      stem: 'Which is a microeconomic policy example?',
      options: ['Competition reform', 'Changing the cash rate', 'A one-off stimulus payment only', 'Measuring the unemployment rate'],
      answer: 'A',
      explanation: 'Competition reform targets market structure and efficiency, making it microeconomic.',
    },
    practicePrompt: 'Analyse how microeconomic reform can improve long-term economic growth.',
    markingGuide: ['Defines microeconomic reform', 'Explains productivity or competition effects', 'Links to productive capacity and growth', 'Evaluates adjustment costs'],
    sampleAnswer: 'Microeconomic reform can improve competition, reduce inefficient regulation and encourage firms to innovate. Higher productivity increases the economy\'s productive capacity, supporting long-term growth without the same inflationary pressure as demand stimulus. However, reforms can create adjustment costs for workers and firms in less competitive sectors.',
    teacherMove: 'Ask students to distinguish supply-side capacity from demand-side stimulus.',
    outcomes: ['ECO-12-06', 'ECO-12-07', 'ECO-12-10'],
  },
  'Labour market policy': {
    keyIdea: 'Labour market policy affects employment, wages, productivity, participation and the distribution of income.',
    quickCheck: {
      stem: 'Training programs for unemployed workers are mainly designed to reduce:',
      options: ['structural unemployment', 'all inflation instantly', 'the terms of trade', 'export volumes'],
      answer: 'A',
      explanation: 'Training can improve skill matching, which targets structural unemployment.',
    },
    practicePrompt: 'Evaluate one labour market policy aimed at reducing unemployment.',
    markingGuide: ['Identifies a labour market policy', 'Explains the unemployment type targeted', 'Evaluates benefits', 'Evaluates limitations such as cost, time or mismatch'],
    sampleAnswer: 'Training and reskilling programs can reduce structural unemployment by helping workers move into industries with stronger labour demand. This improves employability and productive capacity. However, results may take time and depend on whether training matches actual vacancies and whether workers can relocate or access programs.',
    teacherMove: 'Require students to name the unemployment type before evaluating policy.',
    outcomes: ['ECO-12-04', 'ECO-12-06', 'ECO-12-07'],
  },
  'Environmental policy': {
    keyIdea: 'Environmental policy uses regulation, pricing, investment and information to reduce environmental externalities and support sustainability.',
    quickCheck: {
      stem: 'A tradable emissions permit scheme creates:',
      options: ['a market price for emissions rights', 'unlimited free pollution', 'no incentive to innovate', 'a ban on all production'],
      answer: 'A',
      explanation: 'Permit schemes cap emissions and allow trading, creating a price incentive to reduce pollution.',
    },
    practicePrompt: 'Compare regulation and market-based policies for environmental management.',
    markingGuide: ['Defines regulation', 'Defines market-based policy', 'Compares certainty, flexibility and cost', 'Uses an environmental example'],
    sampleAnswer: 'Regulation can set clear minimum standards or bans, giving certainty about required behaviour. Market-based policies such as carbon pricing give firms flexibility to reduce emissions where it is cheapest. Regulation may be simpler to enforce in some cases, while pricing can encourage innovation but depends on the price level and coverage.',
    teacherMove: 'Ask students to compare policy instruments using certainty, cost and flexibility.',
    outcomes: ['ECO-12-06', 'ECO-12-07', 'ECO-12-10'],
  },
  'Policy mix': {
    keyIdea: 'The policy mix is the combination of macroeconomic and microeconomic policies used to pursue economic objectives.',
    quickCheck: {
      stem: 'A coordinated anti-inflation policy mix might combine tighter monetary policy with:',
      options: ['fiscal restraint or supply-side reforms', 'larger untargeted demand stimulus', 'a ban on measuring CPI', 'higher inflation expectations'],
      answer: 'A',
      explanation: 'Tighter monetary policy can reduce demand while fiscal restraint or supply-side reforms support lower inflation pressure.',
    },
    practicePrompt: 'Explain why policy coordination matters in economic management.',
    markingGuide: ['Defines policy mix', 'Explains how policies can complement each other', 'Explains how policies can conflict', 'Uses an objective such as inflation or growth'],
    sampleAnswer: 'Policy coordination matters because one policy can reinforce or offset another. Tight monetary policy may reduce inflation, but expansionary fiscal policy could keep demand high and make disinflation harder. A coordinated mix can combine demand management with supply-side reforms to achieve objectives more effectively.',
    teacherMove: 'Make students identify whether two policies are complementary or conflicting.',
    outcomes: ['ECO-12-06', 'ECO-12-07', 'ECO-12-10'],
  },
  'Global trade': {
    keyIdea: 'Global trade shapes specialisation, export income, import access, competition and exposure to international shocks.',
    quickCheck: {
      stem: 'A rise in global protectionism is likely to:',
      options: ['reduce access to export markets', 'guarantee lower consumer prices', 'remove structural change', 'increase comparative advantage automatically'],
      answer: 'A',
      explanation: 'Protectionist barriers reduce market access and can disrupt trade flows.',
    },
    practicePrompt: 'Analyse how changes in global trade conditions can affect Australia.',
    markingGuide: ['Identifies a trade condition change', 'Explains export or import channel', 'Links to growth, inflation or external stability', 'Uses an Australia-specific example'],
    sampleAnswer: 'If global trade weakens, demand for Australian exports such as resources, education or tourism can fall. This reduces export income and may weaken growth and employment in exposed industries. It can also affect the exchange rate and government revenue. However, impacts vary by industry and trading partner.',
    teacherMove: 'Require students to name a trade channel before evaluating the outcome.',
    outcomes: ['ECO-12-03', 'ECO-12-04', 'ECO-12-08'],
  },
  'Global investment': {
    keyIdea: 'Global investment links economies through capital flows, ownership, technology transfer, income payments and financial vulnerability.',
    quickCheck: {
      stem: 'Portfolio investment is generally more:',
      options: ['liquid and volatile than direct investment', 'permanent than all direct investment', 'unrelated to financial markets', 'identical to goods exports'],
      answer: 'A',
      explanation: 'Portfolio flows can move quickly through financial markets, making them more volatile than direct investment.',
    },
    practicePrompt: 'Evaluate the impact of foreign investment on Australia.',
    markingGuide: ['Explains capital and productivity benefits', 'Explains income outflows or foreign ownership concerns', 'Links to growth/external stability', 'Makes a balanced judgement'],
    sampleAnswer: 'Foreign investment can fund projects, transfer technology and increase productive capacity, supporting growth. It can also deepen financial markets. However, profits, dividends and interest may flow overseas, affecting the income balance, and some industries may raise national-interest concerns. The net effect depends on investment type and regulation.',
    teacherMove: 'Have students classify examples as direct, portfolio or debt flows.',
    outcomes: ['ECO-12-02', 'ECO-12-04', 'ECO-12-10'],
  },
  'International economic development': {
    keyIdea: 'Economic development is broader than growth and includes living standards, health, education, institutions and distribution.',
    quickCheck: {
      stem: 'Which indicator best captures development more broadly than GDP alone?',
      options: ['Human Development Index', 'Nominal exchange rate only', 'One firm\'s profit', 'Tariff rate only'],
      answer: 'A',
      explanation: 'HDI includes health, education and income dimensions, making it broader than GDP.',
    },
    practicePrompt: 'Explain why economic growth does not always lead to economic development.',
    markingGuide: ['Distinguishes growth and development', 'Explains distribution or services issue', 'Explains environmental/institutional issue', 'Uses an example'],
    sampleAnswer: 'Economic growth increases output, but development depends on whether gains improve wellbeing. If growth is concentrated among high-income groups or relies on environmental degradation, health, education and living standards may not improve broadly. Development also depends on institutions, infrastructure and access to services.',
    teacherMove: 'Require students to use at least one non-GDP measure in development answers.',
    outcomes: ['ECO-12-04', 'ECO-12-05', 'ECO-12-10'],
  },
  'Impacts of the global economy on Australia': {
    keyIdea: 'Australia is affected by global demand, commodity prices, capital flows, supply chains, exchange rates and international policy conditions.',
    quickCheck: {
      stem: 'A global downturn is most likely to reduce Australian:',
      options: ['export demand and business confidence', 'scarcity', 'opportunity cost', 'all import prices with certainty'],
      answer: 'A',
      explanation: 'Global downturns weaken external demand and confidence, especially in trade-exposed sectors.',
    },
    practicePrompt: 'Analyse how one global shock could affect Australia\'s growth and external stability.',
    markingGuide: ['Identifies a global shock', 'Explains transmission to exports, imports, capital or exchange rate', 'Links to growth', 'Links to external stability'],
    sampleAnswer: 'A sharp fall in commodity prices would reduce export revenue and the terms of trade, lowering national income and growth in resource-linked industries. It could also weaken the Australian dollar, cushioning exports but raising import prices. The effect on external stability depends on trade balances, income flows and investor confidence.',
    teacherMove: 'Make students trace shocks through at least two transmission channels.',
    outcomes: ['ECO-12-03', 'ECO-12-04', 'ECO-12-08'],
  },
};

const stimulusSetSpecs = {
  'year-11-introduction-to-economics': [
    {
      title: 'Scarcity and local resource allocation',
      context:
        'A regional council can fund only one major land-use project this year. The council is comparing a youth training centre with an events precinct and must explain the trade-off to residents.',
      data: [
        { indicator: 'Available budget', value: 8.0, unit: '$m', interpretation: 'The binding resource constraint for the decision.' },
        { indicator: 'Training centre estimated community benefit', value: 9.2, unit: '$m', interpretation: 'Benefit estimate if the council chooses the training centre.' },
        { indicator: 'Events precinct estimated community benefit', value: 7.4, unit: '$m', interpretation: 'Benefit estimate if the council chooses the events precinct.' },
        { indicator: 'Training centre construction jobs', value: 84, unit: 'jobs', interpretation: 'Short-run employment injection into the local circular flow.' },
        { indicator: 'Events precinct extra operating cost', value: 1.1, unit: '$m per year', interpretation: 'Ongoing cost that affects future budget choices.' },
      ],
      questions: [
        {
          marks: 2,
          prompt: 'Identify the opportunity cost if the council chooses the training centre.',
          markingGuide: ['Identifies the events precinct as the next best alternative', 'Uses stimulus evidence rather than a generic definition'],
        },
        {
          marks: 4,
          prompt: 'Explain how the stimulus illustrates scarcity and economic choice.',
          markingGuide: ['Identifies the budget or land-use constraint', 'Explains that both wants cannot be fully satisfied', 'Links choice to opportunity cost', 'Uses at least one data point'],
        },
        {
          marks: 6,
          prompt: 'Analyse why economic models would help the council communicate this decision, but would not settle the decision on their own.',
          markingGuide: ['Uses a model such as production possibilities or circular flow', 'Explains efficiency and trade-off reasoning', 'Recognises distributional or community-value limits of models', 'Makes a balanced judgement'],
        },
      ],
      sampleResponse:
        'The council faces scarcity because its $8.0 million budget cannot fund both projects. A production possibilities approach would clarify the trade-off: selecting the training centre means giving up the events precinct and its estimated $7.4 million benefit. Circular-flow reasoning can also show the short-run injection from 84 construction jobs. However, models simplify the decision because community access, long-run operating costs and distributional effects are not fully captured by one benefit estimate.',
      teacherMove: 'Ask students to name the resource constraint before they discuss opportunity cost.',
      outcomes: ['ECO-11-01', 'ECO-11-02', 'ECO-11-08', 'ECO-11-09', 'ECO-11-10'],
    },
  ],
  'year-11-markets': [
    {
      title: 'Fresh-food market after a supply shock',
      context:
        'Flooding reduces weekly supply in a fresh-food market. Retailers raise prices while consumer groups argue that low-income households are being hit hardest.',
      data: [
        { indicator: 'Quantity demanded at old price', value: 120000, unit: 'kg per week', interpretation: 'Demand remains high at the pre-shock price.' },
        { indicator: 'Quantity supplied after flood', value: 82000, unit: 'kg per week', interpretation: 'Supply shortage at the old price.' },
        { indicator: 'Price before flood', value: 3.2, unit: '$ per kg', interpretation: 'Original market price.' },
        { indicator: 'Price after flood', value: 4.1, unit: '$ per kg', interpretation: 'New price after supply shifts left.' },
        { indicator: 'Estimated price elasticity of demand', value: 0.4, unit: 'coefficient', interpretation: 'Demand is relatively inelastic.' },
      ],
      questions: [
        {
          marks: 2,
          prompt: 'Use the data to identify whether the market initially faces a shortage or surplus after the flood.',
          markingGuide: ['Compares quantity demanded with quantity supplied', 'Identifies a shortage of 38,000 kg per week'],
        },
        {
          marks: 4,
          prompt: 'Explain how the price rise helps move the market toward a new equilibrium.',
          markingGuide: ['Explains a leftward supply shift', 'Links higher prices to producer and consumer responses', 'Uses the price data', 'Uses equilibrium language accurately'],
        },
        {
          marks: 6,
          prompt: 'Analyse why the effect on household spending may be large even if quantity demanded falls only slightly.',
          markingGuide: ['Interprets the low elasticity estimate', 'Explains inelastic demand and total spending', 'Connects the issue to household welfare', 'Recognises distributional effects'],
        },
      ],
      sampleResponse:
        'The flood creates a shortage because quantity demanded at the old price is 120,000 kg while supply has fallen to 82,000 kg. As price rises from $3.20 to $4.10, some consumers reduce quantity demanded and producers have an incentive to supply more where possible. The elasticity estimate of 0.4 suggests demand is inelastic, so quantity demanded may fall by a smaller proportion than price rises. This can increase household spending on fresh food, especially for lower-income households with limited substitutes.',
      teacherMove: 'Require students to calculate the shortage before they explain the diagram.',
      outcomes: ['ECO-11-03', 'ECO-11-04', 'ECO-11-05', 'ECO-11-08', 'ECO-11-09', 'ECO-11-10'],
    },
  ],
  'year-11-household-business-sector': [
    {
      title: 'Consumption, saving and business investment',
      context:
        'Household income growth slows while firms report weaker confidence. A business chamber is deciding whether to delay planned capital spending.',
      data: [
        { indicator: 'Disposable income growth', value: 1.2, unit: '%', interpretation: 'Weak income growth limits consumption capacity.' },
        { indicator: 'Consumption growth', value: 0.4, unit: '%', interpretation: 'Households are spending cautiously.' },
        { indicator: 'Household saving ratio', value: 7.5, unit: '% of income', interpretation: 'Leakage from the circular flow has risen.' },
        { indicator: 'Business confidence index', value: -8, unit: 'index points', interpretation: 'Firms expect weaker demand.' },
        { indicator: 'Planned capital spending', value: -3.5, unit: '% change', interpretation: 'Investment injection is weakening.' },
      ],
      questions: [
        {
          marks: 2,
          prompt: 'Identify one leakage and one injection shown in the stimulus.',
          markingGuide: ['Identifies saving as a leakage', 'Identifies investment or capital spending as an injection'],
        },
        {
          marks: 4,
          prompt: 'Explain how slower consumption growth can affect business decisions.',
          markingGuide: ['Links consumption to business revenue', 'Explains effects on confidence or expected profit', 'Connects to investment and employment', 'Uses stimulus data'],
        },
        {
          marks: 6,
          prompt: 'Analyse the interaction between households and firms in this scenario using circular-flow reasoning.',
          markingGuide: ['Explains household income and consumption flows', 'Explains business investment decisions', 'Analyses feedback effects', 'Uses correct sector language'],
        },
      ],
      sampleResponse:
        'Households and businesses are interdependent. Weak disposable income growth of 1.2% and consumption growth of 0.4% reduce sales revenue for firms. The higher saving ratio is a leakage, while the 3.5% fall in planned capital spending reduces an injection. Firms may delay investment when confidence is negative because expected profit is lower. This can reduce employment and income, feeding back into further household caution.',
      teacherMove: 'Have students mark each data point as household, business, leakage or injection.',
      outcomes: ['ECO-11-02', 'ECO-11-04', 'ECO-11-05', 'ECO-11-08', 'ECO-11-10'],
    },
  ],
  'year-11-financial-sector': [
    {
      title: 'Financial markets and funding choices',
      context:
        'A medium-sized business is comparing bank debt, corporate bonds and issuing shares. Household investors are also shifting savings toward safer deposits.',
      data: [
        { indicator: 'Household deposit growth', value: 4.8, unit: '% annual', interpretation: 'More household funds are flowing to deposit-taking institutions.' },
        { indicator: 'New fixed-rate mortgage approvals', value: -6.2, unit: '% quarterly', interpretation: 'Higher rates are reducing household borrowing demand.' },
        { indicator: 'Listed equity issuance', value: 3.1, unit: '$b', interpretation: 'Firms are raising ownership finance through equity markets.' },
        { indicator: 'Corporate bond yield', value: 5.4, unit: '%', interpretation: 'Debt-market funding has a visible interest cost.' },
        { indicator: 'Business credit growth', value: 2.2, unit: '% annual', interpretation: 'Bank lending to firms is still expanding modestly.' },
      ],
      questions: [
        {
          marks: 2,
          prompt: 'Distinguish between the equity-market and debt-market options in the stimulus.',
          markingGuide: ['Identifies shares/equity as ownership finance', 'Identifies bonds or loans as debt finance requiring repayment or interest'],
        },
        {
          marks: 4,
          prompt: 'Explain how higher interest costs can influence household and business behaviour.',
          markingGuide: ['Links rates to borrowing costs', 'Uses mortgage or bond-yield data', 'Explains household borrowing response', 'Explains business investment or finance response'],
        },
        {
          marks: 6,
          prompt: 'Analyse the role of the financial sector in allocating savings to investment in this scenario.',
          markingGuide: ['Explains intermediation or market funding', 'Links household saving to business finance', 'Compares debt and equity channels', 'Uses stimulus evidence'],
        },
      ],
      sampleResponse:
        'The financial sector channels savings toward borrowers and investors. Deposit growth of 4.8% gives banks more funds that can support lending, while business credit growth of 2.2% shows bank finance still expanding. Equity issuance of $3.1 billion provides ownership finance that does not require interest payments, whereas bonds expose the firm to a 5.4% yield. The sector therefore allocates funds through both intermediated lending and direct markets, but higher borrowing costs can reduce demand for finance.',
      teacherMove: 'Ask students to separate source of funds, channel of finance and user of funds.',
      outcomes: ['ECO-11-02', 'ECO-11-03', 'ECO-11-05', 'ECO-11-08', 'ECO-11-09', 'ECO-11-10'],
    },
  ],
  'year-11-government-sector': [
    {
      title: 'Budget choices and fiscal effects',
      context:
        'The government announces a targeted support package and infrastructure spending during a period of weak private demand.',
      data: [
        { indicator: 'Infrastructure spending change', value: 2.5, unit: '$b', interpretation: 'Direct government demand injection.' },
        { indicator: 'Transfer payments change', value: 1.2, unit: '$b', interpretation: 'Raises disposable income for selected households.' },
        { indicator: 'Income tax receipts change', value: -0.9, unit: '$b', interpretation: 'Weaker revenue or tax relief reduces budget income.' },
        { indicator: 'Budget balance impact', value: -3.6, unit: '$b', interpretation: 'The package increases the deficit.' },
        { indicator: 'Estimated fiscal multiplier', value: 0.8, unit: 'coefficient', interpretation: 'Each dollar of spending is expected to raise GDP by less than one dollar.' },
      ],
      questions: [
        {
          marks: 2,
          prompt: 'Identify one example of government spending and one example of government revenue in the stimulus.',
          markingGuide: ['Identifies infrastructure or transfers as spending', 'Identifies income tax receipts as revenue'],
        },
        {
          marks: 4,
          prompt: 'Explain how the package could affect aggregate demand.',
          markingGuide: ['Identifies fiscal stimulus', 'Explains direct spending injection', 'Explains transfer-payment effect on consumption', 'Uses multiplier or budget data'],
        },
        {
          marks: 6,
          prompt: 'Analyse one benefit and one cost of the government using this fiscal response.',
          markingGuide: ['Explains a growth, employment or equity benefit', 'Explains a budget deficit or opportunity-cost concern', 'Uses the multiplier and deficit evidence', 'Makes a balanced judgement'],
        },
      ],
      sampleResponse:
        'The package is expansionary because infrastructure spending and transfers add to aggregate demand. The $2.5 billion infrastructure increase directly raises demand, while the $1.2 billion transfer rise can support household consumption. However, the multiplier of 0.8 suggests the GDP effect may be modest, and the $3.6 billion deterioration in the budget balance creates future financing or opportunity-cost pressures. A balanced judgement depends on whether the support is temporary, targeted and productive.',
      teacherMove: 'Make students identify the policy stance before evaluating effectiveness.',
      outcomes: ['ECO-11-02', 'ECO-11-04', 'ECO-11-06', 'ECO-11-07', 'ECO-11-08', 'ECO-11-10'],
    },
  ],
  'year-11-international-sector': [
    {
      title: 'Exchange-rate movement and external accounts',
      context:
        'The Australian dollar depreciates after a fall in investor confidence. Exporters welcome the change, while import-reliant firms warn of rising costs.',
      data: [
        { indicator: 'AUD movement against USD', value: -8.0, unit: '%', interpretation: 'Depreciation makes Australian exports cheaper to foreigners.' },
        { indicator: 'Export volume change', value: 3.5, unit: '%', interpretation: 'Export volumes respond positively.' },
        { indicator: 'Import price change', value: 6.0, unit: '%', interpretation: 'Imported inputs and consumer goods become more expensive.' },
        { indicator: 'Net primary income balance', value: -18.0, unit: '$b', interpretation: 'Income paid overseas exceeds income received.' },
        { indicator: 'Current account balance', value: -10.0, unit: '$b', interpretation: 'External payments exceed receipts overall.' },
      ],
      questions: [
        {
          marks: 2,
          prompt: 'Identify one likely benefit and one likely cost of the depreciation.',
          markingGuide: ['Identifies export competitiveness or volume benefit', 'Identifies import-price or inflation cost'],
        },
        {
          marks: 4,
          prompt: 'Explain how the depreciation could affect the current account.',
          markingGuide: ['Explains export effect', 'Explains import-price or import-volume effect', 'Mentions net primary income or current account balance', 'Uses stimulus data'],
        },
        {
          marks: 6,
          prompt: 'Analyse why different groups in the economy may view the depreciation differently.',
          markingGuide: ['Compares exporters and import-reliant firms or households', 'Explains price competitiveness', 'Explains cost-of-living or input-cost effects', 'Uses external-sector terminology'],
        },
      ],
      sampleResponse:
        'A depreciation can help exporters because Australian goods become cheaper in foreign currency, which is consistent with export volumes rising 3.5%. It can also increase import prices, shown by the 6.0% rise, affecting households and firms that rely on imported inputs. The current account effect is mixed: higher exports can improve the goods balance, but higher import prices and a $18.0 billion net primary income deficit can continue to weigh on the current account.',
      teacherMove: 'Require students to discuss both price and volume effects when analysing exchange rates.',
      outcomes: ['ECO-11-03', 'ECO-11-05', 'ECO-11-08', 'ECO-11-09', 'ECO-11-10'],
    },
  ],
  'year-12-economic-issues': [
    {
      title: 'Growth, labour-market and inflation trade-offs',
      context:
        'Australia experiences below-trend growth while inflation remains above target. Policymakers must weigh cost-of-living pressure against labour-market risks.',
      data: [
        { indicator: 'Real GDP growth', value: 1.4, unit: '% annual', interpretation: 'Output growth is weak.' },
        { indicator: 'Unemployment rate', value: 4.7, unit: '%', interpretation: 'Labour-market spare capacity is rising.' },
        { indicator: 'Underemployment rate', value: 7.2, unit: '%', interpretation: 'Some workers want more hours.' },
        { indicator: 'CPI inflation', value: 3.8, unit: '% annual', interpretation: 'Inflation remains above a typical target band.' },
        { indicator: 'Real wages growth', value: -0.4, unit: '% annual', interpretation: 'Purchasing power is falling.' },
      ],
      questions: [
        {
          marks: 2,
          prompt: 'Identify two economic issues shown in the stimulus.',
          markingGuide: ['Identifies weak growth, unemployment/underemployment, inflation or falling real wages', 'Uses relevant data'],
        },
        {
          marks: 4,
          prompt: 'Explain one likely consequence of negative real wages growth for households and firms.',
          markingGuide: ['Explains loss of purchasing power', 'Links to consumption or living standards', 'Explains flow-on effect to firms', 'Uses stimulus data'],
        },
        {
          marks: 6,
          prompt: 'Analyse the policy trade-off created by weak growth and above-target inflation.',
          markingGuide: ['Explains demand-management tension', 'Links inflation to restrictive policy pressure', 'Links unemployment/growth to support pressure', 'Makes a supported judgement'],
        },
      ],
      sampleResponse:
        'The data show several issues occurring together: GDP growth is weak at 1.4%, unemployment is 4.7%, underemployment is 7.2%, and CPI inflation is 3.8%. Restrictive policy could help reduce inflation but may further weaken demand and employment. Expansionary policy could support growth and jobs but risks extending inflation pressure. Negative real wages growth also reduces household purchasing power, so policymakers need a targeted mix rather than a simple one-direction response.',
      teacherMove: 'Push students to treat issues as connected rather than separate paragraphs.',
      outcomes: ['ECO-12-01', 'ECO-12-04', 'ECO-12-05', 'ECO-12-08', 'ECO-12-09', 'ECO-12-10'],
    },
  ],
  'year-12-economic-management': [
    {
      title: 'Policy mix under inflation pressure',
      context:
        'Monetary policy is restrictive while fiscal policy is mildly contractionary. The government argues that productivity reform is needed to improve long-run capacity.',
      data: [
        { indicator: 'Cash rate', value: 4.35, unit: '%', interpretation: 'Monetary policy is putting pressure on borrowing and spending.' },
        { indicator: 'Underlying inflation', value: 3.6, unit: '% annual', interpretation: 'Inflation remains above target.' },
        { indicator: 'Budget impulse', value: -0.6, unit: '% of GDP', interpretation: 'Fiscal policy is reducing demand at the margin.' },
        { indicator: 'Labour productivity growth', value: 0.8, unit: '% annual', interpretation: 'Supply-side capacity is improving slowly.' },
        { indicator: 'Public infrastructure pipeline', value: 18.0, unit: '$b', interpretation: 'Public investment can support capacity but may add short-run demand.' },
      ],
      questions: [
        {
          marks: 2,
          prompt: 'Identify the monetary-policy stance and fiscal-policy stance shown in the stimulus.',
          markingGuide: ['Identifies restrictive monetary policy', 'Identifies mildly contractionary fiscal policy using the negative budget impulse'],
        },
        {
          marks: 4,
          prompt: 'Explain how the policy mix could reduce inflationary pressure.',
          markingGuide: ['Explains higher cash-rate effects on demand', 'Explains contractionary fiscal impulse', 'Links weaker demand to inflation', 'Uses stimulus values'],
        },
        {
          marks: 6,
          prompt: 'Evaluate why productivity reform may be needed alongside demand-management policies.',
          markingGuide: ['Explains limits of demand management', 'Links productivity to aggregate supply or capacity', 'Considers short-run adjustment or infrastructure trade-offs', 'Makes an effectiveness judgement'],
        },
      ],
      sampleResponse:
        'The policy mix is broadly anti-inflationary: a 4.35% cash rate restrains borrowing and consumption, while a -0.6% fiscal impulse reduces demand at the margin. This can help lower inflation from 3.6%, but demand management can also slow growth and employment. Productivity reform matters because it expands productive capacity and can reduce cost pressure over time. However, infrastructure spending may add short-run demand, so sequencing and targeting affect effectiveness.',
      teacherMove: 'Require students to classify policy by objective, transmission channel and time horizon.',
      outcomes: ['ECO-12-01', 'ECO-12-04', 'ECO-12-06', 'ECO-12-07', 'ECO-12-08', 'ECO-12-10'],
    },
  ],
  'year-12-australia-global-economy': [
    {
      title: 'Global commodity shock and Australia',
      context:
        'Commodity prices fall as major trading-partner growth slows. The exchange rate depreciates, and analysts debate whether the depreciation will cushion the external shock.',
      data: [
        { indicator: 'Terms of trade change', value: -9.0, unit: '% annual', interpretation: 'Export prices fall relative to import prices.' },
        { indicator: 'Commodity export revenue change', value: -14.0, unit: '$b', interpretation: 'National income from key exports falls.' },
        { indicator: 'AUD trade-weighted index change', value: -5.5, unit: '%', interpretation: 'Depreciation can support competitiveness.' },
        { indicator: 'Net foreign debt', value: 38.0, unit: '% of GDP', interpretation: 'External vulnerability remains relevant.' },
        { indicator: 'Major trading-partner growth', value: 3.0, unit: '% annual', interpretation: 'External demand is softer than expected.' },
      ],
      questions: [
        {
          marks: 2,
          prompt: 'Identify two channels through which the global shock can affect Australia.',
          markingGuide: ['Identifies terms of trade, export revenue, exchange rate, growth or debt channel', 'Uses stimulus data'],
        },
        {
          marks: 4,
          prompt: 'Explain how a fall in the terms of trade can affect Australian living standards.',
          markingGuide: ['Defines or interprets terms of trade', 'Links export prices to national income', 'Explains effect on purchasing power or living standards', 'Uses the -9.0% data point'],
        },
        {
          marks: 6,
          prompt: 'Analyse whether the exchange-rate depreciation is likely to fully offset the external shock.',
          markingGuide: ['Explains cushioning effect of depreciation', 'Explains limits due to commodity prices or demand', 'Links to external stability and growth', 'Makes a reasoned judgement'],
        },
      ],
      sampleResponse:
        'The depreciation may cushion the shock by making Australian exports more competitive and reducing demand for imports. However, it is unlikely to fully offset a 9.0% fall in the terms of trade and a $14.0 billion fall in commodity export revenue, because those changes reduce national income directly. Softer trading-partner growth also weakens external demand. With net foreign debt at 38.0% of GDP, external stability remains a concern if income and confidence weaken.',
      teacherMove: 'Ask students to separate price effects, income effects and exchange-rate effects.',
      outcomes: ['ECO-12-03', 'ECO-12-04', 'ECO-12-06', 'ECO-12-08', 'ECO-12-09'],
    },
  ],
};

export const economicsExamPracticePacks = [
  makeExamPracticePack({
    id: 'eco-hsc-transition-2009-practice-pack',
    title: 'HSC transition practice pack: Economics Stage 6 (2009)',
    syllabus: 'Economics Stage 6 Syllabus (2009)',
    audience: 'Year 12 students preparing for the 2026 and 2027 HSC exam pattern',
    totalMarks: 100,
    time: '3 hours plus 5 minutes reading time',
    description:
      'A paper-style workout for the still-examined Stage 6 HSC course, covering the global economy, Australia in the global economy, economic issues, and economic policies and management.',
    transitionNote:
      'Use this pack for current HSC preparation while Year 12 continues under the 2009 syllabus during the transition to the new Economics 11-12 syllabus.',
    sourceLinks: [
      { title: 'Economics Stage 6 Syllabus (2009)', url: legacySyllabusUrl },
      { title: 'Assessment and reporting in Economics', url: legacyAssessmentUrl },
      { title: 'Official Economics HSC exam papers', url: hscExamPapersUrl },
      { title: 'Official Economics HSC standards materials', url: hscStandardsUrl },
    ],
    sections: [
      {
        label: 'Section I',
        marks: 20,
        format: '20 objective-response questions',
        itemCount: 20,
        sampleItems: [
          {
            stem: 'A country has a comparative advantage in producing services when it can produce services:',
            options: ['with the lowest absolute cost', 'at a lower opportunity cost', 'with no imported inputs', 'only for domestic consumers'],
            answer: 'B',
            explanation: 'Comparative advantage is based on relative opportunity cost, not absolute cost.',
            outcomes: ['ECO-12-01', 'ECO-12-03'],
          },
          {
            stem: 'Which change is most likely to improve Australia\'s terms of trade?',
            options: ['Export prices rise faster than import prices', 'Import prices rise faster than export prices', 'The exchange rate depreciates only', 'Net foreign debt rises'],
            answer: 'A',
            explanation: 'The terms of trade compare export prices with import prices.',
            outcomes: ['ECO-12-03', 'ECO-12-08'],
          },
          {
            stem: 'An increase in structural unemployment is most likely caused by:',
            options: ['a temporary fall in aggregate demand', 'a mismatch between skills and available jobs', 'lower participation in all industries', 'a short public holiday'],
            answer: 'B',
            explanation: 'Structural unemployment arises when labour skills, location or industry experience no longer match demand.',
            outcomes: ['ECO-12-04'],
          },
          {
            stem: 'If inflation expectations rise, the short-run risk is that:',
            options: ['workers and firms accept lower prices', 'wage and price setting can reinforce inflation', 'aggregate demand must fall to zero', 'imports become free'],
            answer: 'B',
            explanation: 'Expectations can make inflation more persistent through wage claims and price-setting behaviour.',
            outcomes: ['ECO-12-04', 'ECO-12-06'],
          },
          {
            stem: 'A contractionary fiscal-policy stance is most likely shown by:',
            options: ['higher government spending and lower taxes', 'lower interest rates', 'lower government spending or higher taxes', 'a floating exchange rate'],
            answer: 'C',
            explanation: 'Contractionary fiscal policy withdraws demand through lower spending, higher taxes or both.',
            outcomes: ['ECO-12-06'],
          },
          {
            stem: 'Which policy is most directly designed to improve long-run productive capacity?',
            options: ['Microeconomic reform', 'A one-off transfer payment', 'A temporary depreciation', 'Higher cyclical unemployment'],
            answer: 'A',
            explanation: 'Microeconomic reform targets efficiency, productivity and aggregate supply over time.',
            outcomes: ['ECO-12-06', 'ECO-12-07'],
          },
          {
            stem: 'A persistent current account deficit can increase external vulnerability when it:',
            options: ['is financed by rising foreign liabilities', 'reduces every import price', 'eliminates net income outflows', 'guarantees export diversification'],
            answer: 'A',
            explanation: 'External vulnerability can rise when deficits add to foreign debt or equity servicing obligations.',
            outcomes: ['ECO-12-03', 'ECO-12-04'],
          },
          {
            stem: 'Income inequality may increase when economic growth is concentrated in:',
            options: ['industries and workers already receiving high incomes', 'all households equally', 'only public goods', 'perfectly competitive labour markets with identical skills'],
            answer: 'A',
            explanation: 'Growth can widen inequality if gains accrue mainly to high-income groups or regions.',
            outcomes: ['ECO-12-04', 'ECO-12-05'],
          },
          {
            stem: 'A depreciation of the Australian dollar is most likely to:',
            options: ['make exports less competitive', 'reduce the Australian-dollar price of imports', 'raise the Australian-dollar price of imports', 'remove the current account deficit'],
            answer: 'C',
            explanation: 'A depreciation means each Australian dollar buys less foreign currency, so imported goods and inputs become more expensive in Australian-dollar terms.',
            outcomes: ['ECO-12-03', 'ECO-12-08'],
          },
          {
            stem: 'Which policy response is most likely to reduce demand-pull inflation?',
            options: ['A cut in the cash rate', 'A rise in government transfer payments to all households', 'A rise in the cash rate', 'A fall in indirect taxes with no offset'],
            answer: 'C',
            explanation: 'A higher cash rate restrains borrowing and spending, reducing aggregate demand pressure.',
            outcomes: ['ECO-12-04', 'ECO-12-06'],
          },
          {
            stem: 'Which indicator most directly measures labour underutilisation beyond the unemployment rate?',
            options: ['Underemployment rate', 'Terms of trade', 'Consumer price index', 'Net primary income balance'],
            answer: 'A',
            explanation: 'Underemployment captures workers who have a job but want more hours, adding to the picture of spare labour capacity.',
            outcomes: ['ECO-12-04', 'ECO-12-08'],
          },
          {
            stem: 'An increase in the Gini coefficient usually indicates:',
            options: ['a more equal distribution of income', 'a less equal distribution of income', 'a fall in inflation', 'a balanced current account'],
            answer: 'B',
            explanation: 'A higher Gini coefficient indicates greater measured income inequality.',
            outcomes: ['ECO-12-04', 'ECO-12-09'],
          },
          {
            stem: 'Which change would most likely improve environmental sustainability while creating short-run adjustment costs?',
            options: ['Removing all environmental regulation', 'Introducing a carbon price or tighter emissions standards', 'Increasing fossil-fuel subsidies permanently', 'Ignoring negative externalities'],
            answer: 'B',
            explanation: 'Policies that price or regulate emissions can reduce environmental damage but may raise costs for emissions-intensive firms during adjustment.',
            outcomes: ['ECO-12-04', 'ECO-12-06', 'ECO-12-07'],
          },
          {
            stem: 'The main objective of automatic stabilisers is to:',
            options: ['amplify swings in the business cycle', 'smooth changes in aggregate demand without new discretionary decisions', 'fix the exchange rate', 'remove all structural unemployment'],
            answer: 'B',
            explanation: 'Automatic stabilisers such as progressive taxes and welfare payments change with the cycle and cushion demand.',
            outcomes: ['ECO-12-06'],
          },
          {
            stem: 'A rise in productivity is most likely to support non-inflationary growth because it:',
            options: ['reduces the economy\'s productive capacity', 'allows more output from available inputs', 'guarantees higher import prices', 'raises unemployment permanently'],
            answer: 'B',
            explanation: 'Productivity growth increases output per input, improving aggregate supply and easing capacity pressure.',
            outcomes: ['ECO-12-04', 'ECO-12-06'],
          },
          {
            stem: 'A tariff on imported goods is most likely to:',
            options: ['increase protection for domestic producers', 'eliminate opportunity cost', 'guarantee lower prices for consumers', 'remove all exchange-rate risk'],
            answer: 'A',
            explanation: 'A tariff raises the price of imported goods, protecting domestic producers but often increasing consumer prices and reducing efficiency.',
            outcomes: ['ECO-12-03', 'ECO-12-05'],
          },
          {
            stem: 'A worsening net primary income balance is most likely associated with:',
            options: ['higher income payments to foreign investors than income received from overseas', 'a guaranteed trade surplus', 'falling foreign liabilities only', 'no external vulnerability'],
            answer: 'A',
            explanation: 'The net primary income balance records income flows such as interest, dividends and profits between Australia and the rest of the world.',
            outcomes: ['ECO-12-03', 'ECO-12-08'],
          },
          {
            stem: 'Which policy mix is most coherent when inflation is high and growth is weak?',
            options: ['Untargeted demand stimulus only', 'Restrictive demand management with targeted support and supply-side reform', 'No policy response of any kind', 'Permanent price controls in every market'],
            answer: 'B',
            explanation: 'High inflation and weak growth create a trade-off, so a coherent mix restrains broad demand while targeting support and improving supply capacity.',
            outcomes: ['ECO-12-06', 'ECO-12-07'],
          },
          {
            stem: 'A slowdown in a major trading partner is most likely to affect Australia through:',
            options: ['lower demand for exports and weaker business confidence', 'higher scarcity in every market being removed', 'automatic elimination of inflation', 'guaranteed higher real wages'],
            answer: 'A',
            explanation: 'Trading-partner slowdowns can reduce export demand, commodity prices, investment and confidence.',
            outcomes: ['ECO-12-03', 'ECO-12-04'],
          },
          {
            stem: 'Which statement best describes the difference between economic growth and economic development?',
            options: ['Growth is only about inflation, while development is only about exchange rates', 'Growth measures output increases, while development also considers wellbeing and living standards', 'Development ignores education and health', 'Growth and development are always identical'],
            answer: 'B',
            explanation: 'Economic development is broader than output growth and includes living standards, health, education, distribution and institutions.',
            outcomes: ['ECO-12-04', 'ECO-12-05'],
          },
        ],
      },
      {
        label: 'Section II',
        marks: 40,
        format: 'Four short-answer questions in parts',
        items: [
          {
            title: 'Question 21 - Globalisation and economic development',
            marks: 10,
            stimulus:
              'An emerging economy has increased manufactured exports, attracted foreign direct investment, and experienced rising urban wages, but rural poverty remains high.',
            parts: [
              {
                marks: 2,
                prompt: 'Define globalisation in an economic context.',
                markingGuide: ['Refers to integration between economies', 'Mentions trade, investment, finance, labour or technology flows'],
              },
              {
                marks: 4,
                prompt: 'Explain how foreign direct investment can contribute to economic development.',
                markingGuide: ['Links FDI to capital, employment or technology transfer', 'Distinguishes growth from development', 'Uses the stimulus context', 'Recognises possible limits'],
              },
              {
                marks: 4,
                prompt: 'Analyse why growth from globalisation may not reduce poverty evenly.',
                markingGuide: ['Explains uneven sectoral or regional gains', 'Links urban wages and rural poverty', 'Uses development language', 'Makes a clear causal argument'],
              },
            ],
            outcomes: ['ECO-12-03', 'ECO-12-04', 'ECO-12-05', 'ECO-12-10'],
          },
          {
            title: 'Question 22 - Australia in the global economy',
            marks: 10,
            stimulus:
              'Australia\'s export prices fall, the Australian dollar depreciates, and import prices rise. Business confidence weakens in resource-exposed regions.',
            parts: [
              {
                marks: 3,
                prompt: 'Explain how a fall in export prices affects the terms of trade.',
                markingGuide: ['Identifies export prices relative to import prices', 'Explains a decline in the terms of trade', 'Links to national income or purchasing power'],
              },
              {
                marks: 3,
                prompt: 'Explain one benefit and one cost of the depreciation.',
                markingGuide: ['Explains improved export competitiveness', 'Explains higher import prices or inflation pressure', 'Uses the stimulus'],
              },
              {
                marks: 4,
                prompt: 'Analyse the likely effect of these changes on Australian economic growth.',
                markingGuide: ['Explains export-income channel', 'Explains confidence or investment channel', 'Considers exchange-rate cushioning', 'Makes a balanced judgement'],
              },
            ],
            outcomes: ['ECO-12-03', 'ECO-12-04', 'ECO-12-08', 'ECO-12-10'],
          },
          {
            title: 'Question 23 - Economic issues',
            marks: 10,
            stimulus:
              'Inflation is above target, real wages have fallen, unemployment is rising slowly, and household consumption growth has weakened.',
            parts: [
              {
                marks: 2,
                prompt: 'Identify two economic issues shown in the stimulus.',
                markingGuide: ['Identifies inflation, unemployment, weak consumption or falling real wages', 'Uses economic terminology'],
              },
              {
                marks: 4,
                prompt: 'Explain how inflation can affect households and businesses.',
                markingGuide: ['Explains purchasing-power effects', 'Explains cost or uncertainty effects for firms', 'Uses the stimulus context', 'Avoids one-sided description'],
              },
              {
                marks: 4,
                prompt: 'Analyse the relationship between weaker consumption and unemployment.',
                markingGuide: ['Links consumption to aggregate demand', 'Explains derived demand for labour', 'Recognises lag or confidence effects', 'Uses cause-effect language'],
              },
            ],
            outcomes: ['ECO-12-04', 'ECO-12-05', 'ECO-12-08', 'ECO-12-10'],
          },
          {
            title: 'Question 24 - Economic policy management',
            marks: 10,
            stimulus:
              'The central bank keeps monetary policy restrictive while the government announces targeted cost-of-living support and productivity reforms.',
            parts: [
              {
                marks: 3,
                prompt: 'Describe the transmission mechanism of restrictive monetary policy.',
                markingGuide: ['Mentions interest rates or borrowing costs', 'Links to consumption, investment or asset prices', 'Links weaker demand to inflation'],
              },
              {
                marks: 3,
                prompt: 'Explain why targeted fiscal support may be preferred to broad stimulus.',
                markingGuide: ['Explains support for vulnerable households', 'Explains lower inflation risk than broad demand stimulus', 'Uses policy trade-off language'],
              },
              {
                marks: 4,
                prompt: 'Assess why productivity reform can complement demand-management policies.',
                markingGuide: ['Links productivity to aggregate supply', 'Explains limits of monetary/fiscal policy', 'Considers time lags or adjustment costs', 'Makes a judgement'],
              },
            ],
            outcomes: ['ECO-12-06', 'ECO-12-07', 'ECO-12-08', 'ECO-12-10'],
          },
        ],
      },
      {
        label: 'Section III',
        marks: 20,
        format: 'Choose one stimulus-based extended response',
        items: [
          {
            title: 'External shock stimulus essay',
            stimulus:
              'Commodity export revenue falls, the terms of trade weaken, and the exchange rate depreciates. Net foreign liabilities remain elevated.',
            prompt:
              'Evaluate the effects of changes in the global economy on Australia\'s economic performance and external stability.',
            planningFrame: ['Define external stability and global transmission channels', 'Analyse export prices, exchange rate and income effects', 'Use the stimulus explicitly', 'Judge short-run cushioning against long-run vulnerability'],
            outcomes: ['ECO-12-03', 'ECO-12-04', 'ECO-12-06', 'ECO-12-08', 'ECO-12-10'],
          },
          {
            title: 'Inequality and labour-market stimulus essay',
            stimulus:
              'Real wages fall for low-income households, underemployment rises, and high-skill industries report strong profit growth.',
            prompt:
              'Evaluate the causes and consequences of inequality in the Australian economy.',
            planningFrame: ['Define income and wealth inequality', 'Analyse labour-market, education, technology and regional causes', 'Use stimulus evidence', 'Evaluate social and economic consequences plus policy responses'],
            outcomes: ['ECO-12-04', 'ECO-12-05', 'ECO-12-06', 'ECO-12-10'],
          },
        ],
      },
      {
        label: 'Section IV',
        marks: 20,
        format: 'Choose one extended response',
        items: [
          {
            title: 'Policy mix essay',
            prompt:
              'Evaluate the effectiveness of monetary, fiscal and microeconomic policies in managing inflation and sustaining economic growth in Australia.',
            planningFrame: ['Define policy objectives', 'Analyse each policy with transmission channels', 'Discuss conflicts between inflation, growth and employment', 'Judge effectiveness using timing, targeting and constraints'],
            outcomes: ['ECO-12-04', 'ECO-12-06', 'ECO-12-07', 'ECO-12-10'],
          },
          {
            title: 'Globalisation essay',
            prompt:
              'Assess the impact of globalisation on economic growth, development and distribution of income in the global economy.',
            planningFrame: ['Define globalisation', 'Analyse trade, investment, finance and technology channels', 'Use country examples', 'Evaluate benefits, costs and policy responses'],
            outcomes: ['ECO-12-03', 'ECO-12-04', 'ECO-12-05', 'ECO-12-10'],
          },
        ],
      },
    ],
    markerBrief: [
      'Reward explicit links between stimulus evidence and economic theory.',
      'For essays, high-range responses need sustained judgement rather than topic summaries.',
      'For short answers, allocate marks to the action verb: identify, explain, analyse and assess require different depth.',
    ],
  }),
  makeExamPracticePack({
    id: 'eco-hsc-2025-syllabus-readiness-pack',
    title: 'New syllabus readiness pack: Economics 11-12 (2025)',
    syllabus: 'Economics 11-12 Syllabus (2025)',
    audience: 'Year 11 from 2027 and Year 12 from Term 4 2027, preparing for the first new-syllabus HSC exam in 2028',
    totalMarks: 100,
    time: '3 hours plus 10 minutes reading time',
    description:
      'A new-syllabus paper-style workout using the official 2025 focus areas: Year 11 microeconomic foundations and Year 12 macroeconomic issues, management and global connections.',
    transitionNote:
      'Use this pack for new-syllabus readiness, especially when planning from 2026 and teaching Year 11 from 2027.',
    sourceLinks: [
      { title: 'Economics 11-12 Syllabus (2025) overview', url: `${officialBase}/overview` },
      { title: 'Economics 11-12 Syllabus (2025) content', url: `${officialBase}/content` },
      { title: 'Economics 11-12 Syllabus (2025) assessment', url: `${officialBase}/assessment` },
      { title: 'Official Economics HSC exam papers archive', url: hscExamPapersUrl },
    ],
    sections: [
      {
        label: 'Section I',
        marks: 20,
        format: '20 objective-response questions',
        itemCount: 20,
        sampleItems: [
          {
            stem: 'Which statement best describes the economic problem?',
            options: ['Resources are scarce while wants are unlimited', 'All goods are free in competitive markets', 'Governments can remove opportunity cost', 'Specialisation prevents trade-offs'],
            answer: 'A',
            explanation: 'The economic problem arises from scarcity and choice.',
            outcomes: ['ECO-11-01', 'ECO-11-10'],
          },
          {
            stem: 'A point inside a production possibilities curve indicates:',
            options: ['unattainable output', 'productive inefficiency', 'maximum output with current resources', 'a complete absence of scarcity'],
            answer: 'B',
            explanation: 'Points inside the curve show underused resources.',
            outcomes: ['ECO-11-08', 'ECO-11-09'],
          },
          {
            stem: 'A rise in the price of a substitute good will usually shift demand for the original good:',
            options: ['left', 'right', 'nowhere with certainty', 'down along the same curve'],
            answer: 'B',
            explanation: 'Consumers may switch toward the original good when a substitute becomes more expensive.',
            outcomes: ['ECO-11-03'],
          },
          {
            stem: 'Which situation is most likely to create market failure?',
            options: ['A negative externality from production', 'A perfectly informed buyer and seller', 'Many firms selling identical products', 'No spillover costs or benefits'],
            answer: 'A',
            explanation: 'Negative externalities mean private decisions impose costs on third parties.',
            outcomes: ['ECO-11-04', 'ECO-11-07'],
          },
          {
            stem: 'If household saving rises sharply, the immediate effect in the circular flow is a larger:',
            options: ['injection', 'leakage', 'export receipt', 'equity issue'],
            answer: 'B',
            explanation: 'Saving withdraws income from immediate spending in the circular flow.',
            outcomes: ['ECO-11-02', 'ECO-11-04'],
          },
          {
            stem: 'Which policy most directly affects aggregate demand through borrowing costs?',
            options: ['Monetary policy', 'Competition policy', 'Environmental regulation only', 'Trade liberalisation only'],
            answer: 'A',
            explanation: 'Monetary policy affects interest rates, credit and spending.',
            outcomes: ['ECO-12-06'],
          },
          {
            stem: 'A fall in labour productivity growth can make inflation harder to control because it:',
            options: ['reduces unit costs automatically', 'limits growth in productive capacity', 'guarantees lower wages', 'eliminates aggregate demand'],
            answer: 'B',
            explanation: 'Weak productivity limits aggregate supply and can increase cost pressure.',
            outcomes: ['ECO-12-04', 'ECO-12-06'],
          },
          {
            stem: 'A global fall in commodity demand is most likely to reduce Australia\'s:',
            options: ['export revenue and terms of trade', 'scarcity', 'opportunity cost', 'need for economic management'],
            answer: 'A',
            explanation: 'Commodity demand affects export prices, export revenue and national income.',
            outcomes: ['ECO-12-03', 'ECO-12-08'],
          },
          {
            stem: 'If a market price is below equilibrium, the most likely result is:',
            options: ['a shortage', 'a surplus', 'no consumer response', 'productive efficiency with certainty'],
            answer: 'A',
            explanation: 'When price is below equilibrium, quantity demanded exceeds quantity supplied, creating a shortage.',
            outcomes: ['ECO-11-03', 'ECO-11-08'],
          },
          {
            stem: 'Demand for a good is price elastic when:',
            options: ['quantity demanded responds proportionally more than price', 'quantity demanded never changes', 'supply shifts left', 'the good has no substitutes with certainty'],
            answer: 'A',
            explanation: 'Elastic demand means the percentage change in quantity demanded is greater than the percentage change in price.',
            outcomes: ['ECO-11-03', 'ECO-11-09'],
          },
          {
            stem: 'A monopoly is likely to have more market power than a perfectly competitive firm because it:',
            options: ['faces high barriers to entry and limited close competition', 'always produces at zero cost', 'has no influence over price', 'must sell identical products at the market price'],
            answer: 'A',
            explanation: 'Barriers to entry and limited competition allow a monopolist more pricing power.',
            outcomes: ['ECO-11-03', 'ECO-11-05'],
          },
          {
            stem: 'A subsidy for a good with positive externalities is intended to:',
            options: ['increase consumption toward the socially desirable level', 'reduce every form of government spending', 'make demand perfectly inelastic', 'remove scarcity'],
            answer: 'A',
            explanation: 'A subsidy lowers private costs and can increase consumption or production of goods that create wider social benefits.',
            outcomes: ['ECO-11-04', 'ECO-11-07'],
          },
          {
            stem: 'Which example is an injection into the circular flow of income?',
            options: ['Saving', 'Taxation', 'Investment', 'Imports'],
            answer: 'C',
            explanation: 'Investment adds spending to the circular flow, while saving, taxation and imports are leakages.',
            outcomes: ['ECO-11-02', 'ECO-11-04'],
          },
          {
            stem: 'Issuing ordinary shares is best described as:',
            options: ['equity finance', 'a leakage from the circular flow', 'a tariff', 'a transfer payment'],
            answer: 'A',
            explanation: 'Ordinary shares represent ownership claims and are a form of equity finance.',
            outcomes: ['ECO-11-02', 'ECO-11-03'],
          },
          {
            stem: 'A progressive income tax means that:',
            options: ['the average tax rate rises as income rises', 'all households pay the same dollar amount', 'tax revenue must be zero', 'imports are taxed but income is not'],
            answer: 'A',
            explanation: 'A progressive tax system takes a larger average share of income from higher-income earners.',
            outcomes: ['ECO-11-06', 'ECO-11-09'],
          },
          {
            stem: 'Government spending on public infrastructure is most likely to affect the economy by:',
            options: ['adding to aggregate demand and potentially productive capacity', 'removing all private investment', 'guaranteeing no budget impact', 'reducing every household income'],
            answer: 'A',
            explanation: 'Infrastructure spending can raise short-run demand and, if well chosen, support long-run productive capacity.',
            outcomes: ['ECO-11-06', 'ECO-12-06'],
          },
          {
            stem: 'An appreciation of the Australian dollar is most likely to:',
            options: ['make imports cheaper in Australian-dollar terms', 'make exports cheaper for foreign buyers', 'increase import prices automatically', 'eliminate the balance of payments'],
            answer: 'A',
            explanation: 'An appreciation increases the purchasing power of the Australian dollar over foreign currencies, lowering import prices in Australian-dollar terms.',
            outcomes: ['ECO-11-03', 'ECO-11-08'],
          },
          {
            stem: 'Which item is recorded in the balance of payments?',
            options: ['Transactions between residents and non-residents', 'Only household grocery purchases', 'Only state government elections', 'All domestic labour contracts only'],
            answer: 'A',
            explanation: 'The balance of payments records economic transactions between residents of Australia and the rest of the world.',
            outcomes: ['ECO-11-03', 'ECO-11-08'],
          },
          {
            stem: 'Above-target inflation and below-trend growth create difficulty for policymakers because:',
            options: ['policies to reduce inflation can further weaken demand', 'all policies work instantly', 'inflation and unemployment are always unrelated', 'growth cannot be measured'],
            answer: 'A',
            explanation: 'Restrictive policy can reduce inflation pressure but may also slow growth and employment.',
            outcomes: ['ECO-12-04', 'ECO-12-06'],
          },
          {
            stem: 'A skills program can help address structural unemployment mainly by:',
            options: ['improving the match between workers and available jobs', 'reducing every price in the economy', 'removing exchange-rate movements', 'making all demand perfectly elastic'],
            answer: 'A',
            explanation: 'Training and skills programs can reduce mismatch between labour supply and employer demand.',
            outcomes: ['ECO-12-04', 'ECO-12-07'],
          },
        ],
      },
      {
        label: 'Section II',
        marks: 40,
        format: '10 to 12 short-answer items, including one item worth 6 to 8 marks',
        items: [
          {
            title: 'Question 21 - Models, markets and failure',
            marks: 10,
            stimulus:
              'A city faces rising rental prices. New housing approvals are slow, construction costs have risen, and low-income renters report financial stress.',
            parts: [
              {
                marks: 2,
                prompt: 'Identify one demand factor and one supply factor that could explain higher rents.',
                markingGuide: ['Identifies a demand-side factor such as population or income', 'Identifies a supply-side factor such as approvals or costs'],
              },
              {
                marks: 3,
                prompt: 'Explain how higher construction costs affect market equilibrium.',
                markingGuide: ['Links costs to a leftward supply shift', 'Explains higher equilibrium price', 'Explains lower equilibrium quantity or slower expansion'],
              },
              {
                marks: 5,
                prompt: 'Analyse why government intervention in the housing market may involve trade-offs.',
                markingGuide: ['Identifies an intervention such as subsidies, zoning reform or public housing', 'Explains intended benefit', 'Explains opportunity cost or unintended incentive effect', 'Uses the stimulus', 'Makes a balanced judgement'],
              },
            ],
            outcomes: ['ECO-11-03', 'ECO-11-04', 'ECO-11-07', 'ECO-11-08', 'ECO-11-10'],
          },
          {
            title: 'Question 22 - Sectors and financial flows',
            marks: 10,
            stimulus:
              'Households increase deposits, business credit growth slows, and the government funds infrastructure through bond issuance.',
            parts: [
              {
                marks: 2,
                prompt: 'Identify the financial-market instrument used by the government.',
                markingGuide: ['Identifies bonds', 'Recognises the instrument as debt finance'],
              },
              {
                marks: 4,
                prompt: 'Explain how the financial sector links household saving with business or government borrowing.',
                markingGuide: ['Explains intermediation or direct finance', 'Links deposits or savings to lending/funding', 'Uses the stimulus', 'Uses sector language'],
              },
              {
                marks: 4,
                prompt: 'Analyse how slower business credit growth could affect the circular flow of income.',
                markingGuide: ['Links credit to investment', 'Explains investment as an injection', 'Explains effects on output, income or employment', 'Uses circular-flow reasoning'],
              },
            ],
            outcomes: ['ECO-11-02', 'ECO-11-03', 'ECO-11-04', 'ECO-11-08', 'ECO-11-10'],
          },
          {
            title: 'Question 23 - Australian economic issues',
            marks: 10,
            stimulus:
              'GDP growth is below trend, CPI inflation is above target, underemployment has risen, and emissions from energy use are falling slowly.',
            parts: [
              {
                marks: 2,
                prompt: 'Identify two economic issues shown in the stimulus.',
                markingGuide: ['Identifies growth, inflation, labour underutilisation or environmental sustainability', 'Uses appropriate economic terms'],
              },
              {
                marks: 3,
                prompt: 'Explain one consequence of rising underemployment.',
                markingGuide: ['Defines or describes underemployment', 'Links to household income or living standards', 'Links to productive capacity or demand'],
              },
              {
                marks: 5,
                prompt: 'Analyse the tension between reducing inflation and supporting economic growth.',
                markingGuide: ['Explains restrictive policy pressure from inflation', 'Explains growth or employment risk', 'Uses stimulus evidence', 'Explains trade-off clearly', 'Provides a supported judgement'],
              },
            ],
            outcomes: ['ECO-12-04', 'ECO-12-05', 'ECO-12-06', 'ECO-12-08', 'ECO-12-10'],
          },
          {
            title: 'Question 24 - Policy and global connections',
            marks: 10,
            stimulus:
              'A global slowdown reduces export demand. The exchange rate depreciates, monetary policy is restrictive, and fiscal policy funds targeted skills programs.',
            parts: [
              {
                marks: 2,
                prompt: 'Identify two transmission channels from the global slowdown to Australia.',
                markingGuide: ['Identifies exports, exchange rate, confidence, investment or income channel', 'Uses stimulus evidence'],
              },
              {
                marks: 4,
                prompt: 'Explain how targeted skills programs could support economic adjustment.',
                markingGuide: ['Links skills to structural change', 'Explains labour mobility or productivity effects', 'Uses policy language', 'Recognises time lags'],
              },
              {
                marks: 4,
                prompt: 'Assess whether a depreciation would fully offset weaker global demand.',
                markingGuide: ['Explains competitiveness benefit', 'Explains limits from weak demand or import-price effects', 'Uses the stimulus', 'Makes a reasoned assessment'],
              },
            ],
            outcomes: ['ECO-12-03', 'ECO-12-06', 'ECO-12-07', 'ECO-12-08', 'ECO-12-10'],
          },
        ],
      },
      {
        label: 'Section III',
        marks: 20,
        format: 'Choose one stimulus-based extended response',
        items: [
          {
            title: 'Australian economic issues stimulus essay',
            stimulus:
              'Inflation is above target, underemployment rises, GDP growth slows, and household real income falls. Business investment remains weak.',
            prompt:
              'Evaluate the causes and consequences of current economic issues in the Australian economy.',
            planningFrame: ['Prioritise two or three issues', 'Link data to households, firms and government', 'Explain interactions between issues', 'Judge short-run and long-run consequences'],
            outcomes: ['ECO-12-04', 'ECO-12-05', 'ECO-12-08', 'ECO-12-10'],
          },
          {
            title: 'Australia and the global economy stimulus essay',
            stimulus:
              'Trading-partner growth slows, commodity prices fall, net foreign liabilities remain high, and the exchange rate depreciates.',
            prompt:
              'Evaluate the impact of global economic conditions on Australia\'s economic performance.',
            planningFrame: ['Define global transmission channels', 'Analyse trade, finance, exchange-rate and confidence effects', 'Use stimulus data', 'Judge resilience and vulnerability'],
            outcomes: ['ECO-12-03', 'ECO-12-04', 'ECO-12-06', 'ECO-12-08', 'ECO-12-10'],
          },
        ],
      },
      {
        label: 'Section IV',
        marks: 20,
        format: 'Choose one extended response',
        items: [
          {
            title: 'Economic management essay',
            prompt:
              'Evaluate the effectiveness of the policy mix used to manage inflation, unemployment and sustainable economic growth in Australia.',
            planningFrame: ['Define objectives and policy mix', 'Analyse monetary, fiscal and supply-side policies', 'Address conflicts and constraints', 'Make an evidence-based judgement'],
            outcomes: ['ECO-12-04', 'ECO-12-06', 'ECO-12-07', 'ECO-12-10'],
          },
          {
            title: 'Globalisation and Australia essay',
            prompt:
              'Assess the effects of globalisation on Australian households, businesses and government decision-making.',
            planningFrame: ['Define globalisation', 'Analyse trade, capital, technology and labour channels', 'Consider benefits and adjustment costs', 'Judge policy responses'],
            outcomes: ['ECO-12-02', 'ECO-12-03', 'ECO-12-05', 'ECO-12-06', 'ECO-12-10'],
          },
        ],
      },
    ],
    markerBrief: [
      'Reward integrated answers that move across sectors and policy perspectives.',
      'For new-syllabus responses, look for explicit use of the focus-area language and ECO-12 outcome skills.',
      'The strongest students should evaluate effectiveness, not only describe causes or policies.',
    ],
  }),
];

export const economicsResourceLibrary = {
  subject: 'Economics',
  stage: 'Stage 6',
  syllabusName: 'Economics 11-12 Syllabus (2025)',
  syllabusCode: 'economics_11_12_2025',
  implementationNote:
    'The official NSW Economics 11-12 (2025) syllabus is the new structure, implemented from 2027. During transition, Year 12 HSC students may still be examined under the 2009 Stage 6 syllabus.',
  officialSources: [
    {
      title: 'NESA NSW Curriculum - Economics 11-12 (2025) overview',
      url: `${officialBase}/overview`,
      note: 'Used for official course structure, implementation note and focus-area sequence.',
    },
    {
      title: 'NESA NSW Curriculum - Economics 11-12 (2025) outcomes',
      url: `${officialBase}/outcomes`,
      note: 'Used for official outcome codes and descriptions.',
    },
    {
      title: 'NESA NSW Curriculum - Economics 11-12 (2025) content',
      url: `${officialBase}/content`,
      note: 'Used for official focus areas and content-group headings.',
    },
    {
      title: 'NESA NSW Curriculum - Economics 11-12 (2025) assessment',
      url: `${officialBase}/assessment`,
      note: 'Used for exam structure, school-based assessment components and task weighting.',
    },
    {
      title: 'NESA NSW Government - Economics Stage 6 Syllabus (2009)',
      url: legacySyllabusUrl,
      note: 'Used for transition support because Year 12 continues this syllabus during the 2027 implementation year.',
    },
    {
      title: 'NESA NSW Government - Assessment and reporting in Economics',
      url: legacyAssessmentUrl,
      note: 'Used for the current HSC exam specifications, including sections, marks and reading time.',
    },
    {
      title: 'NESA NSW Government - Economics HSC exam papers',
      url: hscExamPapersUrl,
      note: 'Linked as the official archive of past exam papers, marking guidelines and marking feedback.',
    },
    {
      title: 'NESA NSW Government - Economics HSC standards materials',
      url: hscStandardsUrl,
      note: 'Linked for official standards material and response-quality calibration.',
    },
  ],
  assessmentBlueprint: {
    externalExam: {
      totalMarks: 100,
      time: '3 hours plus 10 minutes reading time',
      sections: [
        { label: 'Section I', marks: 20, format: 'Objective-response questions' },
        { label: 'Section II', marks: 40, format: '10 to 12 short-answer items, with one item worth 6 to 8 marks' },
        { label: 'Section III', marks: 20, format: 'Choice of one stimulus-based extended response' },
        { label: 'Section IV', marks: 20, format: 'Choice of one extended response' },
      ],
    },
    schoolAssessmentComponents: [
      { component: 'Knowledge and understanding of course content', weighting: 50 },
      { component: 'Skills in the interpretation and analysis of stimulus', weighting: 30 },
      { component: 'Communication of economic information, ideas and issues in appropriate forms', weighting: 20 },
    ],
    samplePrograms: [
      'Year 11 sample program: 3 formal tasks including a formal written examination; individual tasks weighted 20% to 40%.',
      'Year 12 sample program: 4 formal tasks including a formal written examination; individual tasks weighted 10% to 40%.',
    ],
  },
  examPracticePacks: economicsExamPracticePacks,
  focusAreas: [
    {
      id: 'year-11-introduction-to-economics',
      year: 11,
      hours: 25,
      title: 'Introduction to economics',
      focus: 'Microeconomic foundations',
      description:
        'Foundation models for scarcity, choice, opportunity cost, production possibilities, circular flow and the business cycle.',
      contentGroups: [
        'Economic thinking',
        'Operation of an economy',
        'Economic model: production possibilities',
        'Economic model: circular flow of income',
        'Economic model: business cycle',
      ],
      outcomes: ['ECO-11-01', 'ECO-11-02', 'ECO-11-04', 'ECO-11-09', 'ECO-11-10'],
      sourceUrl: `${officialBase}/content/year-11/fa2593734b`,
      resources: [
        makeMultipleChoice(
          'eco11-intro-mcq-1',
          'A student gives up two hours of paid work to study for an Economics assessment. What is the opportunity cost?',
          [
            'The total value of the assessment mark',
            'The wage and alternative use of time forgone',
            'The price of the textbook used for study',
            'The amount of scarcity in the economy',
          ],
          'B',
          'Opportunity cost is the value of the next best alternative forgone, not every cost associated with the decision.',
          ['ECO-11-01'],
          'Core concept'
        ),
        makeMultipleChoice(
          'eco11-intro-mcq-2',
          'On a production possibilities curve, a movement from inside the curve to a point on the curve most directly shows:',
          [
            'a fall in productive capacity',
            'better use of existing resources',
            'a change in consumer preferences only',
            'a movement from equity to inequality',
          ],
          'B',
          'Points inside the curve indicate unemployed or underused resources. Moving to the curve shows improved efficiency.',
          ['ECO-11-08', 'ECO-11-09'],
          'Diagram reasoning'
        ),
        makeShortAnswer(
          'eco11-intro-sa-1',
          4,
          'Explain how the production possibilities model can be used to show scarcity and economic choice.',
          'A local council can allocate land to either public housing or parkland. It cannot fully satisfy both community demands with the available land.',
          [
            'Defines scarcity and links it to limited resources and unlimited wants',
            'Explains that choosing one output requires forgoing another output',
            'Uses the curve to distinguish efficient, inefficient and unattainable combinations',
            'Applies the model to the land-use stimulus',
          ],
          'The production possibilities model shows the maximum combinations of two outputs that can be produced with available resources. Scarcity means the council cannot fully satisfy all wants, so more land for public housing means less land for parkland. A point on the curve is productively efficient, a point inside it shows underuse, and a point beyond it is unattainable with current resources.',
          ['ECO-11-01', 'ECO-11-08', 'ECO-11-10']
        ),
        makeShortAnswer(
          'eco11-intro-sa-2',
          5,
          'Analyse how leakages and injections affect the circular flow of income.',
          'Household saving rises while government infrastructure spending also rises.',
          [
            'Identifies saving as a leakage from the circular flow',
            'Identifies government spending as an injection',
            'Explains how leakages reduce income flowing to firms unless offset',
            'Analyses the net effect when injections exceed, equal or fall below leakages',
            'Uses precise circular-flow terminology',
          ],
          'Saving is a leakage because income earned by households is not immediately spent on goods and services. Government infrastructure spending is an injection because it adds demand and income to the flow. If the spending injection exceeds the saving leakage, aggregate income may rise; if it only offsets the leakage, the circular flow is stabilised. The final effect depends on the relative size of the two flows and multiplier effects.',
          ['ECO-11-02', 'ECO-11-04', 'ECO-11-10'],
          'Applied analysis'
        ),
        makeExtendedResponse(
          'eco11-intro-er-1',
          'Evaluate the usefulness of economic models in explaining how societies allocate scarce resources.',
          [
            'Define scarcity, choice, opportunity cost and allocation',
            'Use production possibilities to explain trade-offs, efficiency and growth',
            'Use circular flow to explain sector interdependence',
            'Use the business cycle to explain changes in output and employment',
            'Judge usefulness by weighing clarity against simplification',
          ],
          'Economic models are highly useful because they simplify complex decisions into clear cause-effect relationships, but they must be applied carefully because real economies include behavioural, institutional and distributional factors that models only partially capture.',
          ['ECO-11-01', 'ECO-11-02', 'ECO-11-08', 'ECO-11-10']
        ),
      ],
      teacherNotes: [
        'Use this focus area as the diagnostic entry point for Caplet Mark because every later answer depends on accurate terminology and model use.',
        'Require students to explain diagrams in words rather than only draw them.',
      ],
    },
    {
      id: 'year-11-markets',
      year: 11,
      hours: 35,
      title: 'Markets',
      focus: 'Demand, supply and market failure',
      description:
        'Market operation, equilibrium, elasticity, competition, seller structures, market failure and government intervention.',
      contentGroups: [
        'Role of markets',
        'Demand',
        'Supply',
        'Market equilibrium',
        'Price elasticity of demand',
        'Price elasticity of supply',
        'Market structures and competition for sellers',
        'Nature and types of market failure',
        'Government intervention in market failures',
      ],
      outcomes: ['ECO-11-01', 'ECO-11-03', 'ECO-11-04', 'ECO-11-05', 'ECO-11-07', 'ECO-11-08', 'ECO-11-09', 'ECO-11-10'],
      sourceUrl: `${officialBase}/content/year-11/fa2593734b`,
      resources: [
        makeMultipleChoice(
          'eco11-markets-mcq-1',
          'If demand for electric vehicles increases while supply is unchanged, the most likely immediate market outcome is:',
          [
            'lower equilibrium price and higher quantity',
            'higher equilibrium price and higher quantity',
            'higher equilibrium price and lower quantity',
            'lower equilibrium price and lower quantity',
          ],
          'B',
          'An increase in demand shifts the demand curve right, raising both equilibrium price and quantity when supply is unchanged.',
          ['ECO-11-03', 'ECO-11-08'],
          'Demand and supply'
        ),
        makeMultipleChoice(
          'eco11-markets-mcq-2',
          'Which policy is most directly designed to correct a negative externality from pollution?',
          [
            'A subsidy for polluting firms',
            'A tax based on pollution emissions',
            'A removal of product safety regulation',
            'A fall in the cash rate',
          ],
          'B',
          'A pollution tax internalises part of the external cost, encouraging firms and consumers to reduce the activity causing the externality.',
          ['ECO-11-04', 'ECO-11-07'],
          'Market failure'
        ),
        makeShortAnswer(
          'eco11-markets-sa-1',
          5,
          'Analyse the effect of a binding price ceiling in a rental housing market.',
          'Assume the government sets a maximum rent below the market equilibrium price.',
          [
            'Identifies a price ceiling as a maximum legal price',
            'Explains that a binding ceiling below equilibrium increases quantity demanded',
            'Explains that it reduces quantity supplied',
            'Analyses the resulting shortage and non-price rationing',
            'Recognises possible equity aims and efficiency costs',
          ],
          'A binding price ceiling keeps rent below the equilibrium price. At the lower price, more tenants demand rental properties, but landlords supply fewer properties because expected returns fall. The result is excess demand or a shortage. While the policy may improve affordability for tenants who secure housing, it can reduce allocative efficiency and create non-price rationing such as waiting lists or lower dwelling quality.',
          ['ECO-11-03', 'ECO-11-04', 'ECO-11-05', 'ECO-11-10']
        ),
        makeShortAnswer(
          'eco11-markets-sa-2',
          4,
          'Explain why goods with few substitutes usually have relatively price inelastic demand.',
          '',
          [
            'Defines price elasticity of demand',
            'Links substitutes to consumer responsiveness',
            'Explains why necessity or habit can reduce responsiveness',
            'Uses an example to support the explanation',
          ],
          'Price elasticity of demand measures how responsive quantity demanded is to a price change. If a good has few substitutes, consumers have fewer alternatives when its price rises, so quantity demanded falls by a smaller proportion. For example, demand for essential medicines is often inelastic because consumers cannot easily switch away from the product.',
          ['ECO-11-01', 'ECO-11-03', 'ECO-11-09'],
          'Core concept'
        ),
        makeExtendedResponse(
          'eco11-markets-er-1',
          'Assess the role of market forces and government intervention in allocating resources efficiently and equitably.',
          [
            'Explain demand, supply and equilibrium as allocation signals',
            'Use elasticity to show different market responses',
            'Analyse at least two market failures, such as externalities and public goods',
            'Evaluate policy tools including taxes, subsidies, regulation and direct provision',
            'Make a judgement about efficiency-equity trade-offs',
          ],
          'Markets are powerful allocation mechanisms because prices coordinate buyer and seller decisions, but government intervention is justified where market outcomes fail to reflect social costs, public benefits or equity goals.',
          ['ECO-11-03', 'ECO-11-04', 'ECO-11-07', 'ECO-11-08', 'ECO-11-10']
        ),
      ],
      teacherNotes: [
        'Require a diagram plus written causality for demand/supply answers.',
        'Use market failure examples that students can link to policy, not just define.',
      ],
    },
    {
      id: 'year-11-household-business-sector',
      year: 11,
      hours: 15,
      title: 'Household and business sector',
      focus: 'Sector interdependence',
      description:
        'Households as consumers and labour suppliers; businesses as producers, income generators and decision-makers.',
      contentGroups: [
        'Households: the consumption of goods and services',
        'Households: the provision of labour',
        'Businesses: production of goods and services',
        'Businesses: the provision of income',
      ],
      outcomes: ['ECO-11-01', 'ECO-11-02', 'ECO-11-03', 'ECO-11-04', 'ECO-11-05', 'ECO-11-08', 'ECO-11-10'],
      sourceUrl: `${officialBase}/content/year-11/fa2593734b`,
      resources: [
        makeMultipleChoice(
          'eco11-hb-mcq-1',
          'An increase in household confidence is most likely to first increase:',
          ['saving only', 'consumption spending', 'company tax rates', 'labour productivity automatically'],
          'B',
          'Higher confidence usually raises willingness to spend, increasing consumption demand before any automatic productivity effect.',
          ['ECO-11-02', 'ECO-11-04'],
          'Sector behaviour'
        ),
        makeMultipleChoice(
          'eco11-hb-mcq-2',
          'Which flow best represents businesses providing income to households?',
          ['exports', 'wages and dividends', 'imports', 'indirect taxes'],
          'B',
          'Businesses provide income to households through wages, salaries, rent, interest and profits/dividends.',
          ['ECO-11-02'],
          'Circular flow'
        ),
        makeShortAnswer(
          'eco11-hb-sa-1',
          5,
          'Analyse how a fall in household consumption can affect business production and employment.',
          'Retail sales fall for three consecutive months after a decline in consumer confidence.',
          [
            'Identifies consumption as a major source of demand for firms',
            'Explains how lower sales can reduce revenue and inventories may rise',
            'Analyses production and employment responses',
            'Links effects back to household income and the circular flow',
            'Uses stimulus details',
          ],
          'A fall in consumption reduces business revenue because households are buying fewer goods and services. Firms may respond by reducing production, delaying investment and cutting labour hours or employment. This reduces household income, which can further weaken consumption through the circular flow. The retail-sales stimulus suggests the shock is persistent, increasing the chance that firms adjust output rather than treating it as temporary.',
          ['ECO-11-02', 'ECO-11-04', 'ECO-11-08', 'ECO-11-10']
        ),
        makeShortAnswer(
          'eco11-hb-sa-2',
          4,
          'Explain two factors that influence a business decision to expand production.',
          '',
          [
            'Identifies two relevant factors such as demand, costs, productivity, interest rates or expectations',
            'Explains how each factor changes expected profitability',
            'Uses accurate business-sector terminology',
            'Shows cause and effect rather than listing factors only',
          ],
          'A business may expand production if demand is rising because higher expected sales can increase revenue and profit. It may also expand if productivity improves, since lower unit costs make additional production more profitable. Interest rates, confidence and input costs can also influence whether expansion is financially attractive.',
          ['ECO-11-01', 'ECO-11-02', 'ECO-11-10']
        ),
        makeExtendedResponse(
          'eco11-hb-er-1',
          'Analyse the interdependence of households and businesses in the operation of the Australian economy.',
          [
            'Explain households as consumers and providers of labour',
            'Explain businesses as producers and providers of income',
            'Use circular flow to connect spending, output, income and employment',
            'Analyse how changes in confidence, wages or costs flow between sectors',
            'Conclude with why interdependence matters for economic stability',
          ],
          'Households and businesses are mutually dependent because household spending and labour supply support production, while business wages, profits and output support household income and consumption.',
          ['ECO-11-02', 'ECO-11-04', 'ECO-11-08', 'ECO-11-10']
        ),
      ],
      teacherNotes: ['Strong answers use circular-flow language and avoid treating households and firms as isolated groups.'],
    },
    {
      id: 'year-11-financial-sector',
      year: 11,
      hours: 15,
      title: 'Financial sector',
      focus: 'Savings, investment and capital allocation',
      description:
        'Financial institutions and markets as channels for saving, borrowing, investment, risk transfer and capital raising.',
      contentGroups: ['Role of financial sector', 'Types of financial markets: equity markets', 'Types of financial markets: debt markets'],
      outcomes: ['ECO-11-01', 'ECO-11-02', 'ECO-11-03', 'ECO-11-04', 'ECO-11-05', 'ECO-11-08', 'ECO-11-09', 'ECO-11-10'],
      sourceUrl: `${officialBase}/content/year-11/fa2593734b`,
      resources: [
        makeMultipleChoice(
          'eco11-finance-mcq-1',
          'A company issuing new shares to raise funds is using:',
          ['a secondary debt market', 'an equity market', 'monetary policy', 'a government transfer payment'],
          'B',
          'Shares represent ownership claims, so issuing new shares is capital raising through an equity market.',
          ['ECO-11-01', 'ECO-11-02'],
          'Markets and institutions'
        ),
        makeMultipleChoice(
          'eco11-finance-mcq-2',
          'The main role of financial intermediaries is to:',
          [
            'set all goods prices in the economy',
            'link savers and borrowers by transforming funds and managing risk',
            'replace the need for taxation',
            'guarantee that all investments are profitable',
          ],
          'B',
          'Financial intermediaries pool savings, assess risk and channel funds to borrowers and investors.',
          ['ECO-11-02', 'ECO-11-03'],
          'Core concept'
        ),
        makeShortAnswer(
          'eco11-finance-sa-1',
          5,
          'Analyse how a rise in interest rates can affect households, businesses and financial markets.',
          'Assume variable mortgage rates and business loan rates rise after tighter monetary conditions.',
          [
            'Explains higher debt servicing costs for households',
            'Explains weaker borrowing/investment incentives for businesses',
            'Links higher returns on saving to household choices',
            'Analyses likely asset-price or bond-market effects',
            'Uses stimulus details and sector language',
          ],
          'Higher interest rates increase repayments for households with variable mortgages, reducing disposable income and consumption. Businesses face higher borrowing costs, so some investment projects become less profitable. Savers may receive higher returns, changing portfolio choices. In financial markets, higher rates can reduce the present value of shares and change bond prices as investors reprice risk and return.',
          ['ECO-11-02', 'ECO-11-04', 'ECO-11-08', 'ECO-11-10']
        ),
        makeShortAnswer(
          'eco11-finance-sa-2',
          4,
          'Distinguish between debt finance and equity finance.',
          '',
          [
            'Defines debt finance as borrowing that must be repaid',
            'Defines equity finance as raising funds by selling ownership claims',
            'Identifies a return to lenders or owners',
            'Explains one implication for risk or control',
          ],
          'Debt finance involves borrowing funds, such as issuing bonds or taking a loan, with interest and principal repayment obligations. Equity finance involves selling ownership shares, giving investors a claim on profits and possibly voting rights. Debt can increase repayment risk, while equity can dilute ownership control.',
          ['ECO-11-01', 'ECO-11-02'],
          'Core concept'
        ),
        makeExtendedResponse(
          'eco11-finance-er-1',
          'Assess the importance of the financial sector in supporting economic activity.',
          [
            'Explain the role of financial institutions and markets',
            'Distinguish debt and equity finance',
            'Analyse savings, borrowing, investment and risk allocation',
            'Connect financial conditions to household and business decisions',
            'Judge benefits against risks such as instability or unequal access to finance',
          ],
          'The financial sector is essential because it channels savings into productive investment, but its benefits depend on confidence, regulation and the efficient pricing of risk.',
          ['ECO-11-02', 'ECO-11-03', 'ECO-11-04', 'ECO-11-10']
        ),
      ],
      teacherNotes: ['Good student responses should separate equity and debt markets before discussing broader financial-sector effects.'],
    },
    {
      id: 'year-11-government-sector',
      year: 11,
      hours: 15,
      title: 'Government sector',
      focus: 'Taxation, spending and public intervention',
      description:
        'Government revenue, expenditure, redistribution, stabilisation and intervention in economic outcomes.',
      contentGroups: ['Role of government', 'Taxation', 'Government spending'],
      outcomes: ['ECO-11-01', 'ECO-11-02', 'ECO-11-04', 'ECO-11-05', 'ECO-11-06', 'ECO-11-07', 'ECO-11-08', 'ECO-11-10'],
      sourceUrl: `${officialBase}/content/year-11/fa2593734b`,
      resources: [
        makeMultipleChoice(
          'eco11-government-mcq-1',
          'Which example is most clearly a transfer payment?',
          ['A public hospital purchase of equipment', 'An unemployment benefit', 'A company tax payment', 'A tariff on imported goods'],
          'B',
          'A transfer payment redistributes income without the government receiving a current good or service in exchange.',
          ['ECO-11-01', 'ECO-11-06'],
          'Fiscal vocabulary'
        ),
        makeMultipleChoice(
          'eco11-government-mcq-2',
          'A progressive income tax system is designed so that:',
          [
            'all taxpayers pay the same dollar amount',
            'average tax rates rise as income rises',
            'only businesses pay tax',
            'tax revenue never changes over the business cycle',
          ],
          'B',
          'Progressive taxes take a larger average share of income as income increases.',
          ['ECO-11-06', 'ECO-11-09'],
          'Taxation'
        ),
        makeShortAnswer(
          'eco11-government-sa-1',
          5,
          'Explain how taxation and government spending can influence income distribution.',
          '',
          [
            'Explains progressive taxation or targeted taxes',
            'Explains transfer payments or public services',
            'Links policy to redistribution of income or access to services',
            'Recognises trade-offs such as incentives or budget cost',
            'Uses accurate fiscal terminology',
          ],
          'Progressive taxation can reduce disposable income inequality by collecting a larger average share from higher-income earners. Government spending can redistribute through transfer payments, public health, education and housing support. These policies may improve equity and access to opportunity, although they involve budget costs and can affect incentives depending on design.',
          ['ECO-11-05', 'ECO-11-06', 'ECO-11-07', 'ECO-11-10']
        ),
        makeShortAnswer(
          'eco11-government-sa-2',
          4,
          'Describe two reasons why government may intervene in an economy.',
          '',
          [
            'Identifies two reasons such as market failure, equity, stabilisation or public goods',
            'Explains each reason with economic logic',
            'Uses one example for each reason or a strong shared example',
            'Avoids vague statements about government helping people',
          ],
          'Government may intervene to correct market failure, such as taxing pollution when private market prices do not reflect environmental costs. It may also intervene to improve equity, for example through income support or public education. Other reasons include stabilising the business cycle and providing public goods.',
          ['ECO-11-04', 'ECO-11-06', 'ECO-11-07']
        ),
        makeExtendedResponse(
          'eco11-government-er-1',
          'Evaluate the role of government in improving economic outcomes.',
          [
            'Define government intervention and economic outcomes',
            'Analyse taxation, spending and regulation',
            'Use examples for equity, efficiency and stabilisation',
            'Discuss policy limits such as incentives, debt and implementation lags',
            'Make a balanced judgement on effectiveness',
          ],
          'Government can improve outcomes where markets underprovide socially valuable goods or produce inequitable results, but policy design matters because intervention can create costs, distortions and trade-offs.',
          ['ECO-11-04', 'ECO-11-05', 'ECO-11-06', 'ECO-11-07', 'ECO-11-10']
        ),
      ],
      teacherNotes: ['Push students to evaluate policy trade-offs instead of writing one-sided pro-government or anti-government answers.'],
    },
    {
      id: 'year-11-international-sector',
      year: 11,
      hours: 15,
      title: 'International sector',
      focus: 'Trade, capital flows and exchange rates',
      description:
        'International trade, investment, exchange rates, balance of payments and links between Australia and the global economy.',
      contentGroups: ['International trade', 'International investment', 'Exchange rates', 'Balance of payments'],
      outcomes: ['ECO-11-01', 'ECO-11-02', 'ECO-11-03', 'ECO-11-05', 'ECO-11-08', 'ECO-11-09', 'ECO-11-10'],
      sourceUrl: `${officialBase}/content/year-11/fa2593734b`,
      resources: [
        makeMultipleChoice(
          'eco11-international-mcq-1',
          'A depreciation of the Australian dollar is most likely to:',
          [
            'make Australian exports cheaper for foreign buyers',
            'make imports cheaper for Australian consumers',
            'reduce all export volumes immediately to zero',
            'remove the need for international trade',
          ],
          'A',
          'A lower Australian dollar reduces the foreign-currency price of Australian exports, improving price competitiveness if other factors are unchanged.',
          ['ECO-11-03', 'ECO-11-09'],
          'Exchange rates'
        ),
        makeMultipleChoice(
          'eco11-international-mcq-2',
          'Which transaction is recorded as a credit in the current account?',
          ['Australian households buying imported cars', 'Foreign tourists buying services in Australia', 'Australian firms buying foreign assets', 'Australians paying income to foreign investors'],
          'B',
          'Exports of services, including tourism services sold to foreigners, are credits in the current account.',
          ['ECO-11-01', 'ECO-11-09'],
          'Balance of payments'
        ),
        makeShortAnswer(
          'eco11-international-sa-1',
          5,
          'Analyse how an exchange rate depreciation can affect inflation and economic activity.',
          '',
          [
            'Explains export competitiveness and import price effects',
            'Links export demand to production, income or employment',
            'Explains imported inflation through higher import prices',
            'Recognises time lags and elasticity conditions',
            'Uses accurate exchange-rate terminology',
          ],
          'A depreciation can increase export competitiveness because foreign buyers pay less in their own currency for Australian goods. This may raise demand, output and employment in export industries. However, imports become more expensive in Australian dollars, raising costs for firms and prices for households. The final effect depends on demand elasticities, spare capacity and how quickly firms pass on higher import costs.',
          ['ECO-11-03', 'ECO-11-04', 'ECO-11-08', 'ECO-11-10']
        ),
        makeShortAnswer(
          'eco11-international-sa-2',
          4,
          'Explain the difference between international trade and international investment.',
          '',
          [
            'Defines international trade as exchange of goods and services',
            'Defines international investment as cross-border ownership or lending of capital',
            'Uses one example of each',
            'Links both to flows between Australia and the global economy',
          ],
          'International trade is the exchange of goods and services across borders, such as Australia exporting education services. International investment is the movement of capital across borders, such as a foreign company buying equity in an Australian mining project or lending to an Australian firm.',
          ['ECO-11-01', 'ECO-11-02', 'ECO-11-10']
        ),
        makeExtendedResponse(
          'eco11-international-er-1',
          'Analyse the effects of international trade and investment on the Australian economy.',
          [
            'Explain trade flows, investment flows and exchange rates',
            'Analyse benefits such as specialisation, scale and capital access',
            'Analyse risks such as external shocks and structural adjustment',
            'Use balance of payments language where relevant',
            'Reach a judgement about net effects and conditions',
          ],
          'International trade and investment expand economic opportunities by increasing market access and capital flows, but they also expose Australia to exchange-rate volatility, global shocks and adjustment pressures.',
          ['ECO-11-02', 'ECO-11-03', 'ECO-11-08', 'ECO-11-10']
        ),
      ],
      teacherNotes: ['This topic is the bridge into Year 12 global economy work; tag strong answers for later Caplet Mark exemplar use.'],
    },
    {
      id: 'year-12-economic-issues',
      year: 12,
      hours: 45,
      title: 'Economic issues in the Australian economy',
      focus: 'Macroeconomic problems and indicators',
      description:
        'Economic growth, employment, inflation, inequality and environmental sustainability as connected macroeconomic issues.',
      contentGroups: ['Economic growth', 'Employment and unemployment', 'Inflation', 'Inequality', 'Environmental sustainability'],
      outcomes: ['ECO-12-01', 'ECO-12-02', 'ECO-12-03', 'ECO-12-04', 'ECO-12-05', 'ECO-12-08', 'ECO-12-09', 'ECO-12-10'],
      sourceUrl: `${officialBase}/content/year-12/fa32ce3c4b`,
      resources: [
        makeMultipleChoice(
          'eco12-issues-mcq-1',
          'If real GDP rises while population rises faster, then real GDP per capita will:',
          ['rise', 'fall', 'remain unchanged by definition', 'equal nominal GDP'],
          'B',
          'Real GDP per capita measures real output per person. If population grows faster than real GDP, output per person falls.',
          ['ECO-12-08', 'ECO-12-09'],
          'Data literacy'
        ),
        makeMultipleChoice(
          'eco12-issues-mcq-2',
          'Cost-push inflation is most likely caused by:',
          ['falling input costs', 'a rise in production costs across firms', 'a fall in aggregate demand only', 'a budget surplus'],
          'B',
          'Cost-push inflation occurs when higher production costs shift aggregate supply inward, raising prices.',
          ['ECO-12-04', 'ECO-12-09'],
          'Inflation'
        ),
        makeShortAnswer(
          'eco12-issues-sa-1',
          6,
          'Analyse the relationship between economic growth and unemployment.',
          'An economy records two quarters of weak growth while job vacancies fall and underemployment rises.',
          [
            'Defines economic growth and unemployment/underemployment',
            'Explains derived demand for labour',
            'Analyses cyclical unemployment during weak growth',
            'Recognises productivity or structural factors can complicate the relationship',
            'Uses stimulus evidence',
            'Communicates with clear macroeconomic causality',
          ],
          'Economic growth increases demand for goods and services, so firms usually require more labour to expand output. When growth weakens, the derived demand for labour falls, vacancies decline and cyclical unemployment or underemployment can rise. The stimulus indicates weaker labour demand through falling vacancies and higher underemployment. However, productivity changes, labour-market flexibility and structural mismatch can weaken the short-run relationship.',
          ['ECO-12-04', 'ECO-12-08', 'ECO-12-10'],
          'HSC short answer'
        ),
        makeShortAnswer(
          'eco12-issues-sa-2',
          5,
          'Explain two economic costs of high inflation.',
          '',
          [
            'Identifies two costs such as reduced purchasing power, uncertainty, redistribution or external competitiveness',
            'Explains each cost with cause-effect logic',
            'Uses macroeconomic terminology',
            'Links one cost to households, firms or external stability',
            'Avoids simply saying prices rise',
          ],
          'High inflation reduces purchasing power when nominal incomes do not keep pace with prices. It can also increase uncertainty for firms, making investment decisions harder because future costs and prices are less predictable. If domestic inflation is higher than trading partners, exports may become less competitive, worsening external performance.',
          ['ECO-12-04', 'ECO-12-05', 'ECO-12-10']
        ),
        makeExtendedResponse(
          'eco12-issues-er-1',
          'Evaluate the consequences of inflation and unemployment for the Australian economy.',
          [
            'Define both issues and relevant indicators',
            'Analyse household, business and government consequences',
            'Explain short-run trade-offs and possible long-run compatibility',
            'Use examples of demand-side and supply-side causes',
            'Judge which issue is more damaging under different economic conditions',
          ],
          'Inflation and unemployment both reduce economic wellbeing, but their relative seriousness depends on whether the economy faces excess demand, supply shocks or weak aggregate demand.',
          ['ECO-12-04', 'ECO-12-05', 'ECO-12-08', 'ECO-12-10']
        ),
      ],
      teacherNotes: ['Ask students to anchor essays in indicators, then move to consequences and policy implications.'],
    },
    {
      id: 'year-12-economic-management',
      year: 12,
      hours: 45,
      title: 'Economic management of the Australian economy',
      focus: 'Policy objectives and policy mix',
      description:
        'Economic objectives, fiscal policy, monetary policy, microeconomic policy, labour market policy, environmental policy and the policy mix.',
      contentGroups: [
        'Economic objectives',
        'Fiscal policy',
        'Monetary policy',
        'Microeconomic policy',
        'Labour market policy',
        'Environmental policy',
        'Policy mix',
      ],
      outcomes: ['ECO-12-01', 'ECO-12-02', 'ECO-12-03', 'ECO-12-04', 'ECO-12-05', 'ECO-12-06', 'ECO-12-07', 'ECO-12-08', 'ECO-12-09', 'ECO-12-10'],
      sourceUrl: `${officialBase}/content/year-12/fa32ce3c4b`,
      resources: [
        makeMultipleChoice(
          'eco12-management-mcq-1',
          'A cut in the cash rate is an example of:',
          ['contractionary fiscal policy', 'expansionary monetary policy', 'microeconomic reform', 'trade protection'],
          'B',
          'Lowering the cash rate is expansionary monetary policy because it aims to reduce borrowing costs and stimulate demand.',
          ['ECO-12-06', 'ECO-12-09'],
          'Policy identification'
        ),
        makeMultipleChoice(
          'eco12-management-mcq-2',
          'Which policy is most clearly microeconomic?',
          ['Changing the cash rate', 'Changing total budget spending', 'Reforming competition rules in an industry', 'Measuring CPI'],
          'C',
          'Microeconomic policy targets individual markets or supply-side efficiency, such as competition reform.',
          ['ECO-12-06', 'ECO-12-07'],
          'Policy mix'
        ),
        makeShortAnswer(
          'eco12-management-sa-1',
          6,
          'Analyse how fiscal and monetary policy can work together to manage inflation.',
          'Inflation is above target while household consumption is slowing and public infrastructure demand remains strong.',
          [
            'Identifies monetary policy transmission through interest rates and aggregate demand',
            'Identifies fiscal policy through spending, taxation and budget stance',
            'Analyses complementary or conflicting effects',
            'Uses the inflation and consumption stimulus',
            'Recognises time lags and distributional impacts',
            'Uses precise policy terminology',
          ],
          'Monetary policy can reduce inflation by raising interest rates, reducing borrowing, asset prices and consumption. Fiscal policy can support this if government reduces discretionary spending growth or raises revenue, lowering aggregate demand. However, if infrastructure spending remains strong while consumption slows, fiscal settings may partly offset tighter monetary policy. The best policy mix depends on whether inflation is demand-driven, supply-driven, and how quickly each policy affects the economy.',
          ['ECO-12-06', 'ECO-12-07', 'ECO-12-08', 'ECO-12-10'],
          'Policy analysis'
        ),
        makeShortAnswer(
          'eco12-management-sa-2',
          5,
          'Explain why economic policy objectives can conflict.',
          '',
          [
            'Identifies at least two objectives such as growth, inflation, employment, equity or sustainability',
            'Explains a conflict with economic reasoning',
            'Uses a policy or real-world example',
            'Recognises short-run versus long-run effects',
            'Communicates a balanced explanation',
          ],
          'Policy objectives can conflict because improving one outcome may worsen another in the short run. For example, expansionary fiscal policy may support growth and employment but increase inflationary pressure if the economy is near capacity. Environmental policy may improve sustainability but raise costs for some firms during transition. The conflict can be reduced if policies improve productivity or are phased carefully.',
          ['ECO-12-04', 'ECO-12-06', 'ECO-12-07', 'ECO-12-10']
        ),
        makeExtendedResponse(
          'eco12-management-er-1',
          'Evaluate the effectiveness of the policy mix in achieving Australia\'s economic objectives.',
          [
            'Define economic objectives and the policy mix',
            'Analyse fiscal and monetary policy transmission mechanisms',
            'Analyse microeconomic, labour-market and environmental policy contributions',
            'Evaluate constraints such as lags, global shocks, inflation and equity impacts',
            'Make a judgement about effectiveness under current or hypothetical conditions',
          ],
          'The policy mix is most effective when demand management stabilises the cycle while supply-side policies lift productive capacity, but its success is limited by lags, external shocks and conflicts between inflation, growth, equity and sustainability.',
          ['ECO-12-06', 'ECO-12-07', 'ECO-12-08', 'ECO-12-10']
        ),
      ],
      teacherNotes: ['This is the strongest early candidate for Caplet Mark because answers naturally require rubric-based evaluation.'],
    },
    {
      id: 'year-12-australia-global-economy',
      year: 12,
      hours: 30,
      title: 'Australia and the global economy',
      focus: 'Global integration and external performance',
      description:
        'Global trade, global investment, exchange rates, development, and the effects of global economic conditions on Australia.',
      contentGroups: [
        'Global trade',
        'Global investment',
        'Exchange rates',
        'International economic development',
        'Impacts of the global economy on Australia',
      ],
      outcomes: ['ECO-12-01', 'ECO-12-02', 'ECO-12-03', 'ECO-12-04', 'ECO-12-06', 'ECO-12-07', 'ECO-12-08', 'ECO-12-09'],
      sourceUrl: `${officialBase}/content/year-12/fa32ce3c4b`,
      resources: [
        makeMultipleChoice(
          'eco12-global-mcq-1',
          'A fall in global demand for commodities is most likely to put downward pressure on Australia\'s:',
          ['terms of trade and export revenue', 'import prices only', 'population growth rate only', 'school-based assessment rules'],
          'A',
          'Lower global commodity demand can reduce export prices and revenue, weakening the terms of trade if import prices do not fall similarly.',
          ['ECO-12-03', 'ECO-12-08'],
          'External sector'
        ),
        makeMultipleChoice(
          'eco12-global-mcq-2',
          'Which argument best supports free trade?',
          [
            'It guarantees every worker keeps the same job',
            'It allows countries to specialise according to comparative advantage',
            'It removes the business cycle',
            'It prevents exchange rates from changing',
          ],
          'B',
          'Free trade can raise efficiency by allowing specialisation according to comparative advantage, although adjustment costs can occur.',
          ['ECO-12-01', 'ECO-12-03'],
          'Trade theory'
        ),
        makeShortAnswer(
          'eco12-global-sa-1',
          6,
          'Analyse how a slowdown in China could affect the Australian economy.',
          'China accounts for a large share of demand for Australian resource exports. Assume Chinese construction activity weakens.',
          [
            'Explains export-demand and commodity-price channels',
            'Links lower export revenue to GDP, income or employment',
            'Analyses terms of trade and exchange-rate effects',
            'Considers investment/confidence effects',
            'Uses the stimulus directly',
            'Communicates clear external-sector causality',
          ],
          'Weaker Chinese construction activity would reduce demand for Australian resource exports, placing downward pressure on commodity prices and export revenue. This could lower the terms of trade, national income and activity in export industries. A weaker external outlook may also reduce business investment and confidence. The Australian dollar may depreciate, partly cushioning exporters but raising import prices.',
          ['ECO-12-03', 'ECO-12-04', 'ECO-12-08', 'ECO-12-10'],
          'External shock analysis'
        ),
        makeShortAnswer(
          'eco12-global-sa-2',
          5,
          'Explain two ways globalisation can affect income distribution within an economy.',
          '',
          [
            'Identifies two channels such as trade exposure, technology, capital flows or labour mobility',
            'Explains winners and losers using economic logic',
            'Uses terms such as structural change, skills premium or regional effects',
            'Recognises that policy can influence distributional outcomes',
            'Avoids a one-sided claim that globalisation is only good or bad',
          ],
          'Globalisation can increase returns to workers and firms in internationally competitive industries, raising incomes for those groups. It can also expose import-competing industries to stronger competition, causing structural unemployment or lower wage growth for affected workers. Education, retraining, tax-transfer systems and regional policy influence whether gains are widely shared.',
          ['ECO-12-04', 'ECO-12-05', 'ECO-12-07', 'ECO-12-10']
        ),
        makeExtendedResponse(
          'eco12-global-er-1',
          'Evaluate the impact of globalisation on the Australian economy.',
          [
            'Define globalisation and identify trade, investment, finance and technology channels',
            'Analyse benefits for growth, productivity, consumers and exporters',
            'Analyse risks including external volatility, inequality and structural change',
            'Use Australia-specific examples such as commodity exports, exchange rates and global supply chains',
            'Judge whether benefits exceed costs and what policies improve outcomes',
          ],
          'Globalisation has generally increased Australia\'s opportunities for trade, investment and productivity, but the gains are uneven and depend on policy settings that support adjustment, resilience and external stability.',
          ['ECO-12-03', 'ECO-12-04', 'ECO-12-05', 'ECO-12-06', 'ECO-12-10']
        ),
      ],
      teacherNotes: ['Encourage students to avoid generic globalisation essays; insist on Australia-specific channels and policy judgement.'],
    },
  ],
};

economicsResourceLibrary.focusAreas.forEach((area) => {
  area.topicDrills = area.contentGroups.map((group) => makeTopicDrill(area, group)).filter(Boolean);
  area.stimulusSets = (stimulusSetSpecs[area.id] || []).map((spec, index) => makeStimulusSet(area, spec, index));
});

export const getEconomicsAreaResources = (area) => [
  ...area.resources,
  ...(area.topicDrills || []),
  ...(area.stimulusSets || []),
];

const getExamPackItemCount = (pack) =>
  pack.sections.reduce(
    (total, section) => total + (section.sampleItems?.length || 0) + (section.items?.length || 0),
    0
  );

export function getEconomicsResourceStats() {
  const totals = economicsResourceLibrary.focusAreas.reduce(
    (acc, area) => {
      acc.focusAreas += 1;
      const resources = getEconomicsAreaResources(area);
      acc.questions += resources.length;
      resources.forEach((resource) => {
        acc.byType[resource.type] = (acc.byType[resource.type] || 0) + 1;
      });
      return acc;
    },
    { focusAreas: 0, questions: 0, byType: {} }
  );

  return {
    ...totals,
    examPacks: economicsResourceLibrary.examPracticePacks.length,
    examItems: economicsResourceLibrary.examPracticePacks.reduce((sum, pack) => sum + getExamPackItemCount(pack), 0),
    outcomes: Object.keys(economicsOutcomes).length,
    contentGroups: economicsResourceLibrary.focusAreas.reduce((sum, area) => sum + area.contentGroups.length, 0),
  };
}
