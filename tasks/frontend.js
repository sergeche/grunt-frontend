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

			var totalFiles = 0;
			env.task.files.forEach(function(f) {
				f.src.forEach(add);
				totalFiles += f.src.length;
			});
			env.grunt.log.writeln('Indexed ' + (totalFiles + env.grunt.util.pluralize(totalFiles, ' file/ files')).cyan);
		})
	);

	grunt.registerMultiTask('frontend-update', 'Updates catalog entries with given options', 
		factory(function(config, map, env) {
			var grunt = env.grunt;
			var task = env.task;
			var data = task.data;
			var _ = grunt.util._;

			if (!data.match) {
				grunt.fail.fatal('The "match" option should be specified');
			}

			var m = data.match;
			var files = [];
			task.files.forEach(function(f) {
				f.src.forEach(function(src) {
					src = utils.fileInfo(src, config);
					files.push({
						file: src.catalogPath,
						hash: src.hash,
						versioned: src.versionedUrl(config)
					});
				});
			});

			var matchFn = m instanceof RegExp 
				? function(key) {return m.test(key);}
				: function(key) {return key == m;}

			console.log(files);

			Object.keys(map).forEach(function(k) {
				if (matchFn(k)) {
					grunt.log.writeln('Updating ' + k.cyan);
					var _files = files;
					if (config.merge) {
						_files = (map[k].files || []).concat(_files);
					}

					map[k].files = _files;
				}
			});
		})
	);
};