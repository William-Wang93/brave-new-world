export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { insight, careerConnection, category, title, sources } = req.body;

  if (!insight || insight.trim().length === 0) {
    return res.status(400).json({ error: 'No insight text provided', score: 1 });
  }

  const sourceList = (sources || []).map(s => s.name).filter(Boolean).join(', ');

  const prompt = `You are evaluating a learning journal entry from a finance professional building toward a CFO role. Score the entry's depth of understanding on a scale of 1-5.

SCORING RUBRIC:
1 = Surface-level: Just a note that something was read/heard. No original thinking. "Listened to a podcast about capital allocation."
2 = Descriptive: Summarizes what was learned but doesn't demonstrate understanding. Restates without analysis.
3 = Analytical: Shows genuine engagement with the material. Makes connections, identifies implications, asks good questions. Demonstrates the person understood WHY, not just WHAT.
4 = Synthesized: Connects the learning to other domains, prior knowledge, or real decisions. Shows pattern recognition across contexts. Could teach this to someone else.
5 = Applied: Demonstrates how this learning changes a decision, framework, or approach. Shows judgment, not just knowledge. Evidence of original thinking that builds on the source material.

ENTRY TO EVALUATE:
Title: ${title || 'Untitled'}
Category: ${category || 'Uncategorized'}
Sources: ${sourceList || 'None listed'}

Key Insight:
${insight}

${careerConnection ? `Career Connection:\n${careerConnection}` : ''}

Respond with ONLY a JSON object, no markdown, no backticks:
{"score": <1-5>, "reasoning": "<one sentence explaining the score>"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(200).json({ score: 1, reasoning: 'Scoring unavailable', error: true });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

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
    console.error('Fetch error:', err);
    return res.status(200).json({ score: 1, reasoning: 'Scoring service unavailable', error: true });
  }
}
