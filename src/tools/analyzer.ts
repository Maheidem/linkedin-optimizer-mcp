import { z } from 'zod';

export const analyzeProfileTool = {
  name: 'analyze_profile',
  description: 'Analyze LinkedIn profile and provide optimization recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      profileData: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          summary: { type: 'string' },
          experience: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' }
              }
            }
          },
          skills: {
            type: 'array',
            items: { type: 'string' }
          },
          connections: { type: 'number' },
          hasProfilePhoto: { type: 'boolean' },
          hasBanner: { type: 'boolean' },
          hasFeatured: { type: 'boolean' }
        },
        description: 'Current LinkedIn profile data'
      }
    },
    required: ['profileData']
  }
};

const ProfileDataSchema = z.object({
  profileData: z.object({
    headline: z.string().optional(),
    summary: z.string().optional(),
    experience: z.array(z.object({
      title: z.string(),
      description: z.string().optional()
    })).optional(),
    skills: z.array(z.string()).optional(),
    connections: z.number().optional(),
    hasProfilePhoto: z.boolean().optional(),
    hasBanner: z.boolean().optional(),
    hasFeatured: z.boolean().optional()
  })
});

export async function analyzeProfile(params: unknown) {
  const { profileData } = ProfileDataSchema.parse(params);
  
  const analysis = {
    score: calculateProfileScore(profileData),
    sections: analyzeSections(profileData),
    keywords: analyzeKeywords(profileData),
    recommendations: generateRecommendations(profileData),
    quickWins: identifyQuickWins(profileData),
    comparison: compareTobestPractices(profileData)
  };

  return {
    overallScore: `${analysis.score}/100`,
    scoreBreakdown: analysis.sections,
    criticalGaps: analysis.recommendations.filter(r => r.priority === 'high'),
    quickWins: analysis.quickWins,
    keywordAnalysis: analysis.keywords,
    actionPlan: createActionPlan(analysis),
    estimatedImpact: estimateImpact(analysis.score)
  };
}

function calculateProfileScore(profile: any): number {
  let score = 0;
  
  // Basic profile elements (40 points)
  if (profile.hasProfilePhoto) score += 10;
  if (profile.hasBanner) score += 5;
  if (profile.headline && profile.headline.length > 50) score += 10;
  if (profile.summary && profile.summary.length > 100) score += 15;
  
  // Content quality (30 points)
  if (profile.headline && profile.headline.length > 150) score += 5;
  if (profile.summary && profile.summary.length > 500) score += 10;
  if (profile.experience?.some((exp: any) => exp.description?.length > 100)) score += 10;
  if (profile.skills && profile.skills.length >= 10) score += 5;
  
  // Advanced features (20 points)
  if (profile.hasFeatured) score += 10;
  if (profile.skills && profile.skills.length >= 20) score += 5;
  if (profile.connections && profile.connections > 500) score += 5;
  
  // Engagement indicators (10 points)
  if (profile.summary?.includes('contact') || profile.summary?.includes('reach')) score += 5;
  if (profile.headline?.includes('|')) score += 5;
  
  return Math.min(score, 100);
}

function analyzeSections(profile: any) {
  return {
    headline: {
      score: profile.headline ? (profile.headline.length > 150 ? 90 : 60) : 0,
      status: profile.headline ? 'present' : 'missing',
      quality: profile.headline?.length > 150 ? 'good' : 'needs improvement'
    },
    summary: {
      score: profile.summary ? (profile.summary.length > 500 ? 85 : 50) : 0,
      status: profile.summary ? 'present' : 'missing',
      quality: profile.summary?.length > 500 ? 'good' : 'needs expansion'
    },
    experience: {
      score: profile.experience?.length > 0 ? 70 : 0,
      status: profile.experience?.length > 0 ? 'present' : 'missing',
      quality: profile.experience?.some((e: any) => e.description) ? 'detailed' : 'needs detail'
    },
    skills: {
      score: profile.skills ? (profile.skills.length >= 15 ? 80 : 50) : 0,
      count: profile.skills?.length || 0,
      quality: profile.skills?.length >= 15 ? 'comprehensive' : 'needs more'
    }
  };
}

function analyzeKeywords(profile: any): any {
  const text = [
    profile.headline || '',
    profile.summary || '',
    ...(profile.experience?.map((e: any) => e.description || '') || [])
  ].join(' ').toLowerCase();
  
  const keywords = extractKeywords(text);
  const density = calculateKeywordDensity(keywords, text);
  
  return {
    topKeywords: keywords.slice(0, 10),
    density,
    missing: identifyMissingKeywords(profile),
    optimization: keywords.length < 20 ? 'low' : 'good'
  };
}

function generateRecommendations(profile: any): any[] {
  const recommendations = [];
  
  if (!profile.headline || profile.headline.length < 100) {
    recommendations.push({
      section: 'headline',
      issue: 'Headline too short or missing',
      recommendation: 'Expand headline to 200+ characters with keywords',
      priority: 'high',
      impact: 'high'
    });
  }
  
  if (!profile.summary) {
    recommendations.push({
      section: 'summary',
      issue: 'No About section',
      recommendation: 'Add comprehensive About section (1000+ characters)',
      priority: 'high',
      impact: 'high'
    });
  }
  
  if (!profile.skills || profile.skills.length < 10) {
    recommendations.push({
      section: 'skills',
      issue: 'Insufficient skills listed',
      recommendation: 'Add 15-20 relevant skills for better discoverability',
      priority: 'medium',
      impact: 'medium'
    });
  }
  
  if (!profile.hasFeatured) {
    recommendations.push({
      section: 'featured',
      issue: 'No featured content',
      recommendation: 'Add 2-3 featured posts or media',
      priority: 'medium',
      impact: 'medium'
    });
  }
  
  return recommendations;
}

function identifyQuickWins(profile: any): string[] {
  const quickWins = [];
  
  if (!profile.hasBanner) quickWins.push('Add a professional banner image (5 minutes)');
  if (profile.headline && profile.headline.length < 100) quickWins.push('Expand headline with keywords (10 minutes)');
  if (!profile.skills || profile.skills.length < 5) quickWins.push('Add 10+ relevant skills (15 minutes)');
  if (!profile.summary) quickWins.push('Write compelling About section (30 minutes)');
  
  return quickWins;
}

function compareTobestPractices(profile: any): any {
  return {
    headline: {
      current: profile.headline?.length || 0,
      bestPractice: 220,
      gap: 220 - (profile.headline?.length || 0)
    },
    summary: {
      current: profile.summary?.length || 0,
      bestPractice: 1500,
      gap: 1500 - (profile.summary?.length || 0)
    },
    skills: {
      current: profile.skills?.length || 0,
      bestPractice: 20,
      gap: 20 - (profile.skills?.length || 0)
    }
  };
}

function createActionPlan(analysis: any): any[] {
  return [
    {
      week: 1,
      tasks: analysis.quickWins.slice(0, 3),
      estimatedTime: '1 hour',
      expectedImpact: '+20 points'
    },
    {
      week: 2,
      tasks: ['Optimize all experience descriptions', 'Request skill endorsements'],
      estimatedTime: '2 hours',
      expectedImpact: '+15 points'
    },
    {
      week: 3,
      tasks: ['Create and add featured content', 'Engage with network posts'],
      estimatedTime: '2 hours',
      expectedImpact: '+10 points'
    }
  ];
}

function estimateImpact(currentScore: number): any {
  const newScore = Math.min(currentScore + 45, 100);
  return {
    currentVisibility: `${currentScore}%`,
    projectedVisibility: `${newScore}%`,
    profileViews: '+50-100% increase expected',
    searchAppearances: '+75-150% increase expected',
    timeToResults: '2-4 weeks'
  };
}

function extractKeywords(text: string): string[] {
  const words = text.split(/\s+/);
  const wordCount: Record<string, number> = {};
  
  words.forEach(word => {
    if (word.length > 3) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

function calculateKeywordDensity(keywords: string[], text: string): number {
  const totalWords = text.split(/\s+/).length;
  const keywordCount = keywords.slice(0, 10).reduce((sum, keyword) => {
    const regex = new RegExp(keyword, 'gi');
    const matches = text.match(regex);
    return sum + (matches ? matches.length : 0);
  }, 0);
  
  return Math.round((keywordCount / totalWords) * 100);
}

function identifyMissingKeywords(profile: any): string[] {
  const commonKeywords = [
    'leadership', 'strategy', 'innovation', 'collaboration',
    'results-driven', 'expertise', 'solutions', 'growth'
  ];
  
  const profileText = [
    profile.headline || '',
    profile.summary || ''
  ].join(' ').toLowerCase();
  
  return commonKeywords.filter(keyword => 
    !profileText.includes(keyword)
  );
}