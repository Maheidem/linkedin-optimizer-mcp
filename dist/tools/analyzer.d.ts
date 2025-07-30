export declare const analyzeProfileTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            profileData: {
                type: string;
                properties: {
                    headline: {
                        type: string;
                    };
                    summary: {
                        type: string;
                    };
                    experience: {
                        type: string;
                        items: {
                            type: string;
                            properties: {
                                title: {
                                    type: string;
                                };
                                description: {
                                    type: string;
                                };
                            };
                        };
                    };
                    skills: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    connections: {
                        type: string;
                    };
                    hasProfilePhoto: {
                        type: string;
                    };
                    hasBanner: {
                        type: string;
                    };
                    hasFeatured: {
                        type: string;
                    };
                };
                description: string;
            };
        };
        required: string[];
    };
};
export declare function analyzeProfile(params: unknown): Promise<{
    overallScore: string;
    scoreBreakdown: {
        headline: {
            score: number;
            status: string;
            quality: string;
        };
        summary: {
            score: number;
            status: string;
            quality: string;
        };
        experience: {
            score: number;
            status: string;
            quality: string;
        };
        skills: {
            score: number;
            count: any;
            quality: string;
        };
    };
    criticalGaps: any[];
    quickWins: string[];
    keywordAnalysis: any;
    actionPlan: any[];
    estimatedImpact: any;
}>;
//# sourceMappingURL=analyzer.d.ts.map