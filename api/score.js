const https = require('https');

function callClaude(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
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
          reject(new Error(`API returned ${res.statusCode}: ${data}`));
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ score: 1, reasoning: 'Scoring not configured', error: true });
  }

  const { insight, careerConnection, category, title, sources } = req.body || {};

  if (!insight || insight.trim().length === 0) {
    return res.status(200).json({ score: 1, reasoning: 'No insight text', error: true });
  }

  const sourceList = (sources || []).map(function(s) { return s.name; }).filter(Boolean).join(', ');

  const prompt = 'You are evaluating a learning journal entry from a finance professional building toward a CFO role. Score the depth of understanding on a scale of 1-5.\n\nSCORING RUBRIC:\n1 = Surface-level: Just a note that something was read/heard. No original thinking.\n2 = Descriptive: Summarizes but does not demonstrate understanding.\n3 = Analytical: Shows genuine engagement. Makes connections, identifies implications.\n4 = Synthesized: Connects to other domains or real decisions. Pattern recognition.\n5 = Applied: Changes a decision or framework. Original thinking.\n\nENTRY:\nTitle: ' + (title || 'Untitled') + '\nCategory: ' + (category || 'Uncategorized') + '\nSources: ' + (sourceList || 'None') + '\n\nKey Insight:\n' + insight + '\n\n' + (careerConnection ? 'Career Connection:\n' + careerConnection : '') + '\n\nRespond with ONLY a JSON object, no markdown, no backticks:\n{"score": <1-5>, "reasoning": "<one sentence>"}';

  try {
    const data = await callClaude(apiKey, prompt);
    const text = (data.content && data.content[0] && data.content[0].text) || '';

    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);
      return res.status(200).json({
        score: Math.max(1, Math.min(5, Math.round(result.score))),
        reasoning: result.reasoning || '',
      });
    } catch (parseErr) {
      console.error('Parse error:', text);
      return res.status(200).json({ score: 1, reasoning: 'Could not parse score', error: true });
    }
  } catch (err) {
    console.error('Claude API error:', err.message);
    return res.status(200).json({ score: 1, reasoning: 'Scoring service unavailable', error: true });
  }
};
