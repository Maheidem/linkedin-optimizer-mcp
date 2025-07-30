#!/usr/bin/env node
"use strict";
/**
 * Working LinkedIn API MCP Server
 * Uses available permissions: OpenID Connect and email access
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const server = new index_js_1.Server({
    name: 'linkedin-working-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Configuration
const config = {
    clientId: '77dvmuotbmd8gx',
    clientSecret: 'WPL_AP1.w8905sdXttgXXHCV.pZR0rg==',
    redirectUri: 'http://localhost:3000/callback',
};
// Available tools with current permissions
const WORKING_TOOLS = [
    {
        name: 'linkedin_get_auth_url',
        description: 'Generate LinkedIn OAuth authorization URL',
        inputSchema: {
            type: 'object',
            properties: {
                state: { type: 'string', description: 'Optional state parameter' }
            }
        }
    },
    {
        name: 'linkedin_exchange_code',
        description: 'Exchange authorization code for access token',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Authorization code from callback' }
            },
            required: ['code']
        }
    },
    {
        name: 'linkedin_get_user_info',
        description: 'Get user information via OpenID Connect (WORKS with current permissions)',
        inputSchema: {
            type: 'object',
            properties: {
                accessToken: { type: 'string', description: 'LinkedIn access token' }
            },
            required: ['accessToken']
        }
    },
    {
        name: 'linkedin_analyze_profile_from_data',
        description: 'Analyze LinkedIn profile data and provide optimization recommendations',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Full name' },
                currentHeadline: { type: 'string', description: 'Current LinkedIn headline' },
                currentSummary: { type: 'string', description: 'Current about section' },
                skills: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of current skills'
                },
                industry: { type: 'string', description: 'Industry/field' },
                experience: { type: 'string', description: 'Years of experience' }
            },
            required: ['name']
        }
    },
    {
        name: 'linkedin_generate_optimized_content',
        description: 'Generate optimized LinkedIn content (headlines, summaries, posts)',
        inputSchema: {
            type: 'object',
            properties: {
                contentType: {
                    type: 'string',
                    enum: ['headline', 'summary', 'post', 'experience'],
                    description: 'Type of content to generate'
                },
                currentRole: { type: 'string', description: 'Current job title' },
                skills: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Key skills'
                },
                achievements: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Key achievements or metrics'
                },
                industry: { type: 'string', description: 'Industry/field' },
                tone: {
                    type: 'string',
                    enum: ['professional', 'conversational', 'creative'],
                    description: 'Content tone'
                }
            },
            required: ['contentType', 'currentRole']
        }
    },
    {
        name: 'linkedin_request_profile_api_access',
        description: 'Generate application text for requesting LinkedIn Profile API access',
        inputSchema: {
            type: 'object',
            properties: {
                useCase: {
                    type: 'string',
                    description: 'How you plan to use the Profile API'
                },
                userBenefit: {
                    type: 'string',
                    description: 'How LinkedIn users will benefit'
                }
            }
        }
    }
];
// Handler for listing available tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return { tools: WORKING_TOOLS };
});
// Handler for tool execution
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'linkedin_get_auth_url':
                return getAuthUrl(args);
            case 'linkedin_exchange_code':
                return exchangeCode(args);
            case 'linkedin_get_user_info':
                return getUserInfo(args);
            case 'linkedin_analyze_profile_from_data':
                return analyzeProfileFromData(args);
            case 'linkedin_generate_optimized_content':
                return generateOptimizedContent(args);
            case 'linkedin_request_profile_api_access':
                return requestProfileApiAccess(args);
            default:
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
    }
    catch (error) {
        if (error instanceof types_js_1.McpError)
            throw error;
        throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// Tool implementations
function getAuthUrl(args) {
    const state = args.state || `state_${Date.now()}`;
    const scopes = ['openid', 'profile', 'email', 'w_member_social'];
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', scopes.join(' '));
    return {
        authorizationUrl: authUrl.toString(),
        state,
        instructions: [
            '1. Copy the URL and open in browser',
            '2. Authorize the LinkedIn app',
            '3. Copy the code from redirect URL',
            '4. Use linkedin_exchange_code with the code'
        ]
    };
}
async function exchangeCode(args) {
    const { code } = args;
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
    });
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        },
        body: params,
    });
    if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
    }
    const tokenData = await response.json();
    return {
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        message: 'Token obtained successfully! Save this securely.',
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
    };
}
async function getUserInfo(args) {
    const { accessToken } = args;
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`User info fetch failed: ${response.status}`);
    }
    const userInfo = await response.json();
    return {
        userInfo,
        message: 'User information retrieved successfully via OpenID Connect',
        availableData: {
            name: userInfo.name,
            email: userInfo.email,
            firstName: userInfo.given_name,
            lastName: userInfo.family_name,
            profilePicture: userInfo.picture,
            linkedinId: userInfo.sub
        }
    };
}
function analyzeProfileFromData(args) {
    const { name, currentHeadline, currentSummary, skills = [], industry, experience } = args;
    const analysis = {
        profileCompleteness: calculateCompleteness(args),
        recommendations: generateRecommendations(args),
        missingElements: identifyMissingElements(args),
        optimizationOpportunities: findOptimizationOpportunities(args)
    };
    return {
        analysis,
        profileData: {
            name,
            headline: currentHeadline,
            summary: currentSummary,
            skills,
            industry,
            experience
        },
        nextSteps: [
            'Use linkedin_generate_optimized_content to create improved headlines/summaries',
            'Request Profile API access to enable automatic posting',
            'Implement recommended improvements manually'
        ]
    };
}
function generateOptimizedContent(args) {
    const { contentType, currentRole, skills = [], achievements = [], industry, tone = 'professional' } = args;
    const generators = {
        headline: () => generateHeadlines(currentRole, skills, industry),
        summary: () => generateSummaries(currentRole, skills, achievements, tone),
        post: () => generatePosts(currentRole, skills, industry),
        experience: () => generateExperienceDescriptions(currentRole, achievements)
    };
    const content = generators[contentType]?.() || { error: 'Invalid content type' };
    return {
        contentType,
        generatedContent: content,
        tips: getContentTips(contentType),
        nextSteps: [
            'Review and customize the generated content',
            'Copy and paste manually to LinkedIn',
            'Test different variations for best results'
        ]
    };
}
function requestProfileApiAccess(args) {
    const { useCase = 'Profile optimization and management', userBenefit = 'Help users optimize their LinkedIn profiles' } = args;
    return {
        applicationText: `
**LinkedIn Profile API Access Request**

**Use Case:** ${useCase}

**User Benefit:** ${userBenefit}

**Technical Requirements:**
- Read access to user profile data (r_liteprofile)
- Basic profile information access (r_basicprofile)
- Ability to help users optimize their LinkedIn presence

**Implementation Plan:**
1. Fetch user profile data with consent
2. Analyze profile completeness and optimization opportunities
3. Generate personalized recommendations
4. Provide content suggestions for headlines, summaries, and posts
5. Track profile improvement metrics

**Data Usage:**
- Profile data used only for optimization recommendations
- No data storage beyond session duration  
- User maintains full control over their information
- Compliance with LinkedIn's data policies

**Business Value:**
- Helps LinkedIn users create more engaging profiles
- Increases user engagement and platform activity
- Supports LinkedIn's mission of connecting professionals
    `,
        submitInstructions: [
            '1. Go to https://www.linkedin.com/developers/apps/8894534949/products',
            '2. Find "Profile API" product',
            '3. Click "Request access"',
            '4. Paste the application text above',
            '5. Submit and wait for review (typically 2-4 weeks)'
        ],
        currentStatus: 'You have basic OpenID access but need Profile API for full functionality'
    };
}
// Helper functions
function calculateCompleteness(data) {
    let score = 0;
    if (data.name)
        score += 20;
    if (data.currentHeadline)
        score += 25;
    if (data.currentSummary)
        score += 30;
    if (data.skills?.length > 0)
        score += 15;
    if (data.industry)
        score += 10;
    return Math.min(score, 100);
}
function generateRecommendations(data) {
    const recommendations = [];
    if (!data.currentHeadline)
        recommendations.push('Add a compelling headline');
    if (!data.currentSummary)
        recommendations.push('Write a detailed About section');
    if (!data.skills?.length)
        recommendations.push('Add relevant skills');
    if (!data.industry)
        recommendations.push('Specify your industry');
    return recommendations;
}
function identifyMissingElements(data) {
    const missing = [];
    if (!data.currentHeadline)
        missing.push('Professional headline');
    if (!data.currentSummary)
        missing.push('About section');
    if (!data.skills?.length)
        missing.push('Skills section');
    return missing;
}
function findOptimizationOpportunities(data) {
    const opportunities = [];
    if (data.currentHeadline?.length < 100)
        opportunities.push('Expand headline to use more characters');
    if (data.currentSummary?.length < 500)
        opportunities.push('Expand About section');
    if (data.skills?.length < 10)
        opportunities.push('Add more relevant skills');
    return opportunities;
}
function generateHeadlines(role, skills, industry) {
    return {
        options: [
            `${role} | ${skills.slice(0, 3).join(' & ')} Expert | ${industry || 'Innovation'} Leader`,
            `${role} specializing in ${skills.slice(0, 2).join(' & ')} | Building Solutions at Scale`,
            `Senior ${role} | ${skills[0]} & ${skills[1]} Specialist | Driving Results`
        ],
        tips: ['Use all 220 characters', 'Include top 3-5 skills', 'Add quantifiable impact if possible']
    };
}
function generateSummaries(role, skills, achievements, tone) {
    const toneTemplates = {
        professional: `As a ${role}, I specialize in ${skills.slice(0, 3).join(', ')}. ${achievements[0] ? `Key achievement: ${achievements[0]}.` : ''}\n\nCore competencies:\n${skills.map(s => `• ${s}`).join('\n')}`,
        conversational: `Hi! I'm a ${role} who loves ${skills[0]} and ${skills[1]}. ${achievements[0] ? `Recently, I ${achievements[0]}.` : ''}\n\nWhat I bring:\n${skills.slice(0, 5).map(s => `• ${s}`).join('\n')}`,
        creative: `🚀 ${role} on a mission to transform ideas into reality through ${skills[0]} and ${skills[1]}. ${achievements[0] ? `Proud moment: ${achievements[0]}.` : ''}`
    };
    return {
        summary: toneTemplates[tone] || toneTemplates.professional,
        tips: ['Keep under 2000 characters', 'Start strong', 'Include achievements', 'End with call-to-action']
    };
}
function generatePosts(role, skills, industry) {
    return {
        posts: [
            `💡 As a ${role}, I've learned that ${skills[0]} is just the beginning. The real magic happens when you combine it with ${skills[1]} and ${skills[2] || 'strategic thinking'}. What's your experience? #${industry || 'Professional'}Development`,
            `🚀 Quick tip for fellow ${role}s: Focus on mastering ${skills[0]} first, then layer on ${skills[1]}. This approach has transformed how I approach projects. What skills do you prioritize?`,
            `📈 The ${industry || 'tech'} landscape is evolving rapidly. As a ${role}, staying current with ${skills[0]} and ${skills[1]} has been crucial for my growth. What trends are you watching?`
        ],
        tips: ['Ask questions to drive engagement', 'Use relevant hashtags', 'Share personal insights']
    };
}
function generateExperienceDescriptions(role, achievements) {
    return {
        descriptions: [
            `${role} responsible for ${achievements[0] || 'key project delivery'}. Managed cross-functional teams and delivered measurable business impact.`,
            `Led ${role} initiatives focusing on ${achievements[0] || 'process optimization'}. Collaborated with stakeholders to drive strategic outcomes.`
        ],
        tips: ['Start with action verbs', 'Include quantifiable results', 'Show progression and growth']
    };
}
function getContentTips(contentType) {
    const tipMap = {
        headline: ['Use all 220 characters', 'Include 3-5 keywords', 'Show value proposition'],
        summary: ['Hook in first line', 'Include achievements', 'End with call-to-action'],
        post: ['Ask engaging questions', 'Use storytelling', 'Include relevant hashtags'],
        experience: ['Use action verbs', 'Quantify impact', 'Show progression']
    };
    return tipMap[contentType] || ['Be authentic', 'Stay professional', 'Show value'];
}
// Start the server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('LinkedIn Working MCP server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=linkedin-working-mcp.js.map