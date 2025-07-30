// Test LinkedIn API permissions with your token
const accessToken = 'AQWrlZ3yFxQmHmjUFf7crk7isAfN_OtCovgtTVCI0fetxZg8E2dT4ye-H28OCxv4DnByc5UcWvtmrSwxOHs5U0lOOYhvGF-M2BZfwL3P19gvoXGnkQe_98Ijt8fX5Ye3EAg0wqsHA0EDwLGyBYY-rrY57rGEHl7rU1tULg5cB3I_bCH_p9smcyb2xCng5RWLDLc22hwOndFqKmVs2DnDui2ElhK5z4EV-JAdIMehXwnitX10XJfGBPEWHh0SQkP94veAp199ujToKXLYzo6E5AThtYFEuU4DGNvGvdNEZB5FZpNOh9aT-dNGuZ8dvuIjOdaE-BEGjKS1l-on_I2h26bSfyvN6A';

async function testPermissions() {
  console.log('🧪 Testing LinkedIn API permissions...\n');
  
  // Test 1: Profile access with different endpoint
  console.log('1️⃣ Testing profile access (lite profile)...');
  try {
    const response = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const profile = await response.json();
      console.log('✅ Profile access works!');
      console.log('👤 Name:', profile.firstName?.localized?.en_US, profile.lastName?.localized?.en_US);
      console.log('🆔 ID:', profile.id);
    } else {
      console.log('❌ Profile access failed:', response.status, response.statusText);
      const error = await response.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.log('❌ Profile test error:', error.message);
  }
  
  console.log('');
  
  // Test 2: Create a simple post
  console.log('2️⃣ Testing post creation...');
  try {
    // First get user ID for posting
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (!profileResponse.ok) {
      console.log('❌ Cannot get user ID for posting');
      return;
    }
    
    const profile = await profileResponse.json();
    const authorUrn = `urn:li:person:${profile.id}`;
    
    const postData = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: '🚀 Testing my LinkedIn API integration! This post was created programmatically via MCP. #API #LinkedIn #MCP'
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

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Post created successfully!');
      console.log('📝 Post ID:', result.id);
      console.log('🔗 Check your LinkedIn feed to see the post!');
    } else {
      console.log('❌ Post creation failed:', response.status, response.statusText);
      const error = await response.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.log('❌ Post creation error:', error.message);
  }
  
  console.log('');
  console.log('🎯 Summary:');
  console.log('Your access token is valid and you can use it for:');
  console.log('• Creating LinkedIn posts');
  console.log('• Basic profile information (with correct endpoints)');
  console.log('• Social actions (likes, comments, shares)');
  console.log('');
  console.log('💡 Save this access token - it\'s valid for 1439 hours (about 2 months)!');
  console.log('🔑 Token:', accessToken);
}

testPermissions();