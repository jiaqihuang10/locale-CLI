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
            keys = [...keys, asset.key];
        });
        this.setState({ validKeys: keys });   
    }

    componentWillMount() {    
        //get valid assetKeys for this tenant
        this.setValidKeys();    
    }


       
    render() {
        if (this.state.uploadDone) {
            return (<Checkmark assetId={this.state.assetId} setCheckmark={this.setCheckmark} />);
        } else if (this.state.filelist.length > 0) {
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


function readFile (filepath) {
    fs.open(filepath, 'r', (err, fd) => {
        if (err) {
            return console.error(err);
        }
        fs.readFile(filepath, 'utf8', (err, data) => {
            if(err) {
                return console.error(err);
            }
            this.setState({
                inputData: data,
                fileRead: true
            })
        });
    });
}

//check if the folder name matches valid keys
function validateDir(dir, validKeys) {
    const keys1 = dir.split('\\');
    const keys2 = (keys1[keys1.length-1]).split('/');

    // console.log("valid keys\n " + validKeys);
    // console.log(key[key.length-1]);
    return validKeys.includes(keys2[keys2.length-1]);
}

//check if the filename matches the locale format
function validateLocale(dir) {
    const names1 = dir.split('\\');
    const names2 = (names1[names1.length-1]).split('/');
    const re = /^([a-z]{2}_[A-Z]{2}).json$/; 
    console.log('name: ' + names2[names2.length-1]);
    return re.test(names2[names2.length-1]);
}


class Checkmark extends Component {
    constructor(props) {
        super(props);
    }
    
   componentDidMount() {
       this.props.setCheckmark();
   }

    render() {
        return (<div> <Color green> ✔ </Color> {this.props.assetId} uploaded </div>);
    }
}

//Validate and Read in all files
class ReadingFile extends Component {
    constructor(props) {
        super(props);

        this.walkSync = this.walkSync.bind(this);
    }

    //******************* to be fixed */
    // walk down the directory given, validate folder names and file names, list paths for all valid files to be uploaded 
    walkSync(dir, filelist = []) {
        console.log(typeof dir);
        console.log(typeof filelist);
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
        console.log(this.props.validKeys);
        const newfilelist = (this.walkSync(this.props.options.filepath));
        console.log(newfilelist);

        this.props.setFileList(newfilelist);
    }

    render() {
        return (<div> <Spinner green /> Reading {this.props.assetId} </div>);
    }
}

class UploadingFiles extends Component {
    constructor(props) {
        super(props);

        this.uploadFile = this.uploadFile.bind(this);
    }

    

    
}

class UploadEachFile extends Component {
    constructor(props) {
        super(props);

    }

    async uploadFile() {
        let { domainname, tenant, filepath, auth, assetId} = this.props.options;
        console.log("about to upload " + assetId);
        const translationInstanceInput = {
            id: assetId,
            content: JSON.parse(this.props.inputData)
        }
        try {
            await Query({domain: domainname, tenant: tenant, authToken: auth}).uploadAssets(translationInstanceInput);
        } catch (e) {
            console.error(e);
        }
       this.props.handleUploadDone();
    }

    componentDidMount() {
        this.uploadFile();
    }

    render() {
        return (<div> <Spinner green /> Uploading {this.props.assetId} </div>);
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
  