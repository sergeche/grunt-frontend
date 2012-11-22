"use strict";

var path = require('path');
var csso = require('csso');
var compileCSSFile = require('../lib/css').compileCSSFile;

exports.cssCompiler = function(test) {
	var pathResolver = function(file, originalFile) {
		var dirname = originalFile ? path.dirname(originalFile) : __dirname;
		if (file.charAt(0) == '/') {
			// resolve absolute file include
			file = file.replace(/^\/+/, '');
			dirname = __dirname;
		}
		return path.resolve(dirname, file);
	};

	var compiledCSS = compileCSSFile(pathResolver('css/test.css'), pathResolver);
	test.ok(compiledCSS.length > 0, 'Got compiled CSS');
	test.ok(!/@import/.test(compiledCSS), 'No imports');

	test.done();
};
