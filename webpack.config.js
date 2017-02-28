var path = require("path");
var webpack = require("webpack");

module.exports = {
	entry: [
		'./index'
	],
	output: {
		path: path.resolve('./bundles/'),
		filename: "bundles.js",
		library: 'Contract'
	},
	module: {
		loaders: [
			{
				test: /\.json$/,
				loaders: ['json']
			},
			{
				test: /\.js$/,
				loaders: ['babel'],
				exclude: /node_modules/,
				include: __dirname
			}
		]
	},
	plugins: []
};
