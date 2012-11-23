"use strict";

var path = require('path');
var csso = require('csso');
var grunt = require('grunt');
var compileCSSFile = require('../lib/css').compileCSSFile;

function pathResolver(file, originalFile) {
	var dirname = originalFile ? path.dirname(originalFile) : __dirname;
	if (file.charAt(0) == '/') {
		// resolve absolute file include
		file = file.replace(/^\/+/, '');
		dirname = __dirname;
	}
	return path.resolve(dirname, file);
}

exports.cssCompiler = function(test) {
	var compiledCSS = compileCSSFile(pathResolver('css/test.css'), pathResolver);
	test.ok(compiledCSS.length > 0, 'Got compiled CSS');
	test.ok(!/@import/.test(compiledCSS), 'No imports');

	test.done();
};

var config = {
	webroot: path.join(__dirname, 'out'),
	srcWebroot: __dirname
};

exports.testGrunt = {
	css: function(test) {
		var payload = {
			src: pathResolver('css'),
			dest: pathResolver('out/css')
		};
		var catalog = grunt.helper('frontend-css', payload, config);

		test.ok(catalog, 'CSS compiled successfully');
		test.ok('/css/test-utf.css' in catalog, 'Has test-utf.css');
		test.ok('/css/test.css' in catalog, 'Has test.css');

		test.done();
	},

	js: function(test) {
		var payload = {
			'test/out/js/f.js': [
				'js/file1.js',
				'js/file2.js'
			]
		};
		var catalog = grunt.helper('frontend-js', payload, config);

		test.ok(catalog, 'JS compiled successfully');
		test.ok('/js/f.js' in catalog, 'Has f.js');
		
		test.done();
	}
};