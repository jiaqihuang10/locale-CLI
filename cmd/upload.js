var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

// @ts-check

const { h, render, Component, Color } = require("ink");
const Spinner = require('ink-spinner');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const Query = require('./query');
const base64 = require('base-64');
const glob = require('glob');
const LocaleCode = require('locale-code');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
const currentValidTypes = ['TenantTheme', 'ProgramEmailConfig', 'ProgramWidgetConfig', 'ProgramLinkConfig'];

class UploadAssets extends Component {
    constructor(props) {
        super(props);

        this.state = {
            inputData: {},
            assetId: this.props.options.assetId,
            validKeys: [],
            filelist: []
        };
        this.handleUploadAllDone = this.handleUploadAllDone.bind(this);
        this.setFileList = this.setFileList.bind(this);
    }

    handleUploadAllDone() {
        process.exit();
    }

    setFileList(list) {
        this.setState({
            filelist: list
        });
    }

    async setValidKeys() {
        let { domainname, tenant, filepath, auth, assetId, typename, programId } = this.props.options;
        let assets = null;
        let keys = [];

        if (typename === 'TenantTheme') {
            keys.push('TenantTheme');
        } else if (typename === 'ProgramLinkConfig') {
            keys.push('default');
        } else {
            if (programId === undefined) {
                console.log("Program ID required for ProgramEmailConfig, ProgramWidgetConfig, ProgramLinkConfig");
                process.exit();
            }

            try {
                const receivedData = await Query({
                    domain: domainname,
                    tenant: tenant,
                    authToken: auth
                }).getProgramData(programId);
                if (receivedData.data.program) {
                    assets = receivedData.data.program.translatableAssets;
                } else {
                    console.log("Program with id " + programId + " not found in current tenant.");
                    process.exit(0);
                }
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
            assets.forEach(asset => {
                if (asset.__typename === typename && !keys.includes(asset.key)) {
                    keys = [...keys, asset.key];
                }
            });
        }
        this.setState({
            validKeys: keys
        });
    }

    componentWillMount() {
        //get valid assetKeys for this tenant
        this.setValidKeys();
    }

    render() {
        if (this.state.filelist.length > 0) {
            return h(UploadingFiles, { handleUploadAllDone: this.handleUploadAllDone,
                filelist: this.state.filelist,
                options: this.props.options });
        } else {
            //in the process of reading file
            if (this.state.validKeys.length > 0) {
                return h(ReadingFile, { assetId: this.state.assetId, options: this.props.options, validKeys: this.state.validKeys, setFileList: this.setFileList });
            }
        }
    }
}

//check if the filename matches the locale format
function validateLocale(dir) {
    let locale = getNameFromPath(dir);
    const temp = locale.split('_');
    if (temp.length > 1) {
        locale = temp[0] + '-' + temp[1];
    }
    return LocaleCode.validate(locale.split('.')[0]);
}

function getNameFromPath(path) {
    const names1 = path.split('\\');
    const names2 = names1[names1.length - 1].split('/');

    return names2[names2.length - 1];
}

function getKeyFromPath(path) {
    const names1 = path.split('\\');
    if (names1.length > 1) {
        return names1[names1.length - 2];
    } else {
        const names2 = path.split('/');
        return names2[names2.length - 2];
    }
}

class Checkmark extends Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.props.setCheckmark(this.props.name);
    }

    render() {
        return h(
            'div',
            null,
            ' ',
            h(
                Color,
                { green: true },
                ' \u2714 '
            ),
            ' Uploaded ',
            this.props.name,
            '  '
        );
    }
}

//Validate and get a list of paths of all files to be uploaded
class ReadingFile extends Component {
    constructor(props) {
        super(props);
    }

    //put valid keys into a pattern string for directory traversal and validation
    getValidKeyPattern(validKeys) {
        //valid key patterns
        let pattern = '@(';
        validKeys.forEach(key => {
            pattern = pattern + key + '|';
        });
        return pattern.substring(0, pattern.length - 1) + ')';
    }

    getValidFilelist(filelist, validKeys) {
        return filelist.filter(filename => {
            let name = filename.split('/');
            return validKeys.includes(name[name.length - 2]) && validateLocale(name[name.length - 1]);
        });
    }

    componentWillMount() {
        const validKeys = this.props.validKeys;
        const validKeyPattern = this.getValidKeyPattern(validKeys);
        const pattern = this.props.options.filepath + '/**/' + validKeyPattern + '/*.json';
        glob(pattern, { mark: true }, (err, files) => {
            if (err) {
                console.error(err);
            }
            const validfiles = this.getValidFilelist(files, validKeys);
            //console.log(validfiles);
            this.props.setFileList(validfiles);
        });
    }

    render() {
        return h(
            'div',
            null,
            ' ',
            h(Spinner, { green: true }),
            ' Reading ',
            this.props.assetId,
            ' '
        );
    }
}

//read and ready to upload each file
//props - filepathlist
class UploadingFiles extends Component {
    constructor(props) {
        super(props);

        this.state = {
            eachFileDone: {},
            eachFileChecked: {},
            allDone: false
        };

        this.handleSingleUploadDone = this.handleSingleUploadDone.bind(this);
        this.setCheckmark = this.setCheckmark.bind(this);
    }

    componentWillMount() {
        let temp = {};
        this.props.filelist.forEach(path => {
            temp[path] = false;
        });
        this.setState({
            eachFileDone: temp,
            eachFileChecked: temp
        });
    }

    componentDidUpdate() {
        if (this.state.allDone) {
            this.props.handleUploadAllDone();
        }
    }

    handleSingleUploadDone(name) {
        this.setState(prevState => {
            let status = prevState.eachFileDone;
            status[name] = true;
            return {
                eachFileDone: status };
        });
    }

    setCheckmark(name) {
        this.setState(prevState => {
            let status = prevState.eachFileChecked;
            status[name] = true;
            let allFileChecked = true;
            Object.keys(status).forEach(k => {
                allFileChecked = allFileChecked && status[k];
            });
            return {
                eachFileChecked: status,
                allDone: allFileChecked };
        });
    }

    render() {
        let uploadComponentList = [];
        this.props.filelist.forEach(path => {
            if (this.state.eachFileDone[path]) {
                uploadComponentList = [...uploadComponentList, h(Checkmark, { name: path, setCheckmark: this.setCheckmark })];
            } else {
                uploadComponentList = [...uploadComponentList, h(UploadingEachFile, { path: path, options: this.props.options, handleSingleUploadDone: this.handleSingleUploadDone })];
            }
        });

        return uploadComponentList;
    }

}

function standardizeLocale(filename) {
    const str = filename.split('.');
    let localeStr = str[0].split('-');
    if (localeStr.length > 1) {
        return localeStr[0] + '_' + localeStr[1];
    } else {
        return localeStr[0];
    }
}
function generateAssetKey({ typename, path, programId }) {
    const map = {
        'ProgramEmailConfig': 'e',
        'ProgramWidgetConfig': 'w',
        'ProgramLinkConfig': 'l'
    };
    const filename = getNameFromPath(path);
    const key = getKeyFromPath(path);

    const locale = standardizeLocale(filename);
    if (typename === 'TenantTheme') {
        return 'TenantTheme' + '/' + locale;
    } else {
        return 'p/' + programId + '/' + map[typename] + '/' + key + '/' + locale;
    }
}

class UploadingEachFile extends Component {
    constructor(props) {
        super(props);
    }

    uploadFile(path) {
        fs.open(path, 'r', (err, fd) => {
            if (err) {
                return console.error(err);
            }
            fs.readFile(path, 'utf8', (err, data) => {
                if (err) {
                    return console.error(err);
                }

                let { domainname, tenant, auth, assetId, programId, typename } = this.props.options;
                const transId = generateAssetKey({ typename: typename, path: this.props.path, programId: programId });
                const translationInstanceInput = {
                    id: transId,
                    content: JSON.parse(data)
                };
                try {
                    Query({ domain: domainname, tenant: tenant, authToken: auth }).uploadAssets(translationInstanceInput);
                } catch (e) {
                    console.error(e);
                    process.exit();
                }
            });
        });
    }

    componentDidMount() {
        this.uploadFile(this.props.path);
        this.props.handleSingleUploadDone(this.props.path);
    }

    render() {
        return h(
            'div',
            null,
            ' ',
            h(Spinner, { green: true }),
            ' Uploading ',
            this.props.path,
            ' '
        );
    }

}

module.exports = program => {
    let upload = program.command("upload");

    upload.description("upload translations").option('-d,--domainname <domainname>', 'required - domain') //naming collision with domain, use domain name instead
    .option('-u,--authToken <authToken>', 'required - authToken') //the apiKey, use authToken to avoid naming collision
    .option("-t,--tenant <tenant>", "required - which tenant").option('-a, --assetId [assetId]', 'optional - id for the single translation file upload').option('-f,--filepath <filepath>', 'required - the file path').option('-p, --typename <typename>', 'required - valid typenames: [TenantTheme, ProgramEmailConfig, ProgramLinkConfig, ProgramWidgetConfig] or [w, e, l, t]').option('-i, --programId [programId]', 'optional - Program Id is required for types [ProgramEmailConfig, ProgramLinkConfig, ProgramWidgetConfig]').action(options => {
        if (!currentValidTypes.includes(options.typename)) {
            console.log("Invalid typename, must be one of " + currentValidTypes);
            process.exit();
        }
        const newOptions = _extends({
            auth: base64.encode(":" + options.authToken)
        }, options);
        render(h(UploadAssets, { options: newOptions }));
    });

    return upload;
};