const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const HOST = process.env.HOST || 'localhost';
const localConfigFileName = 'config.dev.json';
const MiniCssExtractPlugin = require('mini-css-extract-plugin');


// Two dev modes: local | remote
// local - auto authenticates as a fake user and uses a local
// json mock server as its host cluster. Intended for pure
// UI development without the need for e2e functionality
// remote - expects the user to provide a remote.config.json
// that contains an object with coordinates to a remote cluster
const devMode = process.env.DEVMODE || 'local';
if (devMode !== 'local' && devMode !== 'remote') {
  console.error(`Illegal DEVMODE: ${devMode}, must be 'local' or 'remote'`);
  process.exit(1);
}

const htmlWebpackPluginOpt = {
  template: `public/index.dev.html`,
  title: 'MIG UI',
  inject: 'body',
  favicon: 'public/favicon.ico',
};

const configPath = path.join(__dirname, localConfigFileName);
if (!fs.existsSync(configPath)) {
  console.error('ERROR: config/config.dev.json is missing');
  console.error(
    'Copy config/config.dev.json.example to config/config.dev.json' +
    ' and optionally configure your dev settings. A valid clusterUrl is ' +
    ' required for start:remote.'
  );
  process.exit(1);
}

const localConfig = require(configPath);
const startRemoteClientSecret = 'bWlncmF0aW9ucy5vcGVuc2hpZnQuaW8K';
const migMeta = require('./mig_meta')(localConfig.clusterApi);
migMeta.oauth = {
  clientId: localConfig.oauthClientId,
  redirectUri: localConfig.redirectUri,
  userScope: localConfig.userScope,
  clientSecret: startRemoteClientSecret,
};
migMeta.namespace = localConfig.namespace;
migMeta.configNamespace = localConfig.configNamespace;
migMeta.discoveryApi = localConfig.discoveryApi;

htmlWebpackPluginOpt.migMeta = Buffer.from(JSON.stringify(migMeta)).toString('base64');
const PORT = process.env.PORT || localConfig.devServerPort;

const plugins = [
  new webpack.NoEmitOnErrorsPlugin(),
  new webpack.NamedModulesPlugin(),
  new webpack.HotModuleReplacementPlugin(),
  new HtmlWebpackPlugin(htmlWebpackPluginOpt),
  new MiniCssExtractPlugin({
    filename: '[name].css',
    chunkFilename: '[id].css'
  })
];

// Replace the normal OAuth login component with a mocked out login for local dev
if (devMode === 'local') {
  plugins.push(
    new webpack.NormalModuleReplacementPlugin(/LoginComponent.tsx/, 'MockLoginComponent.tsx')
  );
  plugins.push(
    new webpack.NormalModuleReplacementPlugin(/client_factory.ts/, 'client_factory.mock.ts')
  );
}

const webpackConfig = {
  entry: {
    app: './src/index.tsx',
  },
  node: {
    fs: 'empty',
  },
  output: {
    path: __dirname + '../dist',
    filename: '[name].bundle.js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.scss'],
  },
  devtool: 'eval-cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.module\.s(a|c)ss$/,
        loader: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: true
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.s(a|c)ss$/,
        exclude: /\.module.(s(a|c)ss)$/,
        loader: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.css$/,
        include: [
          // path.resolve(__dirname, 'src'),
          path.resolve(__dirname, '../node_modules/'),
          path.resolve(__dirname, '../node_modules/patternfly'),
          path.resolve(__dirname, '../node_modules/@patternfly/patternfly'),
          path.resolve(__dirname, '../node_modules/@patternfly/react-styles/css'),
          path.resolve(__dirname, '../node_modules/@patternfly/react-core/dist/styles/base.css'),
          path.resolve(__dirname, '../node_modules/@patternfly/react-core/dist/esm/@patternfly/patternfly'),
          path.resolve(__dirname, '../node_modules/@patternfly/react-core/node_modules/@patternfly/react-styles/css'),
          path.resolve(__dirname, '../node_modules/@patternfly/react-table/node_modules/@patternfly/react-styles/css'),
          path.resolve(__dirname, '../node_modules/@patternfly/react-inline-edit-extension/node_modules/@patternfly/react-styles/css')
        ],
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(svg|ttf|eot|woff|woff2|png|jpg)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            // Limit at 50k. larger files emited into separate files
            limit: 5000,
          },
        },
      },
    ],
  },
  devServer: {
    host: HOST,
    port: PORT,
    compress: true,
    inline: true,
    historyApiFallback: true,
    hot: true,
    overlay: true,
    open: false,
    disableHostCheck: true,
    stats: {
      // interfaces and type aliases are not left after transpilation, causing
      // legitimate typescript exports to trigger warnings in webpack
      warningsFilter: /export .* was not found in/,
    },
  },
  plugins,
};

module.exports = webpackConfig;
