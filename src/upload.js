const { h, render, Component, Color} = require("ink");
const { List, ListItem } = require("./ink-checkbox");
const TextInput = require('ink-text-input');
const Spinner = require('ink-spinner');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const Query = require('./query');
const base64 = require('base-64');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

//read from cli  && read http info from cli
// const filepath = './assets/ProgramEmailConfig.json';
// const assetId = 'p/5b2d65bee4b07b92ce09d785/e/testRewardEmail/de_DE';

class InputForUpload extends Component {
    constructor(props) {
        super(props);

        this.state = {
            haveReadDomain: false,
            haveReadTenant: false,
            haveReadFilepath: false,
            haveReadAssetId: false,
            haveReadAPIKey: false,
            domain: null,
            tenant: null,
            apiKey: null,
            filepath: null,
            assetId: null,
            authToken: null
        }

        this.handleDomain = this.handleDomain.bind(this);
        this.handleTenent = this.handleTenent.bind(this);
        this.handleAPIKey = this.handleAPIKey.bind(this);
        this.handleFile = this.handleFile.bind(this);
        this.handleAssetId = this.handleAssetId.bind(this);
    }

    handleDomain(value) {
        this.setState({
            domain: value,
            haveReadDomain: true
        });
    }

    handleTenent(value) {
        this.setState({
            tenant: value,
            haveReadTenant: true
        });
    }

    handleAPIKey(value) {
        //encrypt apikey
        const encodedData = base64.encode(":"+ value);
        console.log(encodedData);
        process.exit();
        this.setState({
            authToken: encodedData,
            haveReadAPIKey: true
        });
    }

    handleFile(value) {
        this.setState({
            filepath: value,
            haveReadFilepath: true
        });
    }

    handleAssetId(value) {
        this.setState({
            assetId: value,
            haveReadAssetId: true
        });
    }

    render() {
        let inputComponentList = [<ReadDomain handleDomain={this.handleDomain}/>];
        if (this.state.haveReadDomain) {
            inputComponentList = [...inputComponentList, <ReadTenant handleTenent={this.handleTenent}/>];
        }
        if (this.state.haveReadTenant) {
            inputComponentList = [...inputComponentList, <ReadAPIKey handleAPIKey={this.handleAPIKey}/>];
        }
        if (this.state.haveReadAPIKey) {
            inputComponentList = [...inputComponentList, <ReadFile handleFile={this.handleFile}/>];
        }
        if (this.state.haveReadFilepath) {
            inputComponentList = [...inputComponentList, <ReadAssetId handleAssetId={this.handleAssetId}/>];
        }
        if (this.state.haveReadAssetId) {
            inputComponentList = [...inputComponentList, <UploadAssets domain={this.state.domain} 
                                                                       tenant={this.state.tenant} 
                                                                       authToken={this.state.authToken} 
                                                                       filepath={this.state.filepath}
                                                                       assetId={this.state.assetId} />];
        }
        return inputComponentList;
    }
}

class ReadDomain extends Component {
    constructor(props) {
        super(props)

        this.state = {
            val: ''
        }
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleChange(value) {
        this.setState({
            val: value
        });
    }

    handleSubmit(value) {
        this.props.handleDomain(value);
    }

    render() {
        return (<div>Enter your domain: <TextInput value={this.state.val} onChange={this.handleChange} onSubmit={this.handleSubmit} /></div>);
    }
}

class ReadTenant extends Component {
    constructor(props) {
        super(props)

        this.state = {
            val: ''
        }
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleChange(value) {
        this.setState({
            val: value
        });
    }

    handleSubmit(value) {
        this.props.handleTenent(value);
    }

    render() {
        return (<div>Enter your tenant alias: <TextInput value={this.state.val} onChange={this.handleChange} onSubmit={this.handleSubmit} /></div>);
    }
}

class ReadAPIKey extends Component {
    constructor(props) {
        super(props)

        this.state = {
            val: ''
        }
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleChange(value) {
        this.setState({
            val: value
        });
    }

    handleSubmit(value) {
        this.props.handleAPIKey(value);
    }

    render() {
        return (<div>Enter your API key: <TextInput value={this.state.val} onChange={this.handleChange} onSubmit={this.handleSubmit} /></div>);
    }
}

class ReadFile extends Component {
    constructor(props) {
        super(props)

        this.state = {
            val: ''
        }
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleChange(value) {
        this.setState({
            val: value
        });
    }

    handleSubmit(value) {
        this.props.handleFile(value);
    }

    render() {
        return (<div>Enter your file path: <TextInput value={this.state.val} onChange={this.handleChange} onSubmit={this.handleSubmit} /></div>);
    }
}

class ReadAssetId extends Component {
    constructor(props) {
        super(props)

        this.state = {
            val: ''
        }
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleChange(value) {
        this.setState({
            val: value
        });
    }

    handleSubmit(value) {
        this.props.handleAssetId(value);
    }

    render() {
        return (<div>Enter your asset ID: <TextInput value={this.state.val} onChange={this.handleChange} onSubmit={this.handleSubmit} /></div>);
    }
}

class UploadAssets extends Component {
    constructor(props) {
        super(props)

        this.state = {
            inputData: null,
            uploadDone: false,
            fileRead:false
        }

        this.handleUploadDone = this.handleUploadDone.bind(this);
    }

    handleUploadDone() {
        this.setState({
            uploadDone: true
        })
    }

    componentWillMount() {
        fs.open(this.props.filepath, 'r', (err, fd) => {
            if (err) {
                return console.error(err);
            }
            console.log("File opened successfully!");
            console.log("Going to read the file");
            fs.readFile(filethis.props.filepathpath, 'utf8', (err, data) => {
                if(err) {
                    return console.error(err);
                }
                //console.log(data);
                this.setState({
                    inputData: data,
                    fileRead: true
                })
            });
        });
    }

    render() {
        if (this.state.uploadDone) {
            return (<div> <Color green> ✔ </Color> {this.props.assetId} uploaded </div>);
        } else if (this.state.fileRead) {
            return (<UploadingFile handleUploadDone={this.handleUploadDone} 
                                   inputData={this.state.inputData}
                                   assetId={this.props.assetId} />);
        } else {
            //in the process of reading file
            return (<ReadingFile assetId={this.props.assetId} />);
        }
    }
}

class ReadingFile extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (<div> <Spinner green /> Reading {assetId} </div>);
    }
}

class UploadingFile extends Component {
    constructor(props) {
        super(props);

        this.uploadFile = this.uploadFile.bind(this);
    }

    uploadFile() {
        console.log("before uploading");
        const translationInstanceInput = {
            id: this.props.assetId,
            content: JSON.parse(this.props.inputData)
        }

        console.log(JSON.stringify(translationInstanceInput));
        try {
            Query({domain: this.props.domain, tenant: this.props.tenant, authToken: this.props.authToken}).uploadAssets(translationInstanceInput);
        } catch (e) {
            console.error(e);
        }
        this.props.handleUploadDone();
    }

    componentDidMount() {
        console.log(this.props.inputData);
        this.uploadFile();
    }

    render() {
        return (<div> <Spinner green /> Uploading {this.props.assetId} </div>);
    }
}


render(<InputForUpload />);

module.exports = (program) => {
    let upload = program.command('upload');

    upload
        .description('Upload an translation')
        .option('-t, --tenant [tenant]', 'required - which tenant')
        .option('-d, --domain [domain]', 'required - domain')
        .option('-k, --key [apikey]', 'required - api Key')
        .option('-a, -assetId [assetId]', 'required - asset id')
        .option('-f -filepath [filepath]', 'required - the file path')
        .action( (options) => {
            tenant = options.tenant;
            domain = options.domain;
            apiKey = options.apiKey;
            assetId = options.assetId;
            filepath = options.filepath;

            render(<InputForUpload />)});
    
    return upload;
}