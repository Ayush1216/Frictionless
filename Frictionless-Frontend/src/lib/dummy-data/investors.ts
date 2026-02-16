export interface DummyInvestor {
  org_id: string;
  org: {
    id: string;
    name: string;
    org_type: 'capital_provider';
    logo_url: string;
    website: string;
    slug: string;
    description: string;
  };
  provider_type: 'vc' | 'angel' | 'bank' | 'grant' | 'family_office' | 'cvc';
  aum_usd: number;
  check_size_min: number;
  check_size_max: number;
  sweet_spot: string;
  preferred_stages: string[];
  preferred_sectors: string[];
  thesis_summary: string;
  team_members: Array<{
    id: string;
    full_name: string;
    title: string;
    photo_url: string;
    role: string;
    email?: string;
    bio?: string;
  }>;
  funds: Array<{
    id: string;
    name: string;
    vintage_year: number;
    target_size: number;
    capital_deployed: number;
    capital_remaining_pct: number;
    status: string;
    investments: Array<{
      id: string;
      startup_name: string;
      sector: string;
      stage: string;
      amount: number;
      date: string;
      status: string;
    }>;
  }>;
  investment_count: number;
  portfolio_exits: number;
}

export const dummyInvestors: DummyInvestor[] = [
  {
    org_id: 'investor-gc',
    org: {
      id: 'investor-gc',
      name: 'General Catalyst',
      org_type: 'capital_provider',
      logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=GeneralCatalyst',
      website: 'https://generalcatalyst.com',
      slug: 'general-catalyst',
      description: 'Leading venture capital firm backing founders from seed to growth.',
    },
    provider_type: 'vc',
    aum_usd: 25000000000,
    check_size_min: 500000,
    check_size_max: 100000000,
    sweet_spot: '$5M–$25M Series A/B',
    preferred_stages: ['seed', 'series_a', 'series_b', 'series_c'],
    preferred_sectors: ['fintech', 'healthtech', 'saas', 'cybersecurity'],
    thesis_summary: 'We back founders building the future of critical industries. Focus on technology transforming healthcare, fintech, enterprise software, and climate. Prefer teams with domain expertise and clear path to $100M+ ARR.',
    team_members: [
      { id: 'gc-1', full_name: 'Hemant Taneja', title: 'Managing Director', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HemantTaneja', role: 'partner' },
      { id: 'gc-2', full_name: 'Niko Bonatsos', title: 'Managing Director', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NikoBonatsos', role: 'partner' },
      { id: 'gc-3', full_name: 'Alex Tran', title: 'Principal', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexTran', role: 'principal' },
    ],
    funds: [
      {
        id: 'gc-f1',
        name: 'General Catalyst XII',
        vintage_year: 2023,
        target_size: 6000000000,
        capital_deployed: 2100000000,
        capital_remaining_pct: 65,
        status: 'deploying',
        investments: [
          { id: 'gc-i1', startup_name: 'Stripe', sector: 'fintech', stage: 'series_c', amount: 15000000, date: '2023-06-15', status: 'active' },
          { id: 'gc-i2', startup_name: 'Oscar Health', sector: 'healthtech', stage: 'series_b', amount: 25000000, date: '2023-09-20', status: 'exited' },
        ],
      },
    ],
    investment_count: 450,
    portfolio_exits: 78,
  },
  {
    org_id: 'investor-a16z',
    org: {
      id: 'investor-a16z',
      name: 'Andreessen Horowitz',
      org_type: 'capital_provider',
      logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=AndreessenHorowitz',
      website: 'https://a16z.com',
      slug: 'andreessen-horowitz',
      description: 'Silicon Valley venture capital firm supporting bold founders.',
    },
    provider_type: 'vc',
    aum_usd: 35000000000,
    check_size_min: 250000,
    check_size_max: 500000000,
    sweet_spot: '$10M–$50M Series A/B',
    preferred_stages: ['seed', 'series_a', 'series_b', 'series_c'],
    preferred_sectors: ['fintech', 'saas', 'crypto', 'biotech', 'cybersecurity'],
    thesis_summary: 'We invest in software eating the world. Passionate about technical founders building infrastructure-defining companies. Strong bias for platform plays and network effects.',
    team_members: [
      { id: 'a16z-1', full_name: 'Marc Andreessen', title: 'General Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcAndreessen', role: 'partner' },
      { id: 'a16z-2', full_name: 'Ben Horowitz', title: 'General Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BenHorowitz', role: 'partner' },
      { id: 'a16z-3', full_name: 'Sarah Wang', title: 'General Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahWang', role: 'partner' },
      { id: 'a16z-4', full_name: 'David Ulevitch', title: 'General Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DavidUlevitch', role: 'partner' },
    ],
    funds: [
      {
        id: 'a16z-f1',
        name: 'a16z Fund VIII',
        vintage_year: 2024,
        target_size: 7200000000,
        capital_deployed: 1800000000,
        capital_remaining_pct: 75,
        status: 'deploying',
        investments: [
          { id: 'a16z-i1', startup_name: 'Databricks', sector: 'saas', stage: 'series_g', amount: 50000000, date: '2024-03-10', status: 'active' },
          { id: 'a16z-i2', startup_name: 'OpenAI', sector: 'deeptech', stage: 'series_c', amount: 100000000, date: '2024-01-15', status: 'active' },
        ],
      },
    ],
    investment_count: 850,
    portfolio_exits: 125,
  },
  {
    org_id: 'investor-accel',
    org: {
      id: 'investor-accel',
      name: 'Accel',
      org_type: 'capital_provider',
      logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=Accel',
      website: 'https://accel.com',
      slug: 'accel',
      description: 'Global venture capital firm with roots in Europe and Silicon Valley.',
    },
    provider_type: 'vc',
    aum_usd: 12000000000,
    check_size_min: 1000000,
    check_size_max: 75000000,
    sweet_spot: '$2M–$15M Series A',
    preferred_stages: ['series_a', 'series_b'],
    preferred_sectors: ['saas', 'fintech', 'cybersecurity', 'ecommerce'],
    thesis_summary: 'We partner with exceptional founders at the inflection point. Focus on B2B software, fintech, and cybersecurity. Known for early bets in Atlassian, Slack, Spotify.',
    team_members: [
      { id: 'accel-1', full_name: 'Harry Nelis', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HarryNelis', role: 'partner' },
      { id: 'accel-2', full_name: 'Luciana Lixandru', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LucianaLixandru', role: 'partner' },
      { id: 'accel-3', full_name: 'Sonali De Rycker', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SonaliDeRycker', role: 'partner' },
    ],
    funds: [
      {
        id: 'accel-f1',
        name: 'Accel XIX',
        vintage_year: 2022,
        target_size: 4000000000,
        capital_deployed: 3200000000,
        capital_remaining_pct: 20,
        status: 'active',
        investments: [
          { id: 'accel-i1', startup_name: 'UiPath', sector: 'saas', stage: 'series_c', amount: 22000000, date: '2022-11-01', status: 'exited' },
          { id: 'accel-i2', startup_name: 'Checkout.com', sector: 'fintech', stage: 'series_d', amount: 15000000, date: '2023-02-14', status: 'active' },
        ],
      },
    ],
    investment_count: 520,
    portfolio_exits: 95,
  },
  {
    org_id: 'investor-sequoia',
    org: {
      id: 'investor-sequoia',
      name: 'Sequoia Capital',
      org_type: 'capital_provider',
      logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=SequoiaCapital',
      website: 'https://sequoiacap.com',
      slug: 'sequoia-capital',
      description: 'Legendary venture firm backing founders from idea to IPO.',
    },
    provider_type: 'vc',
    aum_usd: 85000000000,
    check_size_min: 1000000,
    check_size_max: 200000000,
    sweet_spot: '$5M–$50M any stage',
    preferred_stages: ['seed', 'series_a', 'series_b', 'series_c'],
    preferred_sectors: ['saas', 'fintech', 'healthtech', 'deeptech', 'cybersecurity', 'biotech'],
    thesis_summary: 'We back the builders. From seed to growth to IPO. Focus on durable businesses with 10x potential. Consumer, enterprise, healthcare, fintech, and frontier tech.',
    team_members: [
      { id: 'seq-1', full_name: 'Roelof Botha', title: 'Managing Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RoelofBotha', role: 'partner' },
      { id: 'seq-2', full_name: 'Alfred Lin', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlfredLin', role: 'partner' },
      { id: 'seq-3', full_name: 'Shaun Maguire', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ShaunMaguire', role: 'partner' },
    ],
    funds: [
      {
        id: 'seq-f1',
        name: 'Sequoia Capital Global Growth III',
        vintage_year: 2023,
        target_size: 9000000000,
        capital_deployed: 5400000000,
        capital_remaining_pct: 40,
        status: 'deploying',
        investments: [
          { id: 'seq-i1', startup_name: 'Klarna', sector: 'fintech', stage: 'series_d', amount: 650000000, date: '2023-07-01', status: 'active' },
          { id: 'seq-i2', startup_name: 'Notion', sector: 'saas', stage: 'series_c', amount: 50000000, date: '2023-09-15', status: 'active' },
        ],
      },
    ],
    investment_count: 1200,
    portfolio_exits: 210,
  },
  {
    org_id: 'investor-yc',
    org: {
      id: 'investor-yc',
      name: 'Y Combinator',
      org_type: 'capital_provider',
      logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=YCombinator',
      website: 'https://ycombinator.com',
      slug: 'y-combinator',
      description: 'Accelerator and early-stage investor. Batch program twice yearly.',
    },
    provider_type: 'vc',
    aum_usd: 50000000000,
    check_size_min: 125000,
    check_size_max: 500000,
    sweet_spot: '$500K standard deal',
    preferred_stages: ['pre_seed', 'seed'],
    preferred_sectors: ['saas', 'fintech', 'healthtech', 'ai', 'deeptech', 'cleantech', 'edtech'],
    thesis_summary: 'We fund the most ambitious founders at the very beginning. $500K for 7%. No sector limits. Batch program provides network, advice, Demo Day. 400+ companies per year.',
    team_members: [
      { id: 'yc-1', full_name: 'Garry Tan', title: 'President', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GarryTan', role: 'partner' },
      { id: 'yc-2', full_name: 'Dalton Caldwell', title: 'Managing Director', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DaltonCaldwell', role: 'partner' },
      { id: 'yc-3', full_name: 'Michael Seibel', title: 'CEO', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MichaelSeibel', role: 'partner' },
    ],
    funds: [
      {
        id: 'yc-f1',
        name: 'YC Continuity Fund',
        vintage_year: 2024,
        target_size: 1000000000,
        capital_deployed: 600000000,
        capital_remaining_pct: 40,
        status: 'deploying',
        investments: [
          { id: 'yc-i1', startup_name: 'Airbnb', sector: 'mobility', stage: 'series_a', amount: 120000, date: '2009-01-01', status: 'exited' },
          { id: 'yc-i2', startup_name: 'Stripe', sector: 'fintech', stage: 'seed', amount: 150000, date: '2010-07-01', status: 'active' },
        ],
      },
    ],
    investment_count: 4500,
    portfolio_exits: 320,
  },
  {
    org_id: 'investor-lightspeed',
    org: {
      id: 'investor-lightspeed',
      name: 'Lightspeed Venture Partners',
      org_type: 'capital_provider',
      logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=Lightspeed',
      website: 'https://lsvp.com',
      slug: 'lightspeed-ventures',
      description: 'Multi-stage venture firm investing from seed to growth.',
    },
    provider_type: 'vc',
    aum_usd: 18000000000,
    check_size_min: 500000,
    check_size_max: 100000000,
    sweet_spot: '$3M–$20M Series A/B',
    preferred_stages: ['seed', 'series_a', 'series_b'],
    preferred_sectors: ['saas', 'fintech', 'consumer', 'enterprise'],
    thesis_summary: 'We back exceptional teams in consumer and enterprise. Early focus on product-market fit, then scale. Strong in India, US, Israel. Consumer internet and B2B software.',
    team_members: [
      { id: 'ls-1', full_name: 'Jeremy Liew', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JeremyLiew', role: 'partner' },
      { id: 'ls-2', full_name: 'Nicole Quinn', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NicoleQuinn', role: 'partner' },
    ],
    funds: [
      {
        id: 'ls-f1',
        name: 'Lightspeed XIV',
        vintage_year: 2023,
        target_size: 7000000000,
        capital_deployed: 3500000000,
        capital_remaining_pct: 50,
        status: 'deploying',
        investments: [
          { id: 'ls-i1', startup_name: 'Snap', sector: 'consumer', stage: 'series_a', amount: 4850000, date: '2012-02-01', status: 'exited' },
          { id: 'ls-i2', startup_name: 'Carta', sector: 'fintech', stage: 'series_b', amount: 12000000, date: '2023-05-10', status: 'active' },
        ],
      },
    ],
    investment_count: 380,
    portfolio_exits: 65,
  },
  {
    org_id: 'investor-tiger',
    org: {
      id: 'investor-tiger',
      name: 'Tiger Global Management',
      org_type: 'capital_provider',
      logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=TigerGlobal',
      website: 'https://tigerglobal.com',
      slug: 'tiger-global',
      description: 'Investment firm with venture and public market strategies.',
    },
    provider_type: 'vc',
    aum_usd: 65000000000,
    check_size_min: 10000000,
    check_size_max: 500000000,
    sweet_spot: '$25M–$100M growth',
    preferred_stages: ['series_b', 'series_c', 'series_d'],
    preferred_sectors: ['saas', 'fintech', 'ecommerce', 'marketplace'],
    thesis_summary: 'We invest in category-defining companies globally. Growth-stage focus. High conviction, large checks. Software, fintech, consumer internet. Fast-paced decision making.',
    team_members: [
      { id: 'tg-1', full_name: 'Scott Shleifer', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ScottShleifer', role: 'partner' },
      { id: 'tg-2', full_name: 'Evan Feinberg', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EvanFeinberg', role: 'partner' },
    ],
    funds: [
      {
        id: 'tg-f1',
        name: 'Tiger Global Private Investment Partners XV',
        vintage_year: 2022,
        target_size: 12000000000,
        capital_deployed: 10500000000,
        capital_remaining_pct: 12,
        status: 'active',
        investments: [
          { id: 'tg-i1', startup_name: 'JD.com', sector: 'ecommerce', stage: 'series_d', amount: 250000000, date: '2014-03-01', status: 'exited' },
          { id: 'tg-i2', startup_name: 'Databricks', sector: 'saas', stage: 'series_h', amount: 150000000, date: '2022-08-15', status: 'active' },
        ],
      },
    ],
    investment_count: 680,
    portfolio_exits: 145,
  },
  {
    org_id: 'investor-founders',
    org: {
      id: 'investor-founders',
      name: 'Founders Fund',
      org_type: 'capital_provider',
      logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=FoundersFund',
      website: 'https://foundersfund.com',
      slug: 'founders-fund',
      description: 'Venture capital firm backing contrarian founders.',
    },
    provider_type: 'vc',
    aum_usd: 11000000000,
    check_size_min: 1000000,
    check_size_max: 100000000,
    sweet_spot: '$5M–$30M Series A/B',
    preferred_stages: ['seed', 'series_a', 'series_b'],
    preferred_sectors: ['deeptech', 'space', 'biotech', 'ai', 'cybersecurity'],
    thesis_summary: 'We back founders building the future others are afraid to build. Contrarian bets. Space, AI, biotech, frontier tech. Willing to be wrong to be right.',
    team_members: [
      { id: 'ff-1', full_name: 'Peter Thiel', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PeterThiel', role: 'partner' },
      { id: 'ff-2', full_name: 'Brian Singerman', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BrianSingerman', role: 'partner' },
      { id: 'ff-3', full_name: 'Keith Rabois', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KeithRabois', role: 'partner' },
    ],
    funds: [
      {
        id: 'ff-f1',
        name: 'Founders Fund VIII',
        vintage_year: 2023,
        target_size: 3000000000,
        capital_deployed: 1200000000,
        capital_remaining_pct: 60,
        status: 'deploying',
        investments: [
          { id: 'ff-i1', startup_name: 'SpaceX', sector: 'space', stage: 'series_f', amount: 50000000, date: '2008-08-01', status: 'active' },
          { id: 'ff-i2', startup_name: 'Palantir', sector: 'saas', stage: 'series_c', amount: 30000000, date: '2011-05-01', status: 'exited' },
        ],
      },
    ],
    investment_count: 220,
    portfolio_exits: 42,
  },
  {
    org_id: 'investor-index',
    org: {
      id: 'investor-index',
      name: 'Index Ventures',
      org_type: 'capital_provider',
      logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=IndexVentures',
      website: 'https://indexventures.com',
      slug: 'index-ventures',
      description: 'European-American VC backing category-defining companies.',
    },
    provider_type: 'vc',
    aum_usd: 13000000000,
    check_size_min: 500000,
    check_size_max: 75000000,
    sweet_spot: '$2M–$15M Series A',
    preferred_stages: ['seed', 'series_a', 'series_b'],
    preferred_sectors: ['saas', 'fintech', 'marketplace', 'gaming'],
    thesis_summary: 'We invest in ambitious founders in Europe and the US. B2B software, fintech, consumer. Known for Notion, Figma, Revolut. Bridge between Silicon Valley and Europe.',
    team_members: [
      { id: 'idx-1', full_name: 'Martin Mignot', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MartinMignot', role: 'partner' },
      { id: 'idx-2', full_name: 'Danny Rimer', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DannyRimer', role: 'partner' },
      { id: 'idx-3', full_name: 'Hannah Seal', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HannahSeal', role: 'partner' },
    ],
    funds: [
      {
        id: 'idx-f1',
        name: 'Index Ventures X',
        vintage_year: 2022,
        target_size: 3000000000,
        capital_deployed: 2400000000,
        capital_remaining_pct: 20,
        status: 'active',
        investments: [
          { id: 'idx-i1', startup_name: 'Figma', sector: 'saas', stage: 'series_c', amount: 50000000, date: '2021-06-01', status: 'exited' },
          { id: 'idx-i2', startup_name: 'Revolut', sector: 'fintech', stage: 'series_d', amount: 25000000, date: '2022-04-15', status: 'active' },
        ],
      },
    ],
    investment_count: 420,
    portfolio_exits: 88,
  },
  {
    org_id: 'investor-softbank',
    org: {
      id: 'investor-softbank',
      name: 'SoftBank Vision Fund',
      org_type: 'capital_provider',
      logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=SoftBankVision',
      website: 'https://visionfund.com',
      slug: 'softbank-vision',
      description: 'Growth-stage fund backing technology leaders globally.',
    },
    provider_type: 'vc',
    aum_usd: 100000000000,
    check_size_min: 100000000,
    check_size_max: 5000000000,
    sweet_spot: '$100M–$500M growth',
    preferred_stages: ['series_c', 'series_d', 'series_e'],
    preferred_sectors: ['fintech', 'mobility', 'ecommerce', 'ai', 'enterprise'],
    thesis_summary: 'We empower entrepreneurs to reshape industries. Large checks for category leaders. Global scale. AI, mobility, fintech, enterprise software. Patient capital for ambitious visions.',
    team_members: [
      { id: 'sb-1', full_name: 'Masayoshi Son', title: 'CEO', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MasayoshiSon', role: 'partner' },
      { id: 'sb-2', full_name: 'Rajeev Misra', title: 'CEO SVF', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RajeevMisra', role: 'partner' },
      { id: 'sb-3', full_name: 'Akshay Naheta', title: 'Partner', photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AkshayNaheta', role: 'partner' },
    ],
    funds: [
      {
        id: 'sb-f1',
        name: 'Vision Fund 2',
        vintage_year: 2019,
        target_size: 108000000000,
        capital_deployed: 95000000000,
        capital_remaining_pct: 12,
        status: 'active',
        investments: [
          { id: 'sb-i1', startup_name: 'Uber', sector: 'mobility', stage: 'series_g', amount: 9000000000, date: '2018-01-01', status: 'exited' },
          { id: 'sb-i2', startup_name: 'WeWork', sector: 'real_estate', stage: 'series_h', amount: 5000000000, date: '2019-01-01', status: 'written_off' },
        ],
      },
    ],
    investment_count: 320,
    portfolio_exits: 55,
  },
];
