# LinkedIn Post Creation Workflow

This document outlines the exact workflow for creating high-quality LinkedIn posts based on Marcos Heidemann's preferences and successful posting patterns.

## 📋 **Complete Workflow Steps**

### 1. **Date/Time Check (MANDATORY FIRST STEP)**
```bash
date
```
**Purpose**: Get accurate current date/time for research context
**Why**: Ensures research is current and relevant

### 2. **Research Phase**
Use the research-documentation-specialist agent:
```
Task: Research latest [TOPIC] news from [CURRENT_DATE]. Focus on:
- Recent developments and breakthroughs  
- Technical advances with specific metrics
- Business/industry impact with statistics
- Emerging trends relevant to ML/DS engineers
```

### 3. **Source Verification (CRITICAL)**
After initial research, ALWAYS verify sources:
```
Task: Find and verify actual URLs for these specific claims:
[LIST EACH STATISTIC/CLAIM]

For each claim, I need:
- Exact, accessible URL (not paywalled)
- Verification the link works and contains specific data
- If paywalled, find alternative accessible sources
- Confirm publication date

Provide only verified, clickable URLs. If cannot verify, clearly state which claims lack sources.
```

### 4. **Content Creation**
Follow these rules:

#### ❌ **NEVER DO:**
- Start with "As a Principal..." or any role-based opening
- Include statistics without verified source URLs
- Use generic professional introductions

#### ✅ **ALWAYS DO:**
- Start with direct insight, observation, or intriguing statement
- Include only verified statistics with working URLs
- Provide sources section with numbered list
- Ask specific questions targeting ML/DS professionals

#### **Post Structure:**
```
Hook (1 line)
↓
Context/Development (2-3 sentences)
↓  
Analysis/Perspective (2-4 bullet points)
↓
Engagement Question (1-2 sentences)
↓
Sources (mandatory)
↓
Hashtags (5-7 maximum)
```

### 5. **Source Attribution Format**
```
Sources:
• [Description]: [URL]
• [Description]: [URL]
• [Description]: [URL]
```

### 6. **Quality Control Checklist**
Before posting, verify:
- [ ] No role-based opening ("As a...")
- [ ] All statistics have valid source URLs
- [ ] Sources are accessible and current
- [ ] Authentic voice and genuine insights
- [ ] Specific engagement question for ML/DS professionals
- [ ] 5-7 relevant hashtags
- [ ] 600-1000 character target met
- [ ] Technical accuracy verified

### 7. **Post Execution**
Create JavaScript file and execute:
```bash
cd ~/Documents/dev/linkedin-optimizer-mcp
node post-to-linkedin.js
```

## 🎯 **Content Guidelines**

### **Preferred Opening Styles:**
- "The gap between [X] and [Y] just got clearer..."
- "Here's what caught my attention about..."
- "Something interesting happened in..."
- "The latest developments reveal..."
- "While everyone's celebrating [X], we're missing..."

### **Core Hashtags (Always Include):**
- `#MachineLearning`
- `#ArtificialIntelligence` 
- `#MLOps`

### **Contextual Hashtags (Choose 2-4):**
- `#TechLeadership` (strategy/management)
- `#GenAI` (generative AI)
- `#DataScience` (data-focused)
- `#Innovation` (research/breakthroughs)
- `#TechTrends` (industry analysis)

### **Engagement Questions That Work:**
- "What patterns are you seeing in [specific area]?"
- "How are you handling [specific challenge]?"
- "What's been your experience with [technology/approach]?"
- "Are companies that [approach A] seeing better results than [approach B]?"

## 📊 **Success Metrics Example**

### Recent Successful Post:
- **Topic**: Gen AI enterprise adoption gap
- **Character Count**: 1,570
- **Sources**: 3 verified URLs
- **Engagement Question**: Implementation patterns comparison
- **Result**: Successfully posted and live

### **Key Success Factors:**
1. ✅ Current research with verified sources
2. ✅ Authentic voice without role-based opening
3. ✅ Technical depth with specific metrics
4. ✅ Critical analysis balancing hype vs reality
5. ✅ Targeted question for peer professionals

## 🔧 **Technical Implementation**

### **Research Agent Usage:**
```javascript
Task({
  description: "Research latest [topic] news",
  prompt: "[detailed research request with current date]",
  subagent_type: "research-documentation-specialist"
})
```

### **LinkedIn Posting Code Structure:**
```javascript
const postText = `[FORMATTED_CONTENT]`;

// Get user ID → Create post data → Post to LinkedIn API
```

### **Access Token:**
```javascript
const accessToken = 'AQWrlZ3yFxQmHmjUFf7crk7isAfN_OtCovgtTVCI0fetxZg8E2dT4ye-H28OCxv4DnByc5UcWvtmrSwxOHs5U0lOOYhvGF-M2BZfwL3P19gvoXGnkQe_98Ijt8fX5Ye3EAg0wqsHA0EDwLGyBYY-rrY57rGEHl7rU1tULg5cB3I_bCH_p9smcyb2xCng5RWLDLc22hwOndFqKmVs2DnDui2ElhK5z4EV-JAdIMehXwnitX10XJfGBPEWHh0SQkP94veAp199ujUjOdaE-BEGjKS1l-on_I2h26bSfyvN6A';
```

## 🚫 **Common Mistakes to Avoid**

1. **Skipping date check** → Outdated research
2. **Using unverified sources** → Credibility loss
3. **Role-based openings** → Generic/inauthentic voice
4. **Missing source URLs** → Incomplete attribution
5. **Generic questions** → Low engagement
6. **Too many hashtags** → Spam appearance
7. **Paywalled sources** → Inaccessible references

## 📈 **Optimization Tips**

### **For High Engagement:**
- Focus on industry tensions/contradictions
- Include surprising statistics with context
- Ask comparative questions (A vs B scenarios)
- Reference multiple breakthrough simultaneously
- Connect technical advances to business reality

### **For Technical Credibility:**
- Always verify benchmark numbers
- Include specific model names and versions
- Reference methodology when discussing studies
- Distinguish between research and production claims
- Acknowledge limitations and uncertainties

## 🔄 **Continuous Improvement**

### **After Each Post:**
- Monitor engagement patterns
- Note which topics generate most discussion
- Track source verification accuracy
- Refine question formats based on responses
- Update hashtag effectiveness

### **Monthly Review:**
- Analyze most successful posts
- Update workflow based on LinkedIn algorithm changes
- Refresh hashtag strategy
- Review and update posting rules document

---

**Last Updated**: July 28, 2025  
**Success Rate**: 100% (recent posts)  
**Avg Engagement**: High technical discussion quality  
**Key Success Factor**: Verified sources + authentic voice + targeted questions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
