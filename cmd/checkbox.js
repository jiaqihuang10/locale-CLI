const { h, render, renderToString, Component } = require("ink");
const { List, ListItem } = require("./ink-checkbox");
const Spinner = require("ink-spinner");
const readline = require('readline');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
// const SampleData = require("./sampleData.json");
// const { ApolloClient } = require("apollo-client");
// const { ApolloLink } = require("apollo-link");
// const { HttpLink } = require("apollo-link-http");
// const { InMemoryCache } = require("apollo-cache-inmemory");
// const gql = require("graphql-tag");

// const domain = "https://staging.referralsaasquatch.com";
// const tenantAlias = "test_a5fr50mxaeltn";
// const authToken = "TEST_KHDCw9Ll4JJxa0OL1zKCVMouIbtF1BMX"; // username:password encoded in base64
// const headers = {
//   Authorization:
//     "Basic dGVzdF9hNWZyNTBteGFlbHRuOlRFU1RfS0hEQ3c5TGw0Skp4YTBPTDF6S0NWTW91SWJ0RjFCTVg=" //base64
// };
// const uri = domain + "/api/v1/" + tenantAlias + "/graphql";

// const client = new ApolloClient({
//   link: new HttpLink({ uri, headers }),
//   cache: new InMemoryCache()
// });

// function getLocales() {
//   return client.query({
//     query: gql`
//         translatableAssets {
//             translationInfo {
//             id
//             locales
//           }
//         }
//         `
//   });
// }

//   console.log(typeof res);

//   for (var transinfo in res) {
//     if (transinfo.key === "TenantTheme") {
//       return transinfo.locales;
//     }
//   }
// }

function sleeper(ms, value) {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

class NonInteractiveList extends Component {
  constructor() {
    super();

    this.state = {
      locales: ["ee", "bb", "pp"]
    };
  }

  async componentWillMount() {
    // Starting async load
    this.setState({ loading: true });

    const myDataBack = await sleeper(2000, ["en_US", "fr_FR"]);

    process.exit(0);
  }
  render() {
    return h(
      "div",
      null,
      h(
        List,
        {
          onSubmit: list => {
            console.log(list);
            process.exit(0);
          }
        },
        this.state.locales.map(l => h(
          ListItem,
          { value: l },
          l
        ))
      ),
      this.state.locales.map(l => h(
        "div",
        null,
        " ",
        h(Spinner, { green: true }),
        " ",
        l,
        " "
      ))
    );
  }
}

class Foo extends Component {
  render() {
    return h(
      "div",
      null,
      "Foo"
    );
  }
}

function Foo2(props) {
  return h(
    "div",
    null,
    "Foo"
  );
}

class DownloadTranslation extends Component {
  constructor() {
    super();

    this.state = {
      locales: null,
      loading: true
    };
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  async componentWillMount() {
    // Starting async load
    this.setState({ loading: true });

    const myDataBack = await sleeper(2000, ["en_US", "fr_FR"]);

    // Done async load
    this.setState({
      loading: false,
      locales: myDataBack
    });
  }

  handleSubmit(selected) {}

  renderItem(i) {
    return h(
      ListItem,
      { value: this.state.locales[i] },
      " ",
      this.state.locales[i],
      " "
    );
  }

  render() {
    if (this.state.loading) return "Loading..."; // TODO: Add progress bar or spinner
    return h(NonInteractiveList, { locales: this.state.locales });
  }
}

// console.log(renderToString(<DownloadTranslation />));
// console.log("Jiaqi is building a cool CLI!");
// console.log(renderToString(<NonInteractiveList locales={["jp_JP"]} />));
// console.log("CLI is done.");

render(h(NonInteractiveList, null));