module.exports = function(grunt) {
	"use strict";
	var js = require('./lib/javascript.js');
	var css = require('./lib/css.js');
	var utils = require('./lib/utils.js');
	var catalog = require('./lib/catalog.js');
	var readerConf = {encoding: null};

	function factory(fn) {
		return function() {
			var config = utils.config(grunt, this);
			var map = catalog.load();
			fn(config, map, {grunt: grunt, task: this});
			catalog.save(map);
		};
	}

	grunt.registerMultiTask('frontend-js', 'Concatenates and minifies JS files and stores all meta info in build catalog', 
		factory(function(config, map, env) {
			js.compile(env.task.files, config, map, env);
		})
	);

	grunt.registerMultiTask('frontend-css', 'Concatenates and minifies CSS files and stores all meta info in build catalog', 
		factory(function(config, map, env) {
			css.compile(env.task.files, config, map, env);
		})
	);

	grunt.registerMultiTask('frontend-index', 'Indexes all given files and saves their meta-data in build catalog', 
		factory(function(config, map, env) {
			var add = function(file) {
				file = utils.fileInfo(file, config);

				if (!(file.catalogPath in map)) {
					map[file.catalogPath] = {};
				}

				var obj = map[file.catalogPath];
				obj.hash = file.hash;
				obj.versioned = file.versionedUrl(config);
			};

			env.task.files.forEach(function(f) {
				f.src.forEach(add);
			});
		})
	);
};