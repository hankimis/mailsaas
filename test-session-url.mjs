import axios from 'axios';

const WHM_HOST = 'host51.registrar-servers.com';
const WHM_PORT = 2087;
const WHM_USERNAME = 'mymakurv';
const WHM_API_TOKEN = 'D7K6HCLJUCWUUSPZSZDPOO8C5OS93OOI';

const client = axios.create({
  baseURL: `https://${WHM_HOST}:${WHM_PORT}`,
  headers: {
    Authorization: `whm ${WHM_USERNAME}:${WHM_API_TOKEN}`,
  },
  timeout: 30000,
});

async function test() {
  try {
    console.log('Creating webmail session...');
    
    const session = await client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: WHM_USERNAME,
        cpanel_jsonapi_module: 'Session',
        cpanel_jsonapi_func: 'create_webmail_session_for_mail_user',
        cpanel_jsonapi_apiversion: 3,
        login: 'hankim',
        domain: 'mymatiltalk.com',
      }
    });
    
    console.log('Full response:', JSON.stringify(session.data, null, 2));
    
    const data = session.data.result.data;
    const token = data.token;
    const sessionStr = data.session;
    
    console.log('\nSession:', sessionStr);
    console.log('Token:', token);
    
    // The session string contains the security info
    // Format: user@domain:random_token:FUNCTION,security_hash
    const parts = sessionStr.split(':');
    console.log('\nSession parts:');
    parts.forEach((p, i) => console.log(`  [${i}]: ${p}`));
    
    // cpsess token number
    const cpsessNum = token.replace('/cpsess', '');
    console.log('\ncpsess number:', cpsessNum);
    
    // Webmail URL format
    console.log('\n=== URL to try ===');
    console.log(`https://${WHM_HOST}:2096${token}/webmail/paper_lantern/index.html?login=1&post_login=1`);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

test();
