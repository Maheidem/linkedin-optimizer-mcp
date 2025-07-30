#!/usr/bin/env node
"use strict";
/**
 * Comprehensive LinkedIn API MCP Server
 * Exposes ALL LinkedIn API endpoints through Model Context Protocol
 * Requires LinkedIn Partner Program approval for full functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const linkedin_client_js_1 = require("./api/linkedin-client.js");
const server = new index_js_1.Server({
    name: 'linkedin-api-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Initialize LinkedIn API client
const linkedinClient = new linkedin_client_js_1.LinkedInAPIClient({
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/callback',
    apiVersion: '202504', // Latest 2025 version
});
// Complete LinkedIn API tools catalog
const LINKEDIN_API_TOOLS = [
    // AUTHENTICATION & AUTHORIZATION
    {
        name: 'linkedin_oauth_get_auth_url',
        description: 'Generate OAuth 2.0 authorization URL for LinkedIn authentication',
        inputSchema: {
            type: 'object',
            properties: {
                scopes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'LinkedIn API scopes (r_liteprofile, r_emailaddress, w_member_social, etc.)'
                },
                state: { type: 'string', description: 'CSRF protection state parameter' },
                usePKCE: { type: 'boolean', description: 'Use PKCE flow for native apps' }
            },
            required: ['scopes']
        }
    },
    {
        name: 'linkedin_oauth_exchange_code',
        description: 'Exchange authorization code for access token',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Authorization code from callback' },
                state: { type: 'string', description: 'State parameter for verification' },
                codeVerifier: { type: 'string', description: 'PKCE code verifier (if used)' }
            },
            required: ['code']
        }
    },
    {
        name: 'linkedin_oauth_refresh_token',
        description: 'Refresh expired access token',
        inputSchema: {
            type: 'object',
            properties: {
                refreshToken: { type: 'string', description: 'Valid refresh token' }
            },
            required: ['refreshToken']
        }
    },
    // PROFILE & PEOPLE APIs
    {
        name: 'linkedin_people_get_profile',
        description: 'Get member profile information',
        inputSchema: {
            type: 'object',
            properties: {
                personId: { type: 'string', description: 'LinkedIn person ID (optional, defaults to authenticated user)' },
                fields: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Profile fields to retrieve (id, firstName, lastName, headline, etc.)'
                }
            }
        }
    },
    {
        name: 'linkedin_people_search_members',
        description: 'Search for LinkedIn members',
        inputSchema: {
            type: 'object',
            properties: {
                keywords: { type: 'string', description: 'Search keywords' },
                facets: { type: 'object', description: 'Search facets (location, industry, etc.)' },
                start: { type: 'number', description: 'Pagination start' },
                count: { type: 'number', description: 'Number of results (max 100)' }
            }
        }
    },
    // ORGANIZATIONS & COMPANIES APIs
    {
        name: 'linkedin_organizations_get_company',
        description: 'Get organization/company information',
        inputSchema: {
            type: 'object',
            properties: {
                organizationId: { type: 'string', description: 'LinkedIn organization ID' },
                fields: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Organization fields (id, name, description, industry, etc.)'
                }
            },
            required: ['organizationId']
        }
    },
    {
        name: 'linkedin_organizations_get_follower_stats',
        description: 'Get organization follower statistics',
        inputSchema: {
            type: 'object',
            properties: {
                organizationId: { type: 'string', description: 'LinkedIn organization ID' },
                timeIntervals: { type: 'object', description: 'Time range for statistics' }
            },
            required: ['organizationId']
        }
    },
    // CONTENT APIs (POSTS, UGC, ASSETS)
    {
        name: 'linkedin_posts_create',
        description: 'Create a new LinkedIn post using Posts API',
        inputSchema: {
            type: 'object',
            properties: {
                author: { type: 'string', description: 'Author URN (person or organization)' },
                postType: {
                    type: 'string',
                    enum: ['TEXT', 'IMAGE', 'VIDEO', 'ARTICLE', 'POLL', 'MULTI_IMAGE'],
                    description: 'Type of post to create'
                },
                text: { type: 'string', description: 'Post text content' },
                media: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['IMAGE', 'VIDEO'] },
                            url: { type: 'string' },
                            altText: { type: 'string' }
                        }
                    },
                    description: 'Media attachments'
                },
                articleLink: { type: 'string', description: 'Article URL for article posts' },
                pollOptions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Poll options for poll posts'
                },
                visibility: {
                    type: 'string',
                    enum: ['PUBLIC', 'CONNECTIONS', 'LOGGED_IN_USERS'],
                    description: 'Post visibility'
                }
            },
            required: ['author', 'postType']
        }
    },
    {
        name: 'linkedin_posts_get',
        description: 'Retrieve LinkedIn posts',
        inputSchema: {
            type: 'object',
            properties: {
                postId: { type: 'string', description: 'Specific post ID to retrieve' },
                author: { type: 'string', description: 'Filter by author URN' },
                start: { type: 'number', description: 'Pagination start' },
                count: { type: 'number', description: 'Number of posts to retrieve' }
            }
        }
    },
    {
        name: 'linkedin_posts_update',
        description: 'Update an existing LinkedIn post',
        inputSchema: {
            type: 'object',
            properties: {
                postId: { type: 'string', description: 'Post ID to update' },
                text: { type: 'string', description: 'New post text' },
                visibility: { type: 'string', description: 'New visibility setting' }
            },
            required: ['postId']
        }
    },
    {
        name: 'linkedin_posts_delete',
        description: 'Delete a LinkedIn post',
        inputSchema: {
            type: 'object',
            properties: {
                postId: { type: 'string', description: 'Post ID to delete' }
            },
            required: ['postId']
        }
    },
    {
        name: 'linkedin_ugc_create',
        description: 'Create UGC post (legacy API, mainly for video)',
        inputSchema: {
            type: 'object',
            properties: {
                author: { type: 'string', description: 'Author URN' },
                text: { type: 'string', description: 'Post text' },
                media: { type: 'array', description: 'Media assets' },
                visibility: { type: 'object', description: 'Visibility settings' }
            },
            required: ['author']
        }
    },
    {
        name: 'linkedin_assets_upload',
        description: 'Upload media assets (images/videos)',
        inputSchema: {
            type: 'object',
            properties: {
                mediaType: { type: 'string', enum: ['IMAGE', 'VIDEO'], description: 'Type of media' },
                uploadUrl: { type: 'string', description: 'Pre-signed upload URL' },
                filePath: { type: 'string', description: 'Local file path to upload' },
                owner: { type: 'string', description: 'Owner URN (person or organization)' }
            },
            required: ['mediaType', 'owner']
        }
    },
    {
        name: 'linkedin_assets_get_upload_url',
        description: 'Get pre-signed URL for media upload',
        inputSchema: {
            type: 'object',
            properties: {
                mediaType: { type: 'string', enum: ['IMAGE', 'VIDEO'] },
                owner: { type: 'string', description: 'Owner URN' },
                filename: { type: 'string', description: 'Original filename' }
            },
            required: ['mediaType', 'owner']
        }
    },
    // SOCIAL ACTIONS APIs
    {
        name: 'linkedin_social_actions_like',
        description: 'Like a LinkedIn post or comment',
        inputSchema: {
            type: 'object',
            properties: {
                targetUrn: { type: 'string', description: 'URN of content to like' },
                actor: { type: 'string', description: 'Actor URN (person)' }
            },
            required: ['targetUrn', 'actor']
        }
    },
    {
        name: 'linkedin_social_actions_comment',
        description: 'Comment on a LinkedIn post',
        inputSchema: {
            type: 'object',
            properties: {
                targetUrn: { type: 'string', description: 'Post URN to comment on' },
                actor: { type: 'string', description: 'Commenter URN' },
                text: { type: 'string', description: 'Comment text' }
            },
            required: ['targetUrn', 'actor', 'text']
        }
    },
    {
        name: 'linkedin_social_actions_share',
        description: 'Share a LinkedIn post',
        inputSchema: {
            type: 'object',
            properties: {
                targetUrn: { type: 'string', description: 'Post URN to share' },
                actor: { type: 'string', description: 'Sharer URN' },
                commentary: { type: 'string', description: 'Optional commentary' }
            },
            required: ['targetUrn', 'actor']
        }
    },
    // MARKETING & ADVERTISING APIs
    {
        name: 'linkedin_ads_create_campaign',
        description: 'Create advertising campaign',
        inputSchema: {
            type: 'object',
            properties: {
                account: { type: 'string', description: 'Ad account URN' },
                name: { type: 'string', description: 'Campaign name' },
                type: { type: 'string', enum: ['SPONSORED_CONTENT', 'SPONSORED_MESSAGING', 'TEXT_ADS'] },
                status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'DRAFT'] },
                budget: { type: 'object', description: 'Campaign budget settings' },
                targeting: { type: 'object', description: 'Targeting criteria' }
            },
            required: ['account', 'name', 'type']
        }
    },
    {
        name: 'linkedin_ads_get_campaigns',
        description: 'Retrieve advertising campaigns',
        inputSchema: {
            type: 'object',
            properties: {
                account: { type: 'string', description: 'Ad account URN' },
                campaignIds: { type: 'array', items: { type: 'string' }, description: 'Specific campaign IDs' },
                status: { type: 'string', description: 'Filter by campaign status' }
            }
        }
    },
    {
        name: 'linkedin_ads_update_campaign',
        description: 'Update advertising campaign',
        inputSchema: {
            type: 'object',
            properties: {
                campaignId: { type: 'string', description: 'Campaign ID to update' },
                name: { type: 'string', description: 'New campaign name' },
                status: { type: 'string', description: 'New campaign status' },
                budget: { type: 'object', description: 'Updated budget settings' }
            },
            required: ['campaignId']
        }
    },
    {
        name: 'linkedin_ads_get_analytics',
        description: 'Get advertising analytics',
        inputSchema: {
            type: 'object',
            properties: {
                campaigns: { type: 'array', items: { type: 'string' }, description: 'Campaign URNs' },
                dateRange: { type: 'object', description: 'Analytics date range' },
                fields: { type: 'array', items: { type: 'string' }, description: 'Metrics to retrieve' },
                pivot: { type: 'string', description: 'Pivot dimension' }
            },
            required: ['campaigns', 'dateRange']
        }
    },
    {
        name: 'linkedin_ads_get_targeting_facets',
        description: 'Get available targeting options',
        inputSchema: {
            type: 'object',
            properties: {
                facetType: {
                    type: 'string',
                    enum: ['LOCATIONS', 'INDUSTRIES', 'JOB_FUNCTIONS', 'SENIORITIES', 'SKILLS', 'COMPANIES'],
                    description: 'Type of targeting facet'
                },
                locale: { type: 'string', description: 'Locale for results' }
            },
            required: ['facetType']
        }
    },
    // TALENT SOLUTIONS APIs
    {
        name: 'linkedin_jobs_post',
        description: 'Post a job to LinkedIn',
        inputSchema: {
            type: 'object',
            properties: {
                companyId: { type: 'string', description: 'Company URN' },
                title: { type: 'string', description: 'Job title' },
                description: { type: 'string', description: 'Job description' },
                location: { type: 'object', description: 'Job location' },
                employmentType: {
                    type: 'string',
                    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP'],
                    description: 'Employment type'
                },
                workRemoteAllowed: { type: 'boolean', description: 'Remote work allowed' },
                salary: { type: 'object', description: 'Salary information' },
                applyMethod: { type: 'object', description: 'How to apply' }
            },
            required: ['companyId', 'title', 'description', 'location']
        }
    },
    {
        name: 'linkedin_jobs_search',
        description: 'Search for jobs on LinkedIn',
        inputSchema: {
            type: 'object',
            properties: {
                keywords: { type: 'string', description: 'Job search keywords' },
                location: { type: 'object', description: 'Location filter' },
                company: { type: 'string', description: 'Company filter' },
                datePosted: { type: 'string', description: 'Date posted filter' },
                experienceLevel: { type: 'string', description: 'Experience level filter' }
            }
        }
    },
    {
        name: 'linkedin_talent_unified_search',
        description: 'Enhanced talent search (2025 feature)',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                facets: { type: 'object', description: 'Search facets' },
                sortBy: { type: 'string', description: 'Sort criteria' }
            },
            required: ['query']
        }
    },
    // LEARNING APIs
    {
        name: 'linkedin_learning_get_courses',
        description: 'Get LinkedIn Learning courses',
        inputSchema: {
            type: 'object',
            properties: {
                q: { type: 'string', enum: ['search', 'updated'], description: 'Query type' },
                keywords: { type: 'string', description: 'Search keywords' },
                classification: { type: 'string', description: 'Content classification' },
                start: { type: 'number', description: 'Pagination start' },
                count: { type: 'number', description: 'Number of results' }
            }
        }
    },
    {
        name: 'linkedin_learning_get_classifications',
        description: 'Get learning content taxonomy',
        inputSchema: {
            type: 'object',
            properties: {
                classificationType: { type: 'string', description: 'Type of classification' }
            }
        }
    },
    // MESSAGING APIs
    {
        name: 'linkedin_messaging_send_message',
        description: 'Send direct message (first-degree connections only)',
        inputSchema: {
            type: 'object',
            properties: {
                recipients: { type: 'array', items: { type: 'string' }, description: 'Recipient URNs' },
                subject: { type: 'string', description: 'Message subject' },
                body: { type: 'string', description: 'Message body' },
                attachments: { type: 'array', description: 'Message attachments' }
            },
            required: ['recipients', 'body']
        }
    },
    {
        name: 'linkedin_messaging_get_conversations',
        description: 'Get message conversations',
        inputSchema: {
            type: 'object',
            properties: {
                participantId: { type: 'string', description: 'Conversation participant' },
                start: { type: 'number', description: 'Pagination start' },
                count: { type: 'number', description: 'Number of conversations' }
            }
        }
    },
    // EVENTS APIs
    {
        name: 'linkedin_events_create',
        description: 'Create LinkedIn event',
        inputSchema: {
            type: 'object',
            properties: {
                organizer: { type: 'string', description: 'Event organizer URN' },
                name: { type: 'string', description: 'Event name' },
                description: { type: 'string', description: 'Event description' },
                startTime: { type: 'string', description: 'Event start time (ISO 8601)' },
                endTime: { type: 'string', description: 'Event end time (ISO 8601)' },
                location: { type: 'object', description: 'Event location' },
                eventType: { type: 'string', enum: ['ONLINE', 'OFFLINE'], description: 'Event type' }
            },
            required: ['organizer', 'name', 'startTime', 'endTime']
        }
    },
    {
        name: 'linkedin_events_get',
        description: 'Get LinkedIn events',
        inputSchema: {
            type: 'object',
            properties: {
                eventId: { type: 'string', description: 'Specific event ID' },
                organizer: { type: 'string', description: 'Filter by organizer' },
                start: { type: 'number', description: 'Pagination start' },
                count: { type: 'number', description: 'Number of events' }
            }
        }
    },
    // SALES NAVIGATOR APIs (Limited Availability)
    {
        name: 'linkedin_sales_navigator_profile_association',
        description: 'Sales Navigator profile association',
        inputSchema: {
            type: 'object',
            properties: {
                profileId: { type: 'string', description: 'LinkedIn profile ID' },
                associationType: { type: 'string', description: 'Type of association' }
            },
            required: ['profileId']
        }
    },
    // COMPLIANCE APIs
    {
        name: 'linkedin_compliance_get_events',
        description: 'Get compliance events for monitoring',
        inputSchema: {
            type: 'object',
            properties: {
                eventType: { type: 'string', description: 'Type of compliance event' },
                timeRange: { type: 'object', description: 'Time range for events' }
            }
        }
    },
    // RATE LIMITING & UTILITY
    {
        name: 'linkedin_get_rate_limits',
        description: 'Check current rate limit status',
        inputSchema: {
            type: 'object',
            properties: {
                apiCategory: { type: 'string', description: 'Specific API category to check' }
            }
        }
    },
    {
        name: 'linkedin_get_api_health',
        description: 'Check LinkedIn API health status',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    }
];
// Handler for listing available tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: LINKEDIN_API_TOOLS,
    };
});
// Handler for tool execution
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        // Route to appropriate API handler based on tool name
        switch (name) {
            // Authentication tools
            case 'linkedin_oauth_get_auth_url':
                return await linkedinClient.getAuthorizationUrl(args);
            case 'linkedin_oauth_exchange_code':
                return await linkedinClient.exchangeCodeForToken(args);
            case 'linkedin_oauth_refresh_token':
                return await linkedinClient.refreshAccessToken(args);
            // Profile & People APIs
            case 'linkedin_people_get_profile':
                return await linkedinClient.people.getProfile(args);
            case 'linkedin_people_search_members':
                return await linkedinClient.people.searchMembers(args);
            // Organizations APIs
            case 'linkedin_organizations_get_company':
                return await linkedinClient.organizations.getCompany(args);
            case 'linkedin_organizations_get_follower_stats':
                return await linkedinClient.organizations.getFollowerStats(args);
            // Content APIs
            case 'linkedin_posts_create':
                return await linkedinClient.content.createPost(args);
            case 'linkedin_posts_get':
                return await linkedinClient.content.getPosts(args);
            case 'linkedin_posts_update':
                return await linkedinClient.content.updatePost(args);
            case 'linkedin_posts_delete':
                return await linkedinClient.content.deletePost(args);
            case 'linkedin_ugc_create':
                return await linkedinClient.content.createUGCPost(args);
            case 'linkedin_assets_upload':
                return await linkedinClient.content.uploadAsset(args);
            case 'linkedin_assets_get_upload_url':
                return await linkedinClient.content.getUploadUrl(args);
            // Social Actions APIs
            case 'linkedin_social_actions_like':
                return await linkedinClient.socialActions.like(args);
            case 'linkedin_social_actions_comment':
                return await linkedinClient.socialActions.comment(args);
            case 'linkedin_social_actions_share':
                return await linkedinClient.socialActions.share(args);
            // Marketing APIs
            case 'linkedin_ads_create_campaign':
                return await linkedinClient.marketing.createCampaign(args);
            case 'linkedin_ads_get_campaigns':
                return await linkedinClient.marketing.getCampaigns(args);
            case 'linkedin_ads_update_campaign':
                return await linkedinClient.marketing.updateCampaign(args);
            case 'linkedin_ads_get_analytics':
                return await linkedinClient.marketing.getAnalytics(args);
            case 'linkedin_ads_get_targeting_facets':
                return await linkedinClient.marketing.getTargetingFacets(args);
            // Talent APIs
            case 'linkedin_jobs_post':
                return await linkedinClient.talent.postJob(args);
            case 'linkedin_jobs_search':
                return await linkedinClient.talent.searchJobs(args);
            case 'linkedin_talent_unified_search':
                return await linkedinClient.talent.unifiedSearch(args);
            // Learning APIs
            case 'linkedin_learning_get_courses':
                return await linkedinClient.learning.getCourses(args);
            case 'linkedin_learning_get_classifications':
                return await linkedinClient.learning.getClassifications(args);
            // Messaging APIs
            case 'linkedin_messaging_send_message':
                return await linkedinClient.messaging.sendMessage(args);
            case 'linkedin_messaging_get_conversations':
                return await linkedinClient.messaging.getConversations(args);
            // Events APIs
            case 'linkedin_events_create':
                return await linkedinClient.events.createEvent(args);
            case 'linkedin_events_get':
                return await linkedinClient.events.getEvents(args);
            // Sales Navigator APIs
            case 'linkedin_sales_navigator_profile_association':
                return await linkedinClient.salesNavigator.profileAssociation(args);
            // Compliance APIs
            case 'linkedin_compliance_get_events':
                return await linkedinClient.compliance.getEvents(args);
            // Utility APIs
            case 'linkedin_get_rate_limits':
                return await linkedinClient.getRateLimits(args);
            case 'linkedin_get_api_health':
                return await linkedinClient.getApiHealth(args);
            default:
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown LinkedIn API tool: ${name}`);
        }
    }
    catch (error) {
        if (error instanceof types_js_1.McpError)
            throw error;
        throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Error executing LinkedIn API tool ${name}: ${error}`);
    }
});
// Start the server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('LinkedIn API MCP server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=linkedin-api-mcp.js.map