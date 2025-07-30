export declare const generateHeadlineTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            currentRole: {
                type: string;
                description: string;
            };
            skills: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            targetKeywords: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            style: {
                type: string;
                enum: string[];
                description: string;
            };
            industry: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare function generateHeadline(params: unknown): Promise<{
    headlines: string[];
    analysis: {
        length: string;
        keywordCount: number;
        keywords: string[];
    }[];
    tips: string[];
    bestPractices: {
        structure: string;
        length: string;
        keywords: string;
        uniqueness: string;
    };
}>;
//# sourceMappingURL=generator.d.ts.map