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
    // 1. First check what domains are available on this account
    console.log('1. Checking domains...');
    const domains = await client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: WHM_USERNAME,
        cpanel_jsonapi_module: 'DomainInfo',
        cpanel_jsonapi_func: 'list_domains',
        cpanel_jsonapi_apiversion: 3,
      }
    });
    console.log('Domains:', JSON.stringify(domains.data, null, 2));

    // Get the main domain
    const mainDomain = domains.data?.result?.data?.main_domain;
    console.log('\nMain domain:', mainDomain);

    // 2. Try creating an email on that domain
    if (mainDomain) {
      console.log(`\n2. Creating test email on ${mainDomain}...`);
      const createResult = await client.get('/json-api/cpanel', {
        params: {
          api_version: 1,
          cpanel_jsonapi_user: WHM_USERNAME,
          cpanel_jsonapi_module: 'Email',
          cpanel_jsonapi_func: 'add_pop',
          cpanel_jsonapi_apiversion: 3,
          email: 'testuser',
          password: 'TestPass123!',
          quota: 1000,
          domain: mainDomain,
        }
      });
      console.log('Create result:', JSON.stringify(createResult.data, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

test();
