import { ApolloClient } from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import fragmentMatcher from './fragmentMatcher';

const fragments = {
	CommonUserFragment: gql`
		fragment CommonUserFragment on User {
			id
			accountId
			firstName
			lastName
			customFields
		}
	`,
	CommonProgramFragment: gql`
		fragment CommonProgramFragment on Program {
			id
			name
			status
			rules
			analytics
			emails {
				key
				enabled
				values
			}
			rewards {
				key
				name
				rewardType
				amount
				unit
				currency
				validityDuration
				fuelTankType
				integrationId
				integrationSettings
			}
			widgets {
				key
				values
			}
			dateCreated
			lastActivatedDate
			template {
				id
				name
				summary
				logo
				rules
				rulesUISchema
				emails {
					key
					name
					description
					defaults
				}
				rewards {
					key
					name
					description
				}
				widgets {
					key
					name
					defaults
				}
			}
		}
	`,
};

const API = {

	tenantClients : {},

	getTenantAPI(tenantAlias) {

		if(!this.tenantClients[tenantAlias]) {
			// @ts-ignore
			const config = window.SquatchPortalConfig;
			const domain = config && config.localGraphQLEndpoint ? config.localGraphQLEndpoint : '';
			const uri = `${domain}/api/v1/${tenantAlias}/graphql`;
			const opts = {
				credentials:  'include'
			};

			const client = new ApolloClient({
				link: createHttpLink({ uri,opts }),
				cache: new InMemoryCache({ fragmentMatcher }),
			});
			this.tenantClients[tenantAlias] = client;
		}
		return new TenantAPI(this.tenantClients[tenantAlias]);
	}

}

class TenantAPI {

	constructor(client) {
		this.client = client;
	}

	createProgram(variables) {
		return this.client.mutate({
			mutation: gql`
				mutation ($name:String!, $programTemplateId:String!) {
					createProgram(name: $name, programTemplateId: $programTemplateId) {
						... CommonProgramFragment
					}
				}
				${fragments.CommonProgramFragment}
			`,
			variables
		}).then(function(result) {
			return result.data.createProgram;
		});
	}

	updateProgram(programInput) {
		return this.client.mutate({
			mutation: gql`
				mutation ($programInput:ProgramInput!) {
					updateProgram(programInput: $programInput) {
						... CommonProgramFragment
					}
				}
				${fragments.CommonProgramFragment}
			`,
			variables: {
				programInput
			}
		}).then(function(result) {
			return result.data.updateProgram;
		});
	}

	programs(variables) {
		return this.client.query({
			query: gql`
				query FindAllPrograms($limit:Int, $offset:Int) {
					programs(limit: $limit, offset: $offset) {
						data {
							... CommonProgramFragment
						}
						count
						totalCount
					}
				}
				${fragments.CommonProgramFragment}
			`,
			variables,
			fetchPolicy : "network-only"
		}).then(function(result) {
			return result.data.programs;
		});

	}

	program(variables) {
		return this.client.query({
			query: gql`
				query FindProgram($id:ID!) {
					program(id : $id) {
						... CommonProgramFragment
					}
				}
				${fragments.CommonProgramFragment}
			`,
			variables,
			fetchPolicy : "network-only"
		}).then(function(result) {
			return result.data.program;
		});
	}

	user(variables) {
		return this.client.query({
			query: gql`
				query FindUser($id:String!, $accountId:String!){
					user(id : $id, accountId : $accountId) {
						...CommonUserFragment
					}
				}
				${fragments.CommonUserFragment}
			`,
			variables,
			fetchPolicy : "network-only"
		}).then(function(result) {
			return result.data.user;
		});
	}

	integrationToken(variables) {
		return this.client.query({
			query: gql`
				query FindToken($name : String!) {
				   integrationToken(name : $name)
				}
			`,
			variables,
			fetchPolicy : "network-only"
		}).then(function(result) {
			return result.data.integrationToken;
		});
	}

	tenant() {
		return this.client.query({
			query: gql`
				query {
					tenant {
						tenantAlias
					}
				}
			`
		})
	}

	previewProgramEmail(variables) {
		return this.client.query({
			query: gql`
				query PreviewEmail($programId:ID!, $emailKey:String!, $values:RSJsonNode!, $locale:String!) {
					program(id: $programId) {
						id
						email(key: $emailKey) {
							preview(values: $values, locale: $locale) {
								body
							}
						}
					}
				}
			`,
			variables,
			fetchPolicy : "network-only"
		}).then(function(result) {
			return result.data.program.email.preview;
		});
	}

	sendTestEmail(variables) {
		return this.client.mutate({
			mutation: gql`
				mutation ($programId: String!, $emailKey: String!, $values: RSJsonNode!, $toAddress: String!, $locale:String!) {
					sendPreviewEmail(programId: $programId, emailKey: $emailKey, values: $values, toAddress: $toAddress, locale: $locale)
				}
			`,
			variables
		});
	}

	rewards(variables) {
		return this.client.query({
			query: gql`
			query FindRewards($programId: ID!, $timeZoneOffset: Int, $filter: RewardFilterInput) {
				program(id : $programId) {
					id
					rewardsGiven(filter: $filter, timeZoneOffset: $timeZoneOffset) {
						data {
							id
							value
							unit
							name
							dateGiven
							type
							user {
								id
								firstName
								lastName
								email
							}
						}
					}
				}
			}
			`,
			variables,
			fetchPolicy : "network-only"
		}).then(function(result) {
			return result.data.program.rewardsGiven;
		});
	}

	upsertTranslation(translationInstanceInput) {
		return this.client.mutate({
			mutation: gql`
			mutation ($translationInstanceInput: TranslationInstanceInput!) {
				upsertTranslationInstance(translationInstanceInput:$translationInstanceInput) {
					id
				}
			}
			`,
			variables: {
				translationInstanceInput
			}
		});
	}

	getProgramTranslatableAssets(programId) {
		return this.client.query({
			query: gql`
			query ($programId: ID!) {
				program(id : $programId) {
					id
					translatableAssets{
						type:__typename
						... on ProgramEmailConfig{
							key
							values
						}
						... on ProgramWidgetConfig{
							key
							values
						}
						translationInfo {
							path:id
						}
					}
				}
			}`,
			variables: {
				programId
			},
			fetchPolicy : "network-only"
		}).then(function(result) {
			return result.data.program.translatableAssets;
		});
	}

	getProgramTranslations(programId) {
		return this.client.query({
			query: gql`
			query ($programId: ID!) {
				program(id : $programId) {
					id
					translatableAssets {
						type:__typename
						... on ProgramEmailConfig{
							key
							values
						}
						... on ProgramWidgetConfig{
							key
							values
						}
						translationInfo {
							path:id
							translations {
								locale
								content
							}
						}
					}
				}
			}
			`,
			variables: {
				programId
			},
			fetchPolicy : "network-only"
		}).then(function(result) {
			return result.data.program.translatableAssets;
		});
	}

	// TODO - it would be better to query directly into configured rewards and expose reward template
	getPredefinedRewards(variables) {
		return this.client.query({
			query: gql`
			query($offset:Int!, $limit:Int!){
				programs(offset: $offset, limit: $limit) {
				  data {
					id
					name
					template {
					  id
					  name
					  rewards {
						key
						name         
					  }
					}
					rewards {
					  key
					  amount
					  unit
					  predefinedRewardType
					  rewardType
					  customCodes(used:false) {
						totalCount
					  }
					}
				  }
				}
			  }
			`,
			variables,
			fetchPolicy : "network-only"
		}).then(function(result) {
			return result.data.programs.data;
		});
	}

	createJob(jobInput) {
		return this.client.mutate({
			mutation : gql`
			mutation ($jobInput : JobInput!) {
				createJob(jobInput : $jobInput) {
				  id
				  type
				  name
					requester
					dateCreated
					params
				}
			  }
			`,
			variables : {
				jobInput
			}
		}).then(function(result) {
			return result.data.createJob;
		})


	}

	getParticipantSegments() {
		return this.client.query({
			query: gql`
			query {
				segments(limit: 500) {
					data {
						key
						name
						dateCreated
						dateModified
						participantsCount
					}
				}
			}
			`,
			fetchPolicy: 'network-only'
		})
	}

	getJobsStatus() {
		return this.client.query({
			query: gql`
			query {
				jobs {
					data {
						id
						name
						type
						requester
						dateCreated
						dateExpires
						status
						downloadUrl
						downloadErrorUrl
						stats {
							recordsProcessed
							errors
						}
					}
				}
			}
			`,
			fetchPolicy: 'network-only' // skip the cache
		});
	}

	upsertSegment(segmentInput) {
		return this.client.mutate({
			mutation: gql`
			mutation upsertSegment($segmentInput: SegmentInput!) {
				upsertSegment(segmentInput: $segmentInput) {
					key
					name
				}
			}
			`,
			variables : {
				segmentInput
			}
		}).then(function(result) {
			return result;
		})
	}

	getReferrals(variables) {
		return this.client.query({
			query: gql`
			query ($accountId: String!, $id: String!, $limit: Int!, $offset: Int!) {
				user(id: $id, accountId: $accountId) {
					id
					referralCode
					paidReferrals: referrals(filter:{
						dateReferralPaid_timeframe: "this_10_years"
					}, limit: 1) {
						totalCount
					}
					referredByReferral{
						fraudSignals
						moderationStatus
						dateReferralPaid
						referrerUser {
							id
							accountId
							firstName
							lastName
						}
					}
					referrals(limit: $limit, offset: $offset) {
						totalCount
						count
						data{
							id
							referredUser {
								id
								accountId
								firstName
								lastName
								email
							}
							moderationStatus
							dateReferralStarted
							dateReferralPaid
							dateReferralEnded
							dateModerated
							referredModerationStatus
							referrerModerationStatus
							fraudSignals
						}
					}
				}
			}
			`,
			variables,
			fetchPolicy: 'network-only'
		}).then(function(result) {
			return result.data.user;
		})
	}

	getRewards(variables) {
		return this.client.query({
			query: gql`
			query ($accountId: String!, $id: String!, $limit: Int!, $offset: Int!) {
				user(id: $id, accountId: $accountId) {
					id
					rewardBalances
					rewards(limit: $limit, offset: $offset) {
						totalCount
						count
						data {
							id
							type
							value
							unit
							name
							dateGiven
							dateExpires
							dateCancelled
							rewardSource
							fuelTankCode
							fuelTankCode
							fuelTankType
							currency
							programId
							programRewardKey
							program {
								id
								name
							}
							integrationId
							integration {
								id
								service
								type
								enabled
								config
							}
							description
							redeemedCredit
							assignedCredit
							cancellable
						}
					}
				}
			}
			`,
			variables,
			fetchPolicy: 'network-only'
		}).then(function(result) {
			return result.data.user;
		})
	}

	getUser(variables) {
		return this.client.query({
			query: gql`
			query ($accountId: String!, $id: String!) {
				user(id: $id, accountId: $accountId) {
					id
					accountId
					firstName
					lastName
					referralCode
					email
					cookieId
					paymentProviderId
					locale
					referable
					customFields
					firstSeenIP
					lastSeenIP
					firstSeenGeoData
					lastSeenGeoData
					dateCreated
					emailHash
					shareLinks
					segments
					dateBlocked
				}
			}
			`,
			variables,
			fetchPolicy: 'network-only'
		}).then(function(result) {
			return result.data.user;
		})
	}

	deleteUser(variables) {
		return this.client.mutate({
			mutation: gql`
			mutation deleteUser($accountId: String!, $id: String!, $doNotTrack: Boolean = false) {
				deleteUser(accountId: $accountId, id: $id, doNotTrack: $doNotTrack)
			}
			`,
			variables
		}).then(function(result) {
			return result;
		})
	}

	deleteAccount(variables) {
		return this.client.mutate({
			mutation: gql`
			mutation deleteAccount($accountId: String!, $doNotTrack: Boolean = false) {
				deleteAccount(accountId: $accountId, doNotTrack: $doNotTrack)
			}
			`,
			variables
		}).then(function(result) {
			return result;
		})
	}

	accountUserTotal(variables) {
		return this.client.query({
			query: gql`
			query ($accountId: String!) {
				account(accountId: $accountId) {
					users {
						totalCount
					}
				}
			}
			`,
			variables
		}).then(function(result) {
			return result.data.account.users.totalCount;
		})
	}
}

export default API;