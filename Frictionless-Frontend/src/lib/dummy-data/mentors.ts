export interface DummyMentor {
  id: string;
  full_name: string;
  title: string;
  company: string;
  photo_url: string;
  bio: string;
  expertise: string[];
  assigned_startups_count: number;
}

export const dummyMentors: DummyMentor[] = [
  {
    id: 'mentor-1',
    full_name: 'Sarah Mitchell',
    title: 'Partner',
    company: 'Rocketship Ventures',
    photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahMentor',
    bio: 'Former Stripe exec. 15 years in fintech and payments. Focus on B2B SaaS and scalable unit economics.',
    expertise: ['Fintech', 'B2B SaaS', 'Fundraising'],
    assigned_startups_count: 2,
  },
  {
    id: 'mentor-2',
    full_name: 'David Park',
    title: 'VP Engineering',
    company: 'CloudScale',
    photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DavidMentor',
    bio: 'Ex-AWS, ex-Datadog. Built security and data infrastructure at scale. Advises on technical diligence.',
    expertise: ['Cybersecurity', 'DevOps', 'Enterprise'],
    assigned_startups_count: 2,
  },
  {
    id: 'mentor-3',
    full_name: 'Priya Sharma',
    title: 'Managing Director',
    company: 'Growth Capital Partners',
    photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaMentor',
    bio: '20 years in venture. Led 50+ Series A deals. Expert in storytelling, deck refinement, and investor relationships.',
    expertise: ['Fundraising', 'Storytelling', 'Investor Relations'],
    assigned_startups_count: 1,
  },
  {
    id: 'mentor-4',
    full_name: 'Marcus Chen',
    title: 'CTO',
    company: 'TechFlow Inc',
    photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusMentor',
    bio: 'Former Google Cloud. Deep expertise in developer tools, infrastructure, and product-led growth.',
    expertise: ['Developer Tools', 'SaaS', 'Product'],
    assigned_startups_count: 1,
  },
  {
    id: 'mentor-5',
    full_name: 'Elena Rodriguez',
    title: 'Head of Growth',
    company: 'ScaleUp Labs',
    photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ElenaMentor',
    bio: 'Scaled 3 startups from seed to Series B. E-commerce and D2C specialist. GTM strategy expert.',
    expertise: ['E-commerce', 'GTM', 'Growth'],
    assigned_startups_count: 1,
  },
  {
    id: 'mentor-6',
    full_name: 'James Okonkwo',
    title: 'Education Advisor',
    company: 'LearnVentures',
    photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JamesMentor',
    bio: 'Former teacher, EdTech founder. 10 years in K-12 and higher ed. Helps EdTech founders navigate sales cycles.',
    expertise: ['EdTech', 'K-12', 'B2B2C'],
    assigned_startups_count: 1,
  },
];
