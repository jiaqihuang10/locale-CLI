var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

// @ts-check

const { h, render, Component, Color } = require("ink");
const { List, ListItem } = require('./components/checkbox-list');
const TextInput = require("ink-text-input");
const Spinner = require('ink-spinner');
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const Query = require('./query');
const base64 = require("base-64");

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

//TODO: reconstruct download directory

/*
  --\typename
      -- \program id
        -- \key
          -- *.json
*/

class DownloadAssets extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: null,
      assetNames: [],
      selectedFiles: [],
      submitted: false,
      downloadDone: false
    };

    this.handleListSubmission = this.handleListSubmission.bind(this);
    this.handleAllDone = this.handleAllDone.bind(this);
  }

  //download whole JSON
  async downloadData() {
    let assets;
    let names = [];

    let { domainname, tenant, filepath, auth } = this.props.options;

    try {
      assets = await Query({
        domain: domainname,
        tenant: tenant,
        authToken: auth
      }).getAssets();
    } catch (e) {
      console.error(e);
    }
    this.setState({
      data: assets.data.translatableAssets
    });
    assets.data.translatableAssets.forEach(asset => {
      const key = asset.__typename + " - " + asset.key;
      names = [...names, key];
    });
    this.setState({ assetNames: names });
  }

  componentWillMount() {
    this.downloadData();
  }

  componentWillUpdate() {
    if (this.state.downloadDone) {
      process.exit();
    }
  }

  handleListSubmission(list) {
    this.setState({
      selectedFiles: list,
      submitted: true
    });
  }

  handleAllDone() {
    this.setState({
      downloadDone: true
    });
  }

  render() {
    if (this.state.submitted) {
      return h(Downloading, {
        selectedFiles: this.state.selectedFiles,
        data: this.state.data, handleAllDone: this.handleAllDone,
        options: this.props.options
      });
    } else {
      return h(ListFile, {
        assetNames: this.state.assetNames,
        onListSubmitted: this.handleListSubmission
      });
    }
  }
}

class ListFile extends Component {
  constructor(props) {
    super(props);
    //this.handleSubmit = this.handleSubmit.bind(this);
  }

  //   handleSubmit(selectedList) {
  //     //download file for each element in list
  //     console.log(selectedList);
  //     process.exit(0);
  //   }

  render() {
    return h(
      "div",
      null,
      h(
        List,
        { onSubmit: list => this.props.onListSubmitted(list) },
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
      eachFileDone: {},
      allDone: false
    };

    this.handleDownloadDone = this.handleDownloadDone.bind(this);
  }

  handleDownloadDone(name) {
    this.setState(prevState => {
      let status = prevState.eachFileDone;
      if (status[name] !== undefined) {
        status[name] = true;
        let allFileChecked = true;
        Object.keys(status).forEach(k => {
          allFileChecked = allFileChecked && status[k];
        });
        return {
          eachFileDone: status,
          allDone: allFileChecked };
      }
    });
  }

  componentWillMount() {
    // set the list of download status track for each file
    this.dir = this.props.options.filepath;
    mkdirSync(this.dir);
    let status = {};
    this.props.data.map(asset => {
      status[asset.__typename] = false;
    });
    this.setState({
      eachFileDone: status
    });
  }

  componentDidUpdate() {
    if (this.state.allDone) {
      this.props.handleAllDone();
    }
  }

  render() {
    const downloadList = this.props.data.map(asset => {
      if (this.props.selectedFiles.includes(asset.__typename)) {
        if (this.state.eachFileDone[asset.__typename]) {
          return h(FinishCheckmark, { checkmark: this.handleDownloadDone, assetName: asset.__typename });
        } else {
          return h(DownloadEachFile, {
            name: asset.__typename,
            dir: this.dir,
            asset: asset,
            handleDownloadDone: this.handleDownloadDone
          });
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

  componentDidMount() {
    this.downloadFile();
  }

  downloadFile() {
    const asset = this.props.asset;

    if (asset.__typename === "TenantTheme") {
      this.downloadEachTranslation({ name: asset.__typename, data: JSON.stringify(asset.variables) });
      asset.translationInfo.translations.map(translation => {
        const transID = translation.id.split('/');
        mkdirSync();
        this.downloadEachTranslation({ name: transID[0] + '-' + transID[1], data: JSON.stringify(translation.content) });
      });
    } else {
      this.downloadEachTranslation({ name: asset.__typename, data: JSON.stringify(asset.values) });
    }
    //console.log(asset.variables);
  }

  //download file, indicator: spinner
  downloadEachTranslation({ name, data }) {
    const filePath = path.normalize(path.format({
      root: "/ignored",
      dir: this.props.dir,
      base: name
    })) + ".json";
    fs.open(filePath, "w+", (err, fd) => {
      if (err) {
        return console.error(err);
      }
      this.fd = fd;
      //@ts-ignore
      fs.write(fd, data, "utf8", () => {
        fs.close(fd, err => {
          if (err) {
            return console.error(err);
          }
          console.log(name + 'done');
          this.props.handleDownloadDone(name);
        });
      });
    });
  }

  // componentWillUnmount() {
  //   fs.close(this.fd, err => {
  //     if (err) {
  //       return console.error(err);
  //     }
  //   });
  // }

  render() {
    return h(
      "div",
      null,
      " ",
      h(Spinner, { green: true }),
      " Downloading ",
      this.props.name,
      " "
    );
  }
}

class FinishCheckmark extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.props.checkmark(this.props.assetName);
  }

  render() {
    return h(
      "div",
      null,
      " ",
      h(
        Color,
        { green: true },
        " \u2714 "
      ),
      " ",
      this.props.assetName,
      " downloaded",
      " "
    );
  }

}
const mkdirSync = path => {
  try {
    fs.mkdirSync(path);
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
};

module.exports = program => {
  let download = program.command("download");

  download.description("download an translation").option('-d,--domainname <domainname>', 'required - domain') //naming collision with domain, use domain name instead
  .option('-u,--authToken <authToken>', 'required - authToken') //the apiKey, use authToken to avoid naming collision
  .option("-t,--tenant <tenant>", "required - which tenant").option("-f,--filepath <filepath>", "required - the file path").action(options => {
    const newOptions = _extends({
      auth: base64.encode(":" + options.authToken)
    }, options);
    render(h(DownloadAssets, { options: newOptions }));
  });

  return download;
};