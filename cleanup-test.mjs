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

async function cleanup() {
  try {
    // Delete the test email account
    console.log('Deleting test email account...');
    const deleteResult = await client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: WHM_USERNAME,
        cpanel_jsonapi_module: 'Email',
        cpanel_jsonapi_func: 'delete_pop',
        cpanel_jsonapi_apiversion: 3,
        email: 'testuser',
        domain: 'mymatiltalk.com',
      }
    });
    console.log('Delete result:', JSON.stringify(deleteResult.data, null, 2));

    // List current emails
    console.log('\nCurrent email accounts:');
    const emails = await client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: WHM_USERNAME,
        cpanel_jsonapi_module: 'Email',
        cpanel_jsonapi_func: 'list_pops_with_disk',
        cpanel_jsonapi_apiversion: 3,
      }
    });
    console.log('Emails:', JSON.stringify(emails.data?.result?.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

cleanup();
