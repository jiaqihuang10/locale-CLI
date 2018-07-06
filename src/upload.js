// @ts-check

const { h, render, Component, Color} = require("ink");
const Spinner = require('ink-spinner');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const Query = require('./query');
const base64 = require('base-64');

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
        this.handleUploadDone = this.handleUploadDone.bind(this);
        this.setCheckmark = this.setCheckmark.bind(this);
        this.setFileList = this.setFileList.bind(this);
    }

    
    handleUploadDone() {
        this.setState({
            uploadDone: true
        })
    }

    componentDidUpdate() {
        if(this.state.checkmarked) {
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
        let { domainname, tenant, filepath, auth, assetId, programId, } = this.props.options;
        let assets = null;
        let keys = [];

        assets = await Query({
            domain: domainname,
            tenant: tenant,
            authToken: auth
          }).getAssets();
        
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
        this.setState({ validKeys: keys });   
    }

    componentWillMount() {    
        //get valid assetKeys for this tenant
        this.setValidKeys();    
    }


       
    render() {
        if (this.state.filelist.length > 0) {
            return (<UploadingFiles handleUploadDone={this.handleUploadDone} 
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

//check if the folder name matches valid keys
function validateDir(dir, validKeys) {
    const key = getNameFromPath(dir);
    return validKeys.includes(key);
}

//check if the filename matches the locale format
function validateLocale(dir) {
    const name = getNameFromPath(dir);
    const re = /^([a-z]{2}_[A-Z]{2}).json$/; 
    console.log('name: ' + name);
    return re.test(name);
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

        this.walkSync = this.walkSync.bind(this);
    }

    //******************* to be fixed */
    // walk down the directory given, validate folder names and file names, list paths for all valid files to be uploaded 
    walkSync(dir, filelist = []) {
        if(fs.lstatSync(dir).isDirectory()) {
            if(validateDir(dir, this.props.validKeys)) {
                console.log('valid key');
                return fs.readdirSync(dir).map( f => this.walkSync(path.join(dir,f), filelist));
            } else {
                //go deeper until folders with valid key names are found
                console.log(dir + " is not a valid key");
            }
        } else {
            if(validateLocale(dir)) {
                console.log('valid json name');
                filelist.push(dir);
                return filelist;
            } else {
                console.log(dir + " does not have a valid file name");
                return;
            }
        }
    }

    componentWillMount() {
        //validate dir and files
        console.log('valid keys');
        console.log(this.props.validKeys);
        const newfilelist = (this.walkSync(this.props.options.filepath))[0];
        console.log(newfilelist);

        this.props.setFileList(newfilelist);
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
            uploadDone : {} //keep track of each file upload
        }

        this.handleSingleUploadDone = this.handleSingleUploadDone.bind(this);
    }

    componentWillMount() {
        let temp = {};
        this.props.filelist.forEach( path => {
            temp[path] = false;
        });
        this.setState( {
            uploadDone : temp
        });
    }

    handleSingleUploadDone(path) {
        this.setState (prevState => {
            let list = prevState.uploadDone;
            list[path] = true;
            return {
                uploadDone: list
            };
        })
    }
    
    render() {
        let uploadComponentList = [];
        this.props.filelist.forEach ( path => {
            if(this.state.uploadDone[path]) {
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
    console.log(locale);
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
                this.assetUpsert(data);
            });
        });
    }

    async assetUpsert (data) {
        let { domainname, tenant, auth, assetId, programId, typename} = this.props.options;
        const transId = generateAssetKey({typename: typename, path: this.props.path, programId: programId});
        console.log("about to upload " + this.props.path);
        const translationInstanceInput = {
            id: transId,
            content: JSON.parse(data)
        }
        console.log(transId);
        try {
            await Query({domain: domainname, tenant: tenant, authToken: auth}).uploadAssets(translationInstanceInput);
        } catch (e) {
            console.error(e);
            process.exit();
        }
       this.props.handleSingleUploadDone(this.props.path);
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
      .description("download an translation")
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
  