"use strict";

var path = require('path');
var grunt = require('grunt');
var js = require('../tasks/lib/javascript');
var css = require('../tasks/lib/css');

var config = {
	webroot: path.resolve('./test/out'),
	cwd: path.resolve('./test/out'),
	srcWebroot: path.resolve('./test'),
	minify: true,
	force: true
};

exports.testGrunt = {
	css: function(test) {
		var catalog = {};
		var files = grunt.task.normalizeMultiTaskFiles({
			src: ['test/css/*.css'],
			dest: 'test/out/css',
			expand: true,
			flatten: true
		});

		css.compile(files, config, catalog, {grunt: grunt, task: grunt.task});

		test.ok(Object.keys(catalog).length, 'CSS compiled successfully');
		test.ok('/css/test-utf.css' in catalog, 'Has test-utf.css');
		test.ok('/css/test.css' in catalog, 'Has test.css');

		test.done();
	},

	js: function(test) {
		var catalog = {};
		var files = grunt.task.normalizeMultiTaskFiles({
			files: {
				'test/out/js/f.js': [
					'test/js/file1.js',
					'test/js/file2.js'
				]
			}
		});


		js.compile(files, config, catalog, {grunt: grunt, task: grunt.task});

		test.ok(Object.keys(catalog).length, 'JS compiled successfully');
		test.ok('/js/f.js' in catalog, 'Has f.js');
		
		test.done();
	}
};