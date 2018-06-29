const { h, render, Component, Color} = require("ink");
const { List, ListItem } = require("./ink-checkbox");
const Spinner = require('ink-spinner');
const readline = require('readline');
const fs = require('fs');
const path = require('path')

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const mkdirSync = (path) => {
    try {
        fs.mkdirSync(path)
    } catch (err) {
        if (err.code !== 'EEXIST') throw err
    }
};

class DownloadAssets extends Component {
    constructor() {
        super();

        this.state = {
            data:null,
            assetNames:[],
            selectedFiles:[],
            submitted: false
        }

        this.handleListSubmission = this.handleListSubmission.bind(this);
    }

    componentWillMount() {
        fs.readFile('./src/sampleData.json',"utf8", (err, data) => {
            if (err) throw err;
            const assetData = JSON.parse(data);
            this.setState({data: assetData.data.translatableAssets});
            let names = [];
            assetData.data.translatableAssets.forEach(asset => {
               names = [...names, asset.__typename];
            });
            this.setState({assetNames: names});
            }
        );
    }

    handleListSubmission(list) {
        this.setState({
            selectedFiles: list,
            submitted: true
        });
    }

    
    render() {     
        if (this.state.submitted) {
            return (<Downloading selectedFiles={this.state.selectedFiles} data={this.state.data} />);
        } else {
            return (<ListFile assetNames={this.state.assetNames} onListSubmitted={this.handleListSubmission}/>);      
        }
    }
}

class ListFile extends Component {
    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this)
    }

    handleSubmit(selectedList) {
        //download file for each element in list
        console.log(selectedList);
	    process.exit(0);
    }

    render() {
        return (
            <div>
              <List
                onSubmit={list => this.props.onListSubmitted(list)}>
                {this.props.assetNames.map(l => <ListItem value={l}>{l}</ListItem>)}
              </List>
            </div>
        );
    }
}

 
//PROPS: selectedFiles, data
class Downloading extends Component {
    constructor(props) {
        super(props);

        this.state = {
            eachFileDone:{}
        }

        this.handleDownloadDone = this.handleDownloadDone.bind(this);
    }

    handleDownloadDone(name) {
        this.setState((prevState) => {
            let status = prevState.eachFileDone;
            status[name] = true;
            return ({eachFileDone:status});
        });
    }

    componentWillMount() {
        // set the list of download status track for each file
        this.dir = './assets';
        mkdirSync(this.dir);
        let status = {};
        this.props.data.map(asset => {
           status[asset.__typename] = false;
        });
        this.setState({
            eachFileDone:status
        });
    }
    render() {      
        const downloadList =  this.props.data.map(asset => {
            if (this.props.selectedFiles.includes(asset.__typename)) {
                if(this.state.eachFileDone[asset.__typename]) {
                    return (<div> <Color green> ✔ </Color> {asset.__typename} downloaded </div>);
                } else {
                    if (asset.__typename === "TenantTheme") {
                        return (<DownloadEachFile name={asset.__typename} dir={this.dir} data={JSON.stringify(asset.variables)} handleDownloadDone={this.handleDownloadDone} />);
                    } else {
                        return (<DownloadEachFile name={asset.__typename} dir={this.dir} data={JSON.stringify(asset.values)} handleDownloadDone={this.handleDownloadDone}/>);
                    } 
                }
            }
        });
        return (
            <span>
                {downloadList}
            </span>
        );
    }
}

class DownloadEachFile extends Component {
    constructor(props) {
        super(props);

        this.state = {
            done: false
        }
    }

    componentDidMount() {
        this.downloadFile();
    }
    //download file, indicator: spinner
    downloadFile() {
        const filePath = path.normalize(path.format({
            root: '/ignored',
            dir: this.props.dir,
            base: this.props.name
         })) + '.json';
        fs.open(filePath, "w+", (err, fd) => {
            if(err) {
                return console.error(err);
            }
            this.fd = fd;
            fs.write(fd, this.props.data, 'utf8', ()=> {
                this.props.handleDownloadDone(this.props.name);
            })
        });
    }

    componentWillUnmount() {
        fs.close(this.fd, (err)=> {
            if (err) {
                return console.error(err);
            }
        });
    }
    
    render() {
        return (<div> <Spinner green /> {this.props.name} </div>);
    }
}


render(<DownloadAssets/>);
