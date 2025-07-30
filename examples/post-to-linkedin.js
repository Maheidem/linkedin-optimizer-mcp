// Post to LinkedIn directly
const accessToken = 'AQWrlZ3yFxQmHmjUFf7crk7isAfN_OtCovgtTVCI0fetxZg8E2dT4ye-H28OCxv4DnByc5UcWvtmrSwxOHs5U0lOOYhvGF-M2BZfwL3P19gvoXGnkQe_98Ijt8fX5Ye3EAg0wqsHA0EDwLGyBYY-rrY57rGEHl7rU1tULg5cB3I_bCH_p9smcyb2xCng5RWLDLc22hwOndFqKmVs2DnDui2ElhK5z4EV-JAdIMehXwnitX10XJfGBPEWHh0SQkP94veAp199ujToKXLYzo6E5AThtYFEuU4DGNvGvdNEZB5FZpNOh9aT-dNGuZ8dvuIjOdaE-BEGjKS1l-on_I2h26bSfyvN6A';

const postText = `The gap between AI hype and enterprise reality just got a lot clearer.

While Claude 4 dominates coding benchmarks at 72.5% on SWE-Bench and Google's AlphaGenome reads the 98% of "dark matter" DNA we never understood, there's a statistic that tells the real story: 42% of executives say GenAI adoption is "tearing their company apart."

Here's what the verified data reveals:
• Claude 4 also scored 43.2% on Terminal-Bench, setting new performance standards
• AlphaGenome can process up to one million base pairs to predict gene expression impacts
• The enterprise chaos isn't just perception - it's measurable organizational disruption

The disconnect is striking. We're celebrating technical breakthroughs while companies struggle with implementation reality. The "tearing apart" phenomenon suggests we're moving faster than organizational structures can adapt.

The bigger question: Are these implementation challenges inevitable growing pains, or signs we need fundamentally different approaches to enterprise AI adoption?

What patterns are you seeing in AI rollouts? Are companies that slow down initially seeing better long-term success?

Sources:
• Claude 4 benchmarks: https://www.anthropic.com/news/claude-4
• Enterprise disruption study: https://insideainews.com/2025/03/19/writer-survey-42-of-c-suite-say-gen-ai-is-tearing-their-companies-apart/
• AlphaGenome breakthrough: https://www.scientificamerican.com/article/deepminds-alphagenome-uses-ai-to-decipher-noncoding-dna-for-research/

#MachineLearning #ArtificialIntelligence #MLOps #TechLeadership #GenAI`;

async function postToLinkedIn() {
  try {
    console.log('📝 Creating LinkedIn post...');
    
    // Get user ID first
    const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userData = await userResponse.json();
    const authorUrn = `urn:li:person:${userData.sub}`;
    console.log('✅ User ID retrieved:', userData.sub);

    // Create the post
    const postData = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: postText
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Post creation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log('🎉 POST SUCCESSFULLY CREATED!');
    console.log('📝 Post ID:', result.id);
    console.log('🔗 Post URL: https://www.linkedin.com/feed/update/' + result.id + '/');
    console.log('👤 Author:', userData.name);
    console.log('📊 Character count:', postText.length);
    console.log('');
    console.log('✅ Your Gen AI post is now live on LinkedIn!');
    console.log('🎯 Go check your LinkedIn feed to see it in action.');
    
    return result;
    
  } catch (error) {
    console.error('❌ Error posting to LinkedIn:', error.message);
  }
}

postToLinkedIn();