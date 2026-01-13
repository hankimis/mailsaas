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

async function testWHM() {
  try {
    // 1. List accounts on WHM
    console.log('1. Listing WHM accounts...');
    const accounts = await client.get('/json-api/listaccts', {
      params: { api_version: 1 }
    });
    console.log('Accounts:', JSON.stringify(accounts.data?.data?.acct?.map(a => ({
      user: a.user,
      domain: a.domain
    })), null, 2));

    // 2. Try to list email accounts using cpanel API call through WHM
    console.log('\n2. Listing email accounts via WHM cpanel call...');
    const emails = await client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: WHM_USERNAME,
        cpanel_jsonapi_module: 'Email',
        cpanel_jsonapi_func: 'list_pops_with_disk',
        cpanel_jsonapi_apiversion: 3,
      }
    });
    console.log('Emails result:', JSON.stringify(emails.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testWHM();
