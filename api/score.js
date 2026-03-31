import https from 'https';

const CATEGORY_CONTEXT = {
  "Finance Foundation": "accounting fundamentals, 3-statement modeling, debits/credits, revenue recognition, financial statement analysis, GAAP principles",
  "Controllership & Reporting": "month-end close, internal controls, audit readiness, SOX compliance, chart of accounts, financial reporting, ASC standards",
  "FP&A & Modeling": "budgeting, forecasting, variance analysis, driver-based models, scenario planning, operating models, cash flow forecasting",
  "Capital Markets & Financing": "debt/equity instruments, leveraged finance, bond issuance, credit analysis, syndication, project finance, capital stack, covenants",
  "M&A / Corporate Development": "deal structuring, due diligence, LOIs, quality of earnings, integration planning, asset vs stock deals, purchase price allocation",
  "Valuation & Analysis": "DCF, trading comps, precedent transactions, LBO models, WACC, terminal value, sum-of-parts, reverse DCF, implied assumptions",
  "Macro & Economic Frameworks": "business cycles, monetary transmission, Fed policy, inflation, interest rates, FX, credit conditions, Dalio debt cycles, yield curves",
  "AI & Finance Transformation": "AI automation of finance workflows, tool evaluation, org design around AI, accountability frameworks, context engineering",
  "Risk Management & Compliance": "enterprise risk management, hedging strategies, derivatives, risk matrices, compliance frameworks, risk retention vs transfer",
  "Leadership & Stakeholders": "investor relations, board communication, lender presentations, CEO partnership, narrative building, managing up",
  "Capital Allocation & Strategy": "ROIC discipline, capital allocation frameworks, Buffett/Singleton/Leonard, opportunity cost, invest/acquire/return decisions",
  "Treasury & Cash Management": "cash management, working capital, bank relationships, payment systems, liquidity management",
  "Writing & Communication": "financial narrative, investor updates, board memos, clear communication of financial results and strategy",
  "History & Pattern Recognition": "historical pattern recognition, cross-domain analogies, Machiavelli, governance models, cycle recognition",
};

function callClaude(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error('API returned ' + res.statusCode + ': ' + data));
        } else {
          resolve(JSON.parse(data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ score: 0, reasoning: 'Scoring not configured', error: true });
  }

  const { insight, careerConnection, category, title, sources } = req.body || {};

  if (!insight || insight.trim().length === 0) {
    return res.status(200).json({ score: 0, reasoning: 'No insight text', error: true });
  }

  const sourceList = (sources || []).map(s => s.name).filter(Boolean).join(', ');
  const categoryKnowledge = CATEGORY_CONTEXT[category] || 'general finance and business knowledge';

  const prompt = `You are a strict evaluator for a CFO skill-building journal. Score this entry's depth of understanding on a scale of 0-5.

CATEGORY: ${category || 'Uncategorized'}
This category covers: ${categoryKnowledge}

Evaluate the entry SPECIFICALLY against the knowledge domain of this category. A post about cooking recipes filed under "Capital Markets" should score 0. A post about bond covenants filed under "Capital Markets" should be evaluated on how deeply it engages with capital markets concepts.

SCORING RUBRIC:
0 = Junk: Off-topic, test entry, no finance content, or completely irrelevant to the category. Give this score liberally for low-effort posts.
1 = Surface-level: Mentions the topic but shows no understanding. "I learned about capital allocation today."
2 = Descriptive: Summarizes content but just restates without analysis. No evidence of understanding WHY things work the way they do.
3 = Analytical: Genuine engagement with the material. Makes connections, identifies implications, asks good questions. Demonstrates understanding of mechanisms, not just definitions.
4 = Synthesized: Connects the learning to other domains, prior knowledge, or real decisions. Shows pattern recognition across contexts. Could teach this to someone else with nuance.
5 = Applied: Demonstrates how this learning changes a decision, framework, or approach. Shows original thinking that builds on source material. Evidence of judgment, not just knowledge.

ENTRY TO EVALUATE:
Title: ${title || 'Untitled'}
Category: ${category || 'Uncategorized'}
Sources: ${sourceList || 'None listed'}

Key Insight:
${insight}

${careerConnection ? 'Career Connection:\n' + careerConnection : ''}

Be strict. Most entries should score 2-3. Reserve 4-5 for genuinely impressive depth. Give 0 without hesitation for junk or off-topic posts.

Respond with ONLY a JSON object, no markdown, no backticks:
{"score": <0-5>, "reasoning": "<one sentence explaining the score>"}`;

  try {
    const data = await callClaude(apiKey, prompt);
    const text = (data.content && data.content[0] && data.content[0].text) || '';

    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);
      return res.status(200).json({
        score: Math.max(0, Math.min(5, Math.round(result.score))),
        reasoning: result.reasoning || '',
      });
    } catch (parseErr) {
      console.error('Parse error:', text);
      return res.status(200).json({ score: 0, reasoning: 'Could not parse score', error: true });
    }
  } catch (err) {
    console.error('Claude API error:', err.message);
    return res.status(200).json({ score: 0, reasoning: 'Scoring service unavailable', error: true });
  }
}
