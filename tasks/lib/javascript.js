var fs = require('fs');
var utils = require('./utils');
var catalog = require('./catalog');
var uglify = require('uglify-js');

function shouldProcess(dest, deps, config, catalog) {
	if (config.force || !(dest.catalogPath in catalog) || !fs.existsSync(dest.absPath)) {
		return true;
	}

	// compare list lengths, file order and hash of source files
	var prevList = catalog[dest.catalogPath].files;
	if (prevList.length !== deps.length) {
		return true;
	}

	// compare lib content and file order
	for (var i = 0, il = deps.length, prev; i < il; i++) {
		prev = prevList[i];
		if (prev.file !== deps[i].catalogPath || prev.hash !== deps[i].hash) {
			return true;
		}
	}
	
	return false;
}

function validFiles(files, grunt, config) {
	var options = {cwd: config.srcWebroot};
	return files.filter(function(filepath) {
			// Warn on and remove invalid source files
			var exists = grunt.file.exists(filepath);
			if (!exists) {
				grunt.log.warn('Source file ' + filepath.red + ' not found.');
			}

			return exists;
		})
		.map(function(f) {
			return utils.fileInfo(f, options);
		});
}

module.exports = {
	/**
	 * Returns config for UglifyJS
	 * @param {Objecy} config Current config
	 * @param {Objecy} env    Task environment (`grunt` and `task` properties)
	 * @return {Object}
	 */
	uglifyConfig: function(config, env) {
		return env.grunt.util._.extend({
			banner: '',
			compress: {
				warnings: false
			},
			mangle: {},
			beautify: false,
			report: false
		}, env.task.options(config.uglify || {}));
	},

	/**
	 * Processes given JS files
	 * @param  {Array} files    Normalized Grunt task file list
	 * @param  {Object} config  Current task config
	 * @param  {Object} catalog Output catalog
	 * @param  {Object} env     Task environment (`grunt` and `task` properties)
	 * @return {Object}         Updated catalog
	 */
	compile: function(files, config, catalog, env) {
		var uglifyConfig = this.uglifyConfig(config, env);
		var grunt = env.grunt;
		var _ = grunt.util._;

		files.forEach(function(f) {
			var src = validFiles(f.src, grunt, config);
			var dest = utils.fileInfo(f.dest, config);
			grunt.log.write('Processing ' + dest.catalogPath.cyan);

			// check if current file should be compiled
			if (!shouldProcess(dest, src, config, catalog)) {
				grunt.log.writeln(' [skip]'.grey);
				return false;
			}

			grunt.verbose.writeln('');
			if (config.minify) {
				grunt.verbose.writeln('Minifying JS files');
				var uglified = uglify.minify(_.pluck(src, '_path'), dest.absPath, uglifyConfig);
				dest.content = uglified.code;
			} else {
				dest.content = _.pluck(src, '_path')
					.map(function(src) {
						return grunt.file.read(src);
					})
					.join('');
			}

			if (config.postProcess) {
				dest.content = config.postProcess(dest.content, dest);
			}

			grunt.file.write(dest.absPath, dest.content);

			// Otherwise, print a success message....
			grunt.log.writeln(' [save]'.green);

			// update catalog entry
			catalog[dest.catalogPath] = {
				hash: dest.hash,
				date: utils.timestamp(),
				versioned: dest.versionedUrl(config),
				files: src.map(function(f) {
					return {
						file: f.catalogPath,
						hash: f.hash,
						versioned: f.versionedUrl(config)
					};
				}, this)
			};
		});

		return catalog;
	}
};