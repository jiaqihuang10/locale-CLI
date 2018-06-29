const { h, render, Component, Color } = require("ink");
const { List, ListItem } = require("./ink-checkbox");
const Spinner = require('ink-spinner');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const mkdirSync = path => {
    try {
        fs.mkdirSync(path);
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
};

class DownloadAssets extends Component {
    constructor() {
        super();

        this.state = {
            data: null,
            assetNames: [],
            selectedFiles: [],
            submitted: false
        };

        this.handleListSubmission = this.handleListSubmission.bind(this);
    }

    componentWillMount() {
        fs.readFile('./src/sampleData.json', "utf8", (err, data) => {
            if (err) throw err;
            const assetData = JSON.parse(data);
            this.setState({ data: assetData.data.translatableAssets });
            let names = [];
            assetData.data.translatableAssets.forEach(asset => {
                names = [...names, asset.__typename];
            });
            this.setState({ assetNames: names });
        });
    }

    handleListSubmission(list) {
        this.setState({
            selectedFiles: list,
            submitted: true
        });
    }

    render() {
        if (this.state.submitted) {
            return h(Downloading, { selectedFiles: this.state.selectedFiles, data: this.state.data });
        } else {
            return h(ListFile, { assetNames: this.state.assetNames, onListSubmitted: this.handleListSubmission });
        }
    }
}

class ListFile extends Component {
    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(selectedList) {
        //download file for each element in list
        console.log(selectedList);
        process.exit(0);
    }

    render() {
        return h(
            "div",
            null,
            h(
                List,
                {
                    onSubmit: list => this.props.onListSubmitted(list) },
                this.props.assetNames.map(l => h(
                    ListItem,
                    { value: l },
                    l
                ))
            )
        );
    }
}

//PROPS: selectedFiles, data
class Downloading extends Component {
    constructor(props) {
        super(props);

        this.state = {
            done: false
        };
    }

    render() {
        const dir = './assets';
        mkdirSync(dir);
        const downloadList = this.props.data.map(asset => {
            if (this.props.selectedFiles.includes(asset.__typename)) {
                if (asset.__typename === "TenantTheme") {
                    return h(DownloadEachFile, { name: asset.__typename, dir: dir, data: JSON.stringify(asset.variables) });
                } else {
                    return h(DownloadEachFile, { name: asset.__typename, dir: dir, data: JSON.stringify(asset.value) });
                }
            }
        });
        return h(
            "span",
            null,
            downloadList
        );
    }
}

class DownloadEachFile extends Component {
    constructor(props) {
        super(props);

        this.state = {
            done: false
        };
    }

    // const filePath = path.normalize(path.format({
    //     root: '/ignored',
    //     dir: dir,
    //     base: asset.__typename
    //  }));
    //download file, indicator: spinner
    downloadFile() {
        //console.log(data);
        fs.open('./assets/path.txt', "w+", (err, fd) => {
            if (err) {
                return console.error(err);
            }
            fs.write(fd, this.props.data, 'utf8', () => {
                this.setState({
                    done: true
                });
            });
        });
    }

    render() {
        return h(
            "div",
            null,
            " ",
            h(Spinner, { green: true }),
            " ",
            this.props.name,
            " "
        );
    }
    //  {
    //     if (this.state.done) {
    //         return (<div><p> {this.props.filename} <Color green>
    //          ✔
    //       </Color> </p> </div>)
    //     } else {
    //         return ((
    //             <div>
    //                 <Spinner green/> Downloading {this.props.filename}
    //             </div>
    //         ));
    //     }
    // }    
}

render(h(DownloadAssets, null));