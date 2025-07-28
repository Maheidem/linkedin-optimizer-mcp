import { z } from 'zod';

export const generateHeadlineTool = {
  name: 'generate_headline',
  description: 'Generate optimized LinkedIn headline options',
  inputSchema: {
    type: 'object',
    properties: {
      currentRole: { 
        type: 'string',
        description: 'Your current job title'
      },
      skills: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'List of your key skills'
      },
      targetKeywords: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Keywords you want to rank for'
      },
      style: { 
        type: 'string', 
        enum: ['professional', 'creative', 'technical', 'leadership'],
        description: 'Headline style preference'
      },
      industry: {
        type: 'string',
        description: 'Your industry or domain'
      }
    },
    required: ['currentRole', 'skills']
  }
};

const HeadlineParamsSchema = z.object({
  currentRole: z.string(),
  skills: z.array(z.string()),
  targetKeywords: z.array(z.string()).optional(),
  style: z.enum(['professional', 'creative', 'technical', 'leadership']).optional(),
  industry: z.string().optional()
});

export async function generateHeadline(params: unknown) {
  const { currentRole, skills, targetKeywords, style = 'professional', industry } = 
    HeadlineParamsSchema.parse(params);
  
  const styleTemplates = {
    professional: [
      `${currentRole} | ${skills.slice(0, 3).join(' & ')} Expert | ${targetKeywords?.[0] || industry || 'Innovation'} Leader`,
      `${currentRole} specializing in ${skills.slice(0, 2).join(' & ')} | Building ${targetKeywords?.[0] || 'Solutions'} at Scale`,
      `${currentRole} | ${skills[0]} & ${skills[1]} Specialist | Driving ${targetKeywords?.[0] || 'Digital Transformation'}`
    ],
    creative: [
      `${currentRole} 🚀 Transforming ${industry || 'Industries'} through ${skills[0]} & ${skills[1]}`,
      `${skills[0]} Enthusiast | ${currentRole} | Creating ${targetKeywords?.[0] || 'Impact'} Daily`,
      `${currentRole} by Day, ${skills[0]} Innovator by Design | ${targetKeywords?.[0] || 'Future'}-Focused`
    ],
    technical: [
      `${currentRole} | ${skills.join(', ')} | Building ${targetKeywords?.[0] || 'Systems'} That Scale`,
      `Senior ${currentRole} | ${skills[0]}, ${skills[1]}, ${skills[2] || 'Architecture'} Expert`,
      `${currentRole} specializing in ${skills[0]} Architecture & ${skills[1]} Implementation`
    ],
    leadership: [
      `${currentRole} | Leading Teams in ${skills[0]} & ${skills[1]} | ${targetKeywords?.[0] || 'Strategic'} Vision`,
      `${currentRole} & ${skills[0]} Leader | Building High-Performance ${targetKeywords?.[0] || 'Teams'}`,
      `Executive ${currentRole} | ${skills[0]} Strategy | Transforming ${industry || 'Organizations'}`
    ]
  };

  const headlines = styleTemplates[style].map(template => ({
    text: template.substring(0, 220), // LinkedIn's character limit
    length: template.length,
    keywords: extractHeadlineKeywords(template)
  }));

  return {
    headlines: headlines.map(h => h.text),
    analysis: headlines.map(h => ({
      length: `${h.length}/220 characters`,
      keywordCount: h.keywords.length,
      keywords: h.keywords
    })),
    tips: [
      'Use all 220 characters for maximum visibility',
      'Include 3-5 relevant keywords naturally',
      'Lead with your current role for clarity',
      'Add measurable impact if possible',
      `Consider industry terms: ${getIndustryKeywords(industry).join(', ')}`
    ],
    bestPractices: {
      structure: 'Role | Skills | Value Proposition',
      length: '200-220 characters',
      keywords: '3-5 relevant terms',
      uniqueness: 'Differentiate from standard titles'
    }
  };
}

function extractHeadlineKeywords(headline: string): string[] {
  const commonWords = new Set(['the', 'and', 'or', 'in', 'at', 'by', 'for', '&', '|']);
  return headline
    .toLowerCase()
    .split(/[\s|,&]+/)
    .filter(word => word.length > 3 && !commonWords.has(word))
    .slice(0, 5);
}

function getIndustryKeywords(industry?: string): string[] {
  const industryKeywords: Record<string, string[]> = {
    tech: ['AI', 'ML', 'Cloud', 'DevOps', 'SaaS'],
    finance: ['FinTech', 'Risk', 'Compliance', 'Trading', 'Analytics'],
    healthcare: ['HealthTech', 'Clinical', 'Patient Care', 'Medical', 'Pharma'],
    marketing: ['Digital', 'Growth', 'Brand', 'Content', 'SEO'],
    default: ['Innovation', 'Strategy', 'Leadership', 'Growth', 'Excellence']
  };
  
  const key = industry?.toLowerCase() || 'default';
  return industryKeywords[key] || industryKeywords.default;
}