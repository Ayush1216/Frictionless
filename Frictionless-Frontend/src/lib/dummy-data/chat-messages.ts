export interface DummyChatThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface DummyChatMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: string[];
  created_at: string;
}

export const dummyChatThreads: DummyChatThread[] = [
  {
    id: 'thread-1',
    title: 'Pitch deck feedback',
    created_at: '2025-02-08T10:15:00Z',
    updated_at: '2025-02-10T14:32:00Z',
    message_count: 8,
  },
  {
    id: 'thread-2',
    title: 'Financial model review',
    created_at: '2025-02-06T09:00:00Z',
    updated_at: '2025-02-09T16:45:00Z',
    message_count: 7,
  },
  {
    id: 'thread-3',
    title: 'Investor matching questions',
    created_at: '2025-02-05T14:20:00Z',
    updated_at: '2025-02-07T11:10:00Z',
    message_count: 5,
  },
];

export const dummyChatMessages: DummyChatMessage[] = [
  {
    id: 'msg-1',
    thread_id: 'thread-1',
    role: 'user',
    content: 'Can you review my pitch deck and suggest improvements?',
    created_at: '2025-02-08T10:15:00Z',
  },
  {
    id: 'msg-2',
    thread_id: 'thread-1',
    role: 'assistant',
    content: "I've analyzed your pitch deck. Overall it's strong, but I have a few recommendations. First, your problem slide could be more quantified—consider adding a statistic like 'X% of B2B merchants lose $Y due to settlement delays.' Second, the competitive landscape slide would benefit from a clearer positioning matrix. Would you like me to elaborate on either of these?",
    created_at: '2025-02-08T10:16:00Z',
  },
  {
    id: 'msg-3',
    thread_id: 'thread-1',
    role: 'user',
    content: "Yes, please elaborate on the competitive positioning. We're often compared to Stripe and Adyen.",
    created_at: '2025-02-08T10:18:00Z',
  },
  {
    id: 'msg-4',
    thread_id: 'thread-1',
    role: 'assistant',
    content: "Good context. For the positioning matrix, I'd suggest framing it like this: Stripe and Adyen are horizontal payment processors. NeuralPay is vertical—focused on B2B marketplaces with high-ticket, complex settlement. Your differentiator is AI-powered routing and fraud prevention for this specific use case. A 2x2 with 'Horizontal vs Vertical' and 'SMB vs Enterprise' could work well.",
    created_at: '2025-02-08T10:19:00Z',
  },
  {
    id: 'msg-5',
    thread_id: 'thread-1',
    role: 'user',
    content: "That's helpful. I'll add a slide with that framing. Anything else you noticed?",
    created_at: '2025-02-09T09:30:00Z',
  },
  {
    id: 'msg-6',
    thread_id: 'thread-1',
    role: 'assistant',
    content: "Yes—your traction slide is good but could be stronger. Highlight the 60% settlement time reduction as the lead metric. Also, consider adding a 'Why now' slide—regulatory changes, API maturity, or market shifts that make this the right moment for NeuralPay. Investors often look for that.",
    created_at: '2025-02-09T09:31:00Z',
  },
  {
    id: 'msg-7',
    thread_id: 'thread-1',
    role: 'user',
    content: "We do have a 'Why now'—open banking regulations in Europe and the growth of B2B marketplaces. I'll add that.",
    created_at: '2025-02-10T14:30:00Z',
  },
  {
    id: 'msg-8',
    thread_id: 'thread-1',
    role: 'assistant',
    content: "Perfect. Those are solid reasons. Your deck should be much stronger with these changes. If you'd like, I can help refine the financial model assumptions next.",
    created_at: '2025-02-10T14:32:00Z',
  },
  {
    id: 'msg-9',
    thread_id: 'thread-2',
    role: 'user',
    content: 'I uploaded our financial model. Can you check if our unit economics are reasonable?',
    created_at: '2025-02-06T09:00:00Z',
  },
  {
    id: 'msg-10',
    thread_id: 'thread-2',
    role: 'assistant',
    content: "I've reviewed your financial model. Your unit economics look solid: CAC of $12K with LTV of $85K gives a 7x LTV/CAC ratio, which is strong for Series A. One note: your gross margin assumption of 78% is aggressive—consider showing a sensitivity if it drops to 70% as you scale support and infrastructure.",
    created_at: '2025-02-06T09:02:00Z',
  },
  {
    id: 'msg-11',
    thread_id: 'thread-2',
    role: 'user',
    content: "We've actually been at 78% for the last 3 months. Should we still add the sensitivity?",
    created_at: '2025-02-06T14:00:00Z',
  },
  {
    id: 'msg-12',
    thread_id: 'thread-2',
    role: 'assistant',
    content: "If it's proven, you can keep it. But adding a sensitivity table (e.g. 70%, 75%, 78%) actually strengthens your case—it shows you've stress-tested the model and are confident. It also pre-answers a common investor question.",
    created_at: '2025-02-06T14:01:00Z',
  },
  {
    id: 'msg-13',
    thread_id: 'thread-2',
    role: 'user',
    content: 'Good point. What about our burn and runway assumptions?',
    created_at: '2025-02-07T11:20:00Z',
  },
  {
    id: 'msg-14',
    thread_id: 'thread-2',
    role: 'assistant',
    content: "18 months runway at $320K monthly burn is reasonable for a Series A. Make sure your hiring plan in the model aligns with that—it looks like you're adding 15 people over 12 months. Double-check that your burn projection includes fully loaded cost (benefits, tools, etc.) for those hires.",
    created_at: '2025-02-07T11:22:00Z',
  },
  {
    id: 'msg-15',
    thread_id: 'thread-2',
    role: 'user',
    content: 'I rechecked—we have 1.2x loaded cost built in. Thanks for the tip.',
    created_at: '2025-02-09T16:45:00Z',
  },
  {
    id: 'msg-16',
    thread_id: 'thread-3',
    role: 'user',
    content: 'Which investors should we prioritize from our match list?',
    created_at: '2025-02-05T14:20:00Z',
  },
  {
    id: 'msg-17',
    thread_id: 'thread-3',
    role: 'assistant',
    content: "Based on your matches, I'd prioritize: 1) General Catalyst—89 match score, strong fintech focus, and they've backed similar payments infrastructure. 2) Andreessen Horowitz—87 score, they love technical founders and platform plays. 3) Sequoia—86 score, fintech is core. All three have ex-Stripe or fintech partners who would understand your space. Would you like warm intro strategies for each?",
    created_at: '2025-02-05T14:21:00Z',
  },
  {
    id: 'msg-18',
    thread_id: 'thread-3',
    role: 'user',
    content: "Yes, what's the best way to get warm intros to these firms?",
    created_at: '2025-02-05T15:00:00Z',
  },
  {
    id: 'msg-19',
    thread_id: 'thread-3',
    role: 'assistant',
    content: "Check your investor CRM or LinkedIn for mutual connections—existing investors, advisors, or portfolio company founders. GC, a16z, and Sequoia all value referrals from trusted sources. If you have Stripe alumni in your network, that's especially valuable for fintech intros. Also consider applying to YC or other accelerators if you haven't—Demo Day is a strong intro channel.",
    created_at: '2025-02-05T15:02:00Z',
  },
  {
    id: 'msg-20',
    thread_id: 'thread-3',
    role: 'user',
    content: 'We have one Stripe connection. I’ll reach out. Thanks!',
    created_at: '2025-02-07T11:10:00Z',
  },
];
