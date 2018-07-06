### upload

Upload translations for [TenantTheme, ProgramEmailConfig, ProgramLinkConfig, ProgramWidgetConfig]

ProgramEmailConfig, ProgramLinkConfig, ProgramWidgetConfig - per program , program id is required

TenantTheme - per tenant 

upload multiple translations for certain type.
Example - 
Upload fr_FR and de_De translations for referralCompleted Emails

typename: ProgramEmailConfig (or e)
ProgramId: 5b3e4d28e4b04b486fc9cf99
translatableAssetKey: "referralCompleted"

Name translation files as fr_FR.json and de_DE.json, put them into one folder named 'referralCompleted'. Give '[path]/referralCompleted' as path, both files will be uploaded.

```
squatch -d [domain] -t [tenant] -u [apiKey] -i [programId] -p e -p [<path>/referralCompleted]
```

Alternativey,

Give the path of a folder, all sub-folders of which are with names that match the keys will be searched, and translation files with names matching the locale format will be uploaded.

Note: translation filenames that do not match the format will be ignored. 


assets
    -- /ProgramEmailConfig
        -- /referralCompleted
            -- fr_Fr.json
            -- de_DE.json
        -- /referralStarted
            -- fr_Fr.json
            -- de_DE.json
            -- en_US.json
    -- /TenantTheme
            -- fr_Fr.json
            -- de_DE.json
            -- en_US.json
    -- /ProgramLinkConfig
            -- /default
            -- default.json
