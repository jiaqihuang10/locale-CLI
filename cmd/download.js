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
const mkdirp = require('mkdirp');
const util = require('util');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
const fs_writeFile = util.promisify(fs.writeFile);

//TODO: reconstruct download directory

/*
  - assets 
    - TenantTheme/
      - TenantTheme.json
      - translations/
        - de_DE.json
        - ja_JP.json
    - Program 1/
      - Emails/
        - ReferralStarted/
          - de_DE.json
          - ja_JP.json
        - ReferralCompleted/
        - ReferralStarted.json
        - ReferralCompleted.json
      - Widgets/
        - referrerWidget/
        - referredWidget/
      - Messaging/
        - default/
    - Program 2/
*/

class DownloadAssets extends Component {
  constructor(props) {
    super(props);

    this.state = {
      tenantThemeData: null,
      programList: null,
      programMap: null,
      itemList: null,
      selectedItem: [],
      submitted: false,
      downloadDone: false
    };

    this.handleListSubmission = this.handleListSubmission.bind(this);
    this.handleAllDone = this.handleAllDone.bind(this);
  }

  async downloadData() {
    let assets, programData, TenantTheme;
    let listItem = [];
    let progMap = {};
    let { domainname, tenant, filepath, auth } = this.props.options;

    //get Tenant Theme
    try {
      assets = await Query({
        domain: domainname,
        tenant: tenant,
        authToken: auth
      }).getAssets();

      assets.data.translatableAssets.forEach(asset => {
        const typename = asset.__typename;
        let itemStr = '';
        if (typename === 'TenantTheme') {
          this.setState({
            tenantThemeData: asset
          });
          listItem.push("TenantTheme");
        }
      });
    } catch (e) {
      console.error(e);
    }

    // list available programs - {name:id} key-value pairs
    try {
      programData = await Query({
        domain: domainname,
        tenant: tenant,
        authToken: auth
      }).listPrograms();
    } catch (e) {
      console.error(e);
    }

    programData.data.programs.data.forEach(program => {
      const programName = program.name.trim();
      listItem.push(programName);
      progMap[programName] = program.id;
    });

    this.setState({
      programList: programData.data.programs,
      programMap: progMap,
      itemList: listItem
    });
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
      selectedItem: list,
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
        selectedItem: this.state.selectedItem,
        programList: this.state.programList,
        programMap: this.state.programMap,
        tenantThemeData: this.state.tenantThemeData,
        handleAllDone: this.handleAllDone,
        options: this.props.options
      });
    } else {
      if (this.state.itemList) {
        return h(ListFile, {
          itemList: this.state.itemList,
          onListSubmitted: this.handleListSubmission
        });
      }
    }
  }
}

class ListFile extends Component {
  constructor(props) {
    super(props);
    //this.handleSubmit = this.handleSubmit.bind(this);
  }

  render() {
    return h(
      "div",
      null,
      h(
        List,
        { onSubmit: list => this.props.onListSubmitted(list) },
        this.props.itemList.map(l => h(
          ListItem,
          { value: l },
          l
        ))
      )
    );
  }
}

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

  /************************************** */
  //mkdir recursively
  componentWillMount() {
    // set the list of download status track for each file
    this.dir = this.props.options.filepath;
    //mkdirSync(this.dir);
    let status = {};
    this.props.selectedItem.map(item => {
      status[item] = false;
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
    const downloadList = this.props.selectedItem.map(item => {
      if (this.state.eachFileDone[item]) {
        return h(FinishCheckmark, { name: item });
      } else {
        return h(DownloadEachFile, { dir: this.dir,
          name: item,
          programMap: this.props.programMap,
          tenantThemeData: this.props.tenantThemeData,
          handleDownloadDone: this.handleDownloadDone,
          options: this.props.options
        });
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

  async download() {
    const { domainname, tenant, auth } = this.props.options;
    let programData = null;

    if (this.props.name === 'TenantTheme') {
      const path = this.props.dir + '/TenantTheme';
      mkdirp.sync(path);
      //write default - in root asset folder
      await this.writeFile({ data: JSON.stringify(this.props.tenantThemeData.variables), dir: this.props.dir, name: 'TenantTheme' });
      //write translations - in 'TenantTheme' folder
      const translations = this.props.tenantThemeData.translationInfo.translations;
      for (var i = 0; i < translations.length; i++) {
        await this.writeFile({ data: JSON.stringify(translations[i].content), dir: path, name: translations[i].locale });
      }
      //handle tenantTheme done
      this.props.handleDownloadDone(this.props.name);
    } else {
      //per program
      const programId = this.props.programMap[this.props.name];
      try {
        const receivedData = await Query({
          domain: domainname,
          tenant: tenant,
          authToken: auth
        }).getProgramData(programId);
        programData = receivedData.data.program;
      } catch (e) {
        console.error(e);
        process.exit(1);
      }
      const programRootPath = this.props.dir + '/' + this.props.name;
      mkdirp.sync(programRootPath);
      //put default in root folder of each program
      const assets = programData.translatableAssets;

      for (var i = 0; i < assets.length; i++) {
        const assetData = assets[i];
        const path = programRootPath + '/' + assetData.__typename;
        mkdirp.sync(path);
        //write default
        if (assetData.__typename === 'ProgramLinkConfig') {
          await this.writeFile({ data: JSON.stringify(assetData.messaging), dir: path, name: 'default' });
          const transPath = path + '/default';
          this.writeTranslation(transPath, assetData);
        } else {
          await this.writeFile({ data: JSON.stringify(assetData.values), dir: path, name: assetData.key });
          //write translations
          const transPath = path + '/' + assetData.key;
          this.writeTranslation(transPath, assetData);
        }
      }
    }
    this.props.handleDownloadDone(this.props.name);
  }

  async writeTranslation(transPath, assetData) {
    const translations = assetData.translationInfo.translations;
    mkdirp.sync(transPath);
    for (var i = 0; i < translations.length; i++) {
      await this.writeFile({ data: JSON.stringify(translations[i].content), dir: transPath, name: translations[i].locale });
    }
  }

  writeFile({ data, dir, name }) {
    const filePath = path.normalize(path.format({
      root: "/ignored",
      dir: dir,
      base: name
    })) + ".json";

    return fs_writeFile(filePath, data, { encoding: 'utf8' });
  }

  componentDidMount() {
    this.download();
  }

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

  render() {
    return h(
      "div",
      null,
      h(
        Color,
        { green: true },
        " \u2714 "
      ),
      " ",
      this.props.name,
      " translations downloaded"
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