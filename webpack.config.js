const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	entry: './src/index.js',
	output: {
		filename: 'index.js',
		path: path.resolve(__dirname, 'dist'),
  	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: "public"
				},

			]
		}),
	],
	mode: 'development'
};