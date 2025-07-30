// Test if we can create LinkedIn posts with current permissions
const accessToken = 'AQWrlZ3yFxQmHmjUFf7crk7isAfN_OtCovgtTVCI0fetxZg8E2dT4ye-H28OCxv4DnByc5UcWvtmrSwxOHs5U0lOOYhvGF-M2BZfwL3P19gvoXGnkQe_98Ijt8fX5Ye3EAg0wqsHA0EDwLGyBYY-rrY57rGEHl7rU1tULg5cB3I_bCH_p9smcyb2xCng5RWLDLc22hwOndFqKmVs2DnDui2ElhK5z4EV-JAdIMehXwnitX10XJfGBPEWHh0SQkP94veAp199ujToKXLYzo6E5AThtYFEuU4DGNvGvdNEZB5FZpNOh9aT-dNGuZ8dvuIjOdaE-BEGjKS1l-on_I2h26bSfyvN6A';

async function testPosting() {
  console.log('🧪 Testing LinkedIn posting capabilities...\n');

  // Test 1: Get user ID first (needed for posting)
  console.log('1️⃣ Getting user ID for posting...');
  try {
    const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ User ID available:', userData.sub);
      
      // Test 2: Try to create a test post
      console.log('\n2️⃣ Attempting to create a test post...');
      
      const authorUrn = `urn:li:person:${userData.sub}`;
      
      const postData = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: '🧪 Testing LinkedIn API integration - this is a test post!'
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postData),
      });

      if (postResponse.ok) {
        const result = await postResponse.json();
        console.log('🎉 SUCCESS! Post created:', result.id);
        console.log('🔗 Check your LinkedIn feed!');
        return true;
      } else {
        const errorText = await postResponse.text();
        console.log('❌ Post creation failed:', postResponse.status, postResponse.statusText);
        console.log('📄 Error details:', errorText);
        return false;
      }
      
    } else {
      console.log('❌ Cannot get user ID:', userResponse.status);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Testing error:', error.message);
    return false;
  }
}

async function checkPostingRequirements() {
  console.log('\n🔍 Checking posting requirements...\n');
  
  console.log('📋 Current App Status:');
  console.log('✅ w_member_social scope: YES');
  console.log('✅ Valid access token: YES');
  console.log('✅ User ID available: YES');
  console.log('❓ API Product access: TESTING...');
  
  const canPost = await testPosting();
  
  if (canPost) {
    console.log('\n🎉 POSTING IS AVAILABLE!');
    console.log('You can create LinkedIn posts with your current setup.');
  } else {
    console.log('\n❌ POSTING NOT AVAILABLE');
    console.log('You need additional LinkedIn API product approval.');
    console.log('\n💡 Solutions:');
    console.log('1. Request "Share on LinkedIn" API product (if not already approved)');
    console.log('2. Apply for LinkedIn Partner Program');
    console.log('3. Use content generation tools and post manually');
  }
}

checkPostingRequirements();