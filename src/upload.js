// @ts-check

const { h, render, Component, Color} = require("ink");
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

class UploadAssets extends Component {
    constructor(props) {
        super(props)

        this.state = {
            inputData: {}, 
            uploadDone: false,
            fileRead:false,
            checkmarked: false,
            assetId: this.props.options.assetId,
            validKeys:[],
            filelist: []
        }
        this.handleUploadAllDone = this.handleUploadAllDone.bind(this);
        this.setCheckmark = this.setCheckmark.bind(this);
        this.setFileList = this.setFileList.bind(this);
    }

    
    handleUploadAllDone() {
        this.setState({
            uploadDone: true
        })
    }

    componentWillUpdate() {
        if(this.state.uploadDone) {
            process.exit();
        }
    }

    setCheckmark() {
        this.setState({
            checkmarked: true
        });
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

        assets = await Query({
            domain: domainname,
            tenant: tenant,
            authToken: auth
          }).getAssets();
        
        if (typename !== undefined) {
            assets.data.translatableAssets.forEach(asset => {
                if(asset.__typename === typename) {
                    keys = [...keys,asset.key];
                }
            });
        } else {
            //typename not provided, upload all valid translations inside the given directory
            assets.data.translatableAssets.forEach(asset => {
                if (asset.__typename == 'TenantTheme' && !keys.includes( 'TenantTheme' )) {
                    keys = [...keys, 'TenantTheme'];
                } else if (asset.__typename == 'ProgramLinkConfig' && !keys.includes( 'ProgramLinkConfig' )) {
                    keys = [...keys, 'ProgramLinkConfig'];
                } else {
                    if (!keys.includes(asset.key) && asset.key !== undefined) {
                        keys = [...keys, asset.key];
                    }
                }
            });
        }
        
        this.setState({ validKeys: keys });   
    }

    componentWillMount() {    
        //get valid assetKeys for this tenant
        this.setValidKeys();    
    }
       
    render() {
        if (this.state.filelist.length > 0) {
            return (<UploadingFiles handleUploadAllDone={this.handleUploadAllDone} 
                                   filelist={this.state.filelist}
                                   options={this.props.options}/>);
        } else {
            //in the process of reading file
            if (this.state.validKeys.length > 0) {
                return (<ReadingFile assetId={this.state.assetId} options={this.props.options} validKeys={this.state.validKeys} setFileList={this.setFileList} />);
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
    return LocaleCode.validate((locale.split('.'))[0]);
}

function getNameFromPath(path) {
    const names1 = path.split('\\');
    const names2 = (names1[names1.length-1]).split('/');

    return names2[names2.length-1];
}

function getKeyFromPath(path) {
    const names1 = path.split('\\');
    if (names1.length > 1) {
        return names1[names1.length-2];
    } else {
        const names2 = path.split('/');
        return names2[names2.length-2];
    }
}

class Checkmark extends Component {
    constructor(props) {
        super(props);
    }
    
//    componentDidMount() {
//        this.props.setCheckmark();
//    }

    render() {
        return (<div> <Color green> ✔ </Color> Uploaded {this.props.name}  </div>);
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
        validKeys.forEach( key => {
            pattern = pattern + key + '|';
        });
        return pattern.substring(0,pattern.length-1)+')';
    }

    getValidFilelist(filelist, validkeys) {
        return filelist.filter(filename => {
            let name = filename.split('/');
            return validkeys.includes(name[name.length-2]) && validateLocale(name[name.length-1]) ;
        });
    }

    componentWillMount() {
        const validKeys = this.props.validKeys;
        const validKeyPattern = this.getValidKeyPattern(validKeys);
        const pattern = this.props.options.filepath+'/**/' + validKeyPattern+'/*.json';
        glob(pattern, {mark:true}, (err, files) => {
            if(err) {
                console.error(err);
            }
            const validfiles = this.getValidFilelist(files,validKeys);
            console.log(validfiles);
            this.props.setFileList(validfiles);
        } )
    }

    render() {
        return (<div> <Spinner green /> Reading {this.props.assetId} </div>);
    }
}

//read and ready to upload each file
//props - filepathlist
class UploadingFiles extends Component {
    constructor(props) {
        super(props);

        this.state = {
            eachFileDone: {},
            allDone:false
          };

        this.handleSingleUploadDone = this.handleSingleUploadDone.bind(this);
    }

    componentWillMount() {
        let temp = {};
        this.props.filelist.forEach( path => {
            temp[path] = false;
        });
        this.setState( {
            eachFileDone : temp
        });
    }

    componentWillUpdate() {
        if (this.state.allDone) {
            return this.props.handleUploadAllDone();
        }
    }

    handleSingleUploadDone(name) {
        this.setState(prevState => {
            let status = prevState.eachFileDone;
            status[name] = true;
            let allFileChecked = true;
            Object.keys(status).forEach((k) => { allFileChecked =  allFileChecked && status[k]});
            return { 
                eachFileDone: status,
                allDone: allFileChecked} ;
        });
    }
    

    render() {
        let uploadComponentList = [];
        this.props.filelist.forEach ( path => {
            if(this.state.eachFileDone[path]) {
                uploadComponentList = [...uploadComponentList, <Checkmark name={path}/>];
            } else {
                uploadComponentList = [...uploadComponentList, <UploadingEachFile path={path} options={this.props.options} handleSingleUploadDone={this.handleSingleUploadDone}/>];
            }
        });

        return uploadComponentList;
    }
    
}

function standardizeLocale(filename){
    const str = filename.split('.');
    let localeStr = str[0].split('-');
    if (localeStr.length > 1) {
        return localeStr[0] + '_' + localeStr[1];
    } else {
        return localeStr[0];
    }
    
}
function generateAssetKey({typename, path, programId}) {
    const map = {
        'ProgramEmailConfig': 'e',
        'ProgramWidgetConfig': 'w',
        'ProgramLinkConfig': 'l'
    }
    const filename = getNameFromPath(path);
    const key = getKeyFromPath(path);

    const locale = standardizeLocale(filename);
    if (typename === 'TenantTheme') {
        return 'TenantTheme' + '/' + locale;   
    } else {
        return ('p/'+programId+'/'+map[typename]+'/'+key+'/'+locale);
    }
}

class UploadingEachFile extends Component {
    constructor(props) {
        super(props);
    }

    uploadFile (path) {
        fs.open(path, 'r', (err, fd) => {
            if (err) {
                return console.error(err);
            }
            fs.readFile(path, 'utf8', (err, data) => {
                if(err) {
                    return console.error(err);
                }

            let { domainname, tenant, auth, assetId, programId, typename} = this.props.options;
            const transId = generateAssetKey({typename: typename, path: this.props.path, programId: programId});
            const translationInstanceInput = {
                id: transId,
                content: JSON.parse(data)
            }
            //console.log(transId);
            try {
                Query({domain: domainname, tenant: tenant, authToken: auth}).uploadAssets(translationInstanceInput);
            } catch (e) {
                console.error(e);
                process.exit();
            }
        this.props.handleSingleUploadDone(this.props.path);
                });
            });
    }

    componentDidMount() {
        this.uploadFile(this.props.path);
    }

    render() {
        return (<div> <Spinner green /> Uploading {this.props.path} </div>);
    }

}

module.exports = (program) => {
    let upload = program.command("upload");
  
    upload
      .description("upload translations")
      .option('-d,--domainname <domainname>', 'required - domain') //naming collision with domain, use domain name instead
      .option('-u,--authToken <authToken>', 'required - authToken') //the apiKey, use authToken to avoid naming collision
      .option("-t,--tenant <tenant>", "required - which tenant")
      .option('-a, --assetId [assetId]', 'optional - id for the single translation file upload')
      .option('-f,--filepath <filepath>', 'required - the file path')
      .option('-p, --typename [typename]', 'optional - valid typenames: [TenantTheme, ProgramEmailConfig, ProgramLinkConfig, ProgramWidgetConfig] or [w, e, l, t]')
      .option('-i, --programId [programId]', 'optional - Program Id is required for types [ProgramEmailConfig, ProgramLinkConfig, ProgramWidgetConfig]')
      .action( options => {
          const newOptions = {
              auth: base64.encode(":" + options.authToken),
              ...options
        }
        render(<UploadAssets options={newOptions} />);
      });
  
    return upload;
  };
  