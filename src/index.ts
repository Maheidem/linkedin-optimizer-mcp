#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { generateHeadlineTool, generateHeadline } from './tools/generator.js';
import { analyzeProfileTool, analyzeProfile } from './tools/analyzer.js';

const server = new Server(
  {
    name: 'linkedin-optimizer-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      generateHeadlineTool,
      analyzeProfileTool,
      {
        name: 'generate_summary',
        description: 'Generate optimized LinkedIn About/Summary section',
        inputSchema: {
          type: 'object',
          properties: {
            role: { type: 'string', description: 'Current role/title' },
            experience: { type: 'string', description: 'Years of experience' },
            skills: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'List of key skills'
            },
            achievements: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Key achievements or metrics'
            },
            tone: {
              type: 'string',
              enum: ['professional', 'conversational', 'storytelling'],
              description: 'Writing tone preference'
            }
          },
          required: ['role', 'skills']
        }
      },
      {
        name: 'create_update_guide',
        description: 'Create step-by-step guide for updating LinkedIn profile',
        inputSchema: {
          type: 'object',
          properties: {
            updates: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['headline', 'summary', 'experience', 'skills', 'featured']
              },
              description: 'Profile sections to update'
            },
            currentProfile: {
              type: 'object',
              description: 'Current profile data (optional)'
            }
          },
          required: ['updates']
        }
      },
      {
        name: 'track_updates',
        description: 'Track LinkedIn profile update progress',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['start', 'complete', 'status'],
              description: 'Tracking action'
            },
            section: {
              type: 'string',
              description: 'Profile section being updated'
            },
            notes: {
              type: 'string',
              description: 'Additional notes or feedback'
            }
          },
          required: ['action']
        }
      }
    ],
  };
});

// Handler for tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_headline':
        return await generateHeadline(args);

      case 'analyze_profile':
        return await analyzeProfile(args);

      case 'generate_summary':
        return generateSummary(args);

      case 'create_update_guide':
        return createUpdateGuide(args);

      case 'track_updates':
        return trackUpdates(args);

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error}`
    );
  }
});

// Tool implementations
function generateSummary(args: any) {
  const { role, experience, skills, achievements, tone = 'professional' } = args;
  
  const templates = {
    professional: `As a ${role}${experience ? ` with ${experience}` : ''}, I specialize in ${skills.slice(0, 3).join(', ')}. ${achievements?.[0] ? `Key achievement: ${achievements[0]}.` : ''}\n\nCore competencies:\n${skills.map(s => `• ${s}`).join('\n')}\n\nI'm passionate about leveraging technology to solve complex problems and drive innovation.`,
    
    conversational: `Hi! I'm a ${role} who loves ${skills[0]} and ${skills[1]}. ${experience ? `Over ${experience}, I've` : "I've"} had the opportunity to ${achievements?.[0] || 'work on exciting projects'}.\n\nWhat I bring to the table:\n${skills.slice(0, 5).map(s => `• ${s}`).join('\n')}\n\nAlways excited to connect with fellow professionals and explore new opportunities!`,
    
    storytelling: `My journey as a ${role} began with a fascination for ${skills[0]}. ${experience ? `${experience} later` : 'Today'}, I've evolved into a specialist in ${skills.slice(0, 3).join(', ')}.\n\n${achievements?.[0] ? `One of my proudest moments was ${achievements[0]}.` : ''}\n\nI believe in the power of ${skills[1]} to transform businesses and create meaningful impact.`
  };

  return {
    summaries: [templates[tone as keyof typeof templates]],
    tips: [
      'Keep it under 2000 characters',
      'Start with a strong opening statement',
      'Include quantifiable achievements',
      'End with a call to action',
      'Use keywords naturally throughout'
    ],
    keywords: extractKeywords(skills, role)
  };
}

function createUpdateGuide(args: any) {
  const { updates } = args;
  
  const steps = updates.map((section: string, index: number) => ({
    step: index + 1,
    section,
    instructions: getInstructionsForSection(section),
    timeEstimate: getTimeEstimate(section)
  }));

  return {
    guide: steps,
    totalTime: steps.reduce((acc: number, step: any) => acc + step.timeEstimate, 0),
    tips: [
      'Update one section at a time',
      'Preview changes before saving',
      'Check on mobile view',
      'Ask for endorsements after skills update'
    ]
  };
}

function trackUpdates(args: any) {
  const { action, section, notes } = args;
  
  // In a real implementation, this would persist data
  const mockProgress = {
    headline: 'completed',
    summary: 'in-progress',
    experience: 'pending',
    skills: 'pending',
    featured: 'pending'
  };

  switch (action) {
    case 'start':
      return { 
        message: `Started updating ${section}`,
        status: 'in-progress' 
      };
    
    case 'complete':
      return { 
        message: `Completed updating ${section}`,
        status: 'completed',
        nextStep: getNextSection(section)
      };
    
    case 'status':
      return {
        progress: mockProgress,
        completionRate: '40%',
        nextActions: ['Complete summary section', 'Update experience with metrics']
      };
    
    default:
      return { message: 'Unknown action' };
  }
}

// Helper functions
function extractKeywords(skills: string[], role: string): string[] {
  const commonKeywords = ['leadership', 'innovation', 'strategy', 'collaboration'];
  return [...new Set([...skills.slice(0, 5), role.split(' ')[0], ...commonKeywords])];
}

function getInstructionsForSection(section: string): string[] {
  const instructions: Record<string, string[]> = {
    headline: [
      'Click the edit icon next to your name',
      'Clear the current headline',
      'Paste your optimized headline',
      'Review and save'
    ],
    summary: [
      'Scroll to About section',
      'Click the edit icon',
      'Replace with optimized summary',
      'Format with line breaks',
      'Save changes'
    ],
    experience: [
      'Go to Experience section',
      'Click edit on current role',
      'Update description with achievements',
      'Add relevant skills',
      'Save and review'
    ],
    skills: [
      'Navigate to Skills section',
      'Click "Add a skill"',
      'Add recommended skills one by one',
      'Reorder by relevance',
      'Pin top 3 skills'
    ],
    featured: [
      'Go to Featured section',
      'Click the + icon',
      'Choose content type',
      'Upload or link content',
      'Add description'
    ]
  };
  
  return instructions[section] || ['Navigate to section', 'Make updates', 'Save'];
}

function getTimeEstimate(section: string): number {
  const estimates: Record<string, number> = {
    headline: 2,
    summary: 5,
    experience: 10,
    skills: 8,
    featured: 5
  };
  return estimates[section] || 5;
}

function getNextSection(currentSection: string): string {
  const order = ['headline', 'summary', 'experience', 'skills', 'featured'];
  const currentIndex = order.indexOf(currentSection);
  return currentIndex < order.length - 1 ? order[currentIndex + 1] : 'complete';
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('LinkedIn Optimizer MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});