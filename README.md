### squatch upload

Upload translations for TenantTheme, ProgramEmailConfig, ProgramLinkConfig, ProgramWidgetConfig.

```
$ squatch upload -d https://staging.referralsaasquatch.com -t test_alu125hh1si9w -k TEST_BHASKh5125Las5hL125oh3VbLmPxUSs -f ./assets -i 5b3e91cbe4b04b486fc9e474 -p ProgramWidgetConfig
```
#### Options
```
-d, --domainname [domainname] required - server domain
-t, --tenant [tenant]  required - which tenant to use
-k, --apiKey [apiKey]  required - which API key to use (for corresponding tenant)
-f, --filepath [filepath] required - path of files to be uploaded
-p, --typename [typename] required - type of assets to be uploaded, one of TenantTheme, ProgramEmailConfig, ProgramLinkConfig, ProgramWidgetConfig
-i, --programId [programId] optional - program id is required for ProgramEmailConfig, ProgramLinkConfig, ProgramWidgetConfig
```

Translation files must be json files named with locale codes according to ISO, for example, de_DE.json, fr_FR.json.
Translation files must be put in folders with structure as below:

```
    /[root assets folder]
        - /Program
            - /[Typename]
                - /[Key]
                    - [translation json file]
        - /TenantTheme
            - [translation json file]
```

#### Example
```
/assets
    - /Basic Referral Program
        - /ProgramEmailConfig
            - /referralStarted
                - de_DE.json
                - fr_FR.json
            - /rewardLimitReached
                - ja_JP.json
            - /referredRewardReceived
                - zh_CN.json
        - /ProgramLinkConfig
            - /default
        - /ProgramWidgetConfig
            - /referrerWidget
                - de_DE.json
                - fr_FR.json
            - /referredWidget
                - fr_FR.json
    - /TenantTheme
        - de_DE.json
        - fr_FR.json
```

### squatch download
Download translations 

```
$ squatch upload -d https://staging.referralsaasquatch.com -t test_alu125hh1si9w -k TEST_BHASKh5125Las5hL125oh3VbLmPxUSs -f ./assets
```

#### Options
```
-d, --domainname [domainname] required - server domain
-t, --tenant [tenant]  required - which tenant to use
-k, --apiKey [apiKey]  required - which API key to use (for corresponding tenant)
-f, --filepath [filepath] required - path where downloaded files to be saved
```

