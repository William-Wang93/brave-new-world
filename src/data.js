export const BR = {
  control: { name: "Controllership", color: "#5a4a3a" },
  capital: { name: "Capital & Markets", color: "#8b2500" },
  strategy: { name: "Strategy & Ops", color: "#1a4a7a" },
  leadership: { name: "Leadership", color: "#2a6e4e" },
};

export const NODES = [
  { id:"root", label:"Finance Foundation", t:0, b:null, desc:"CPA, credit training, accounting fundamentals, 3-statement modeling. The table stakes.", req:[], xp:40, col:3, row:0,
    milestones:["Build a 3-statement model from scratch (IS, BS, CF linked)","Explain debits/credits and why the accounting equation balances","Walk through the accounting cycle: journal entries to trial balance to financials","Explain cash vs accrual accounting with a concrete example","Read a 10-K: identify rev rec policy, major assets, debt structure"] },
  { id:"controllership", label:"Controllership", t:1, b:"control", desc:"Accounting, reporting, compliance, treasury, cash, systems. Owning the numbers.", req:["root"], xp:60, col:0.8, row:1,
    milestones:["Build or audit a month-end close checklist with timeline","Explain ASC 606 rev rec: the 5-step model with an example","Walk through an audit: what the auditor tests, what are material weaknesses","Explain SOX 302/404 and what they mean for the CFO personally","Map a chart of accounts for a real company and explain design choices"] },
  { id:"fpa", label:"FP&A & Modeling", t:1, b:"control", desc:"Forecasting, scenarios, operating models, variance analysis.", req:["root"], xp:60, col:2.3, row:1,
    milestones:["Build a driver-based revenue model (not just revenue grows 5%)","Create a budget with base/upside/downside scenarios and defend assumptions","Perform variance analysis: actual vs budget, isolate volume/price/mix","Build a 13-week cash flow forecast","Explain what makes a good vs bad operating model"] },
  { id:"cap_markets", label:"Capital Markets", t:1, b:"capital", desc:"Debt and equity instruments, leveraged finance, syndication, credit analysis, project finance.", req:["root"], xp:60, col:3.7, row:1,
    milestones:["Diagram the full capital stack of a real company (senior secured through equity)","Explain IG vs HY: what drives the spread","Walk through a bond issuance process end to end","Analyze a credit agreement: key covenants and default triggers","Explain project finance vs corporate finance and when each applies"] },
  { id:"corp_dev", label:"Corp Dev", t:1, b:"strategy", desc:"M&A process, due diligence, deal structuring, integration. The full deal lifecycle.", req:["root"], xp:60, col:5.2, row:1,
    milestones:["Write an LOI with key terms (price, structure, conditions, exclusivity)","Build a due diligence checklist organized by workstream","Explain asset deal vs stock deal and tax implications","Walk through a quality of earnings analysis","Map a 100-day integration plan with workstreams and owners"] },
  { id:"valuation", label:"Valuation", t:2, b:"capital", desc:"DCF, comps, precedents, LBO models, SOTP, real options.", req:["fpa","cap_markets"], xp:50, col:1.5, row:2,
    milestones:["Build a DCF with WACC, projections, terminal value (perpetuity growth + exit multiple)","Run trading comps on 5+ companies and build a football field","Reverse-DCF: back into implied growth rate and assess if reasonable","Explain when DCF, comps, and precedents give different answers and why"] },
  { id:"macro", label:"Macro & Cycles", t:2, b:"capital", desc:"Debt cycles, rate transmission, Fed policy, inflation, currency, credit conditions.", req:["fpa","cap_markets"], xp:50, col:3, row:2,
    milestones:["Write a memo on how a 100bp rate change affects a specific company cost of capital","Map current position in Dalio debt cycle framework with evidence","Explain the transmission mechanism: Fed funds rate to corporate borrowing costs","Analyze how inflation affects capital-intensive vs asset-light businesses differently"] },
  { id:"ai_transform", label:"AI & Transformation", t:2, b:"control", desc:"Leading AI-augmented teams, tool selection, workflow redesign, accountability.", req:["controllership","fpa"], xp:50, col:4.5, row:2,
    milestones:["Automate a real finance workflow with AI and document before/after","Evaluate 3 AI tools for a specific finance function with a decision matrix","Design an AI-augmented org chart: what stays human, what gets automated, hybrid","Write a memo on accountability when AI produces a financial forecast"] },
  { id:"cap_alloc", label:"Capital Allocation", t:3, b:"capital", desc:"Buffett/Singleton/Leonard/Malone. ROIC discipline, opportunity cost thinking.", req:["valuation","macro"], xp:75, col:1, row:3,
    milestones:["Write a capital allocation memo recommending invest/acquire/return/hold with ROIC","Analyze a real company 5-year capital allocation track record (Jacobs, Danaher, CSU)","Build a ROIC bridge: decompose returns into margin, turns, and leverage","Explain opportunity cost of capital in a real decision context"] },
  { id:"performance", label:"Driving Performance", t:3, b:"strategy", desc:"KPIs, unit economics, margin management, operating leverage.", req:["ai_transform","corp_dev"], xp:75, col:2.5, row:3,
    milestones:["Design a KPI dashboard with leading and lagging indicators for a business unit","Identify and quantify 3 margin improvement levers for a real business","Build a unit economics model from scratch (CAC, LTV, payback, contribution margin)","Explain operating leverage: how cost structure affects profitability at different volumes"] },
  { id:"stakeholders", label:"Stakeholders", t:3, b:"leadership", desc:"IR, board, lender relationships, CEO partnership, narrative building.", req:["cap_markets","corp_dev"], xp:75, col:4, row:3,
    milestones:["Draft a quarterly investor update or board memo","Prepare a lender presentation with credit metrics","Write a narrative connecting financial results to strategic positioning","Explain how you would communicate a missed quarter to the board"] },
  { id:"risk_mgmt", label:"Risk Management", t:3, b:"leadership", desc:"Enterprise risk, hedging, derivatives, compliance. When AI gets it wrong, the CFO is still accountable.", req:["macro","controllership"], xp:75, col:5.2, row:3,
    milestones:["Map an enterprise risk matrix (likelihood vs impact) for a real company","Analyze a hedging strategy: instrument, risk being hedged, and cost","Write a risk memo for a board: top 5 risks and mitigation plans","Explain risk retention vs neutralization vs transfer with examples"] },
  { id:"cfo", label:"CFO", t:4, b:null, desc:"Talk to investors. Own the numbers. Allocate capital. Manage risk. Drive performance. Be accountable.", req:["cap_alloc","performance","stakeholders","risk_mgmt"], xp:100, col:3, row:4,
    milestones:["Write a strategic plan integrating capital allocation, performance, stakeholders, and risk","Present a full narrative: where we are, where we are going, how we get there, what could go wrong"] },
];

export const C2N = {
  "Finance Foundation":["root"],
  "Controllership & Reporting":["controllership","risk_mgmt"],
  "FP&A & Modeling":["fpa","valuation","performance"],
  "Capital Markets & Financing":["cap_markets","valuation","cap_alloc"],
  "M&A / Corporate Development":["corp_dev","performance","stakeholders"],
  "Valuation & Analysis":["valuation","cap_alloc"],
  "Macro & Economic Frameworks":["macro","cap_alloc","risk_mgmt"],
  "AI & Finance Transformation":["ai_transform","performance"],
  "Risk Management & Compliance":["risk_mgmt","controllership"],
  "Leadership & Stakeholders":["stakeholders","cfo"],
  "Capital Allocation & Strategy":["cap_alloc","macro"],
  "Treasury & Cash Management":["controllership","risk_mgmt"],
  "Writing & Communication":["stakeholders"],
  "History & Pattern Recognition":["cap_alloc","macro"],
};

export const CATS = Object.keys(C2N);

export const SIG_TYPES = [
  { id: "article", label: "Article", icon: "📰", color: "#e8d5c0" },
  { id: "tweet", label: "Tweet/Post", icon: "💬", color: "#d0e0f0" },
  { id: "podcast", label: "Podcast", icon: "🎙", color: "#d5e8d0" },
  { id: "book", label: "Book/Paper", icon: "📕", color: "#e0d0e8" },
  { id: "observation", label: "Observation", icon: "👁", color: "#f0e8d0" },
  { id: "thread", label: "Thread/Essay", icon: "🧵", color: "#d0e8e8" },
];
