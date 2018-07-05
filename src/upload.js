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
            validTypeNames:[]
        }

        this.handleUploadDone = this.handleUploadDone.bind(this);
        this.setCheckmark = this.setCheckmark.bind(this);
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

    componentWillMount() {
        //read all files
        let { domainname, tenant, filepath, auth, assetId} = this.props.options;
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

    render() {
        if (this.state.uploadDone) {
            return (<Checkmark assetId={this.state.assetId} setCheckmark={this.setCheckmark} />);
        } else if (this.state.fileRead) {
            return (<UploadingFile handleUploadDone={this.handleUploadDone} 
                                   inputData={this.state.inputData}
                                   assetId={this.state.assetId} options={this.props.options}/>);
        } else {
            //in the process of reading file
            return (<ReadingFile assetId={this.state.assetId} />);
        }
    }
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

class ReadingFile extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (<div> <Spinner green /> Reading {this.props.assetId} </div>);
    }
}

class UploadingFile extends Component {
    constructor(props) {
        super(props);

        this.uploadFile = this.uploadFile.bind(this);
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
      .option('-p, --typename [typename]', 'optional - valid typenames: [TenantTheme, ProgramEmailConfig, ProgramLinkConfig, ProgramWidgetConfig]')
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
  