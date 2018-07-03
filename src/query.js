const { ApolloClient } = require("apollo-client");
const { ApolloLink } = require("apollo-link");
const { HttpLink } = require("apollo-link-http");
const { InMemoryCache} = require("apollo-cache-inmemory");
const gql = require("graphql-tag");
const fetch = require('node-fetch');
const fragmentMatcher = require('./fragmentMatcher');

//read from cli
// const domain = "https://staging.referralsaasquatch.com";
// const tenantAlias = "test_a5fr50mxaeltn";

// const authToken = "TEST_KHDCw9Ll4JJxa0OL1zKCVMouIbtF1BMX"; // username:password encoded in base64

const Query = (domain, tenant, authToken) => { return {
    getClient() {
      const uri = domain + "/api/v1/" + tenant + "/graphql";
      const headers = {
        Authorization: authToken //base64
      }
      const client = new ApolloClient({
        link: new HttpLink({ uri, headers, fetch }),
        cache: new InMemoryCache({fragmentMatcher})
      });
      return client;      
    },

    uploadAssets(translationInstanceInput) {
      return this.getClient().mutate({
        mutation: gql `
          mutation ($translationInstanceInput: TranslationInstanceInput!) {
            upsertTranslationInstance(translationInstanceInput:$translationInstanceInput) {
              id
            }
          }
         `, variables: {
          translationInstanceInput
         }
      })
    },

    getAssets() {
      return this.getClient().query({
        query: gql `
          query {
            translatableAssets {
              __typename
              translationInfo {
                id
                translatableAssetKey
                translations{
                  id
                  locale
                }
              }
              ...on TenantTheme {
                id
                variables
              }
              ...on ProgramEmailConfig {
                key
                values
              }
              ...on ProgramLinkConfig {
                messaging{
                  messages {
                    shareMedium
                  }
                }
              }
              ...on ProgramWidgetConfig {
                key
                values
              }
            }
          }
          `
      })
    }
  }
}

module.exports = Query;

