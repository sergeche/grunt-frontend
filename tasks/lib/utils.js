var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var crc32 = require('./crc32');
var _ = require('underscore');
var filter = require('./hash-filter');

function padNumber(num) {
	return (num < 10 ? '0' : '') + num;
}

function FileInfo(file, options) {
	this._path = file;
	this.absPath = module.exports.absPath(file, options.cwd);
	this.catalogPath = module.exports.catalogPath(file, options);
	this._hash = null;
	this._content = null;
	this._options = options || {};
}

FileInfo._readerOptions = {encoding: null};

FileInfo.prototype = {
	get content() {
		if (this._content === null) {
			if (fs.existsSync(this.absPath)) {
				this._content = fs.readFileSync(this.absPath, FileInfo._readerOptions);
			} else if (this._options.content) {
				this._content = this._options.content;
			}
		}

		return this._content;
	},

	set content(value) {
		this._content = value;
		this._hash = null;
	},

	get hash() {
		if (this._hash === null && this.content !== null) {
			this._hash = filter(module.exports.crc32(this.content));
		}

		return this._hash;
	},

	versionedUrl: function(config) {
		return module.exports.versionedUrl(this.catalogPath, this.hash, config);
	}
};

module.exports = {
	/**
	 * Returns string timestamp of given date in "yyyymmddhhss" format
	 * @param  {Date} dt Source date. If not specified, current date is used
	 * @return {String}
	 */
	timestamp: function(dt) {
		dt = dt || new Date();
		return [dt.getFullYear(),
			padNumber(dt.getMonth() + 1),
			padNumber(dt.getDate()),
			padNumber(dt.getHours()),
			padNumber(dt.getMinutes()),
			padNumber(dt.getSeconds())
		].join('');
	},

	/**
	 * Returns md5 hash of given content
	 * @param  {Buffer} content
	 * @return {String}
	 */
	md5: function(content) {
		return crypto.createHash('md5').update(content).digest('');
	},

	/**
	 * Returns crc32 stamp from given content
	 * @param  {Buffer} content
	 * @return {String}
	 */
	crc32: function(content) {
		return crc32(content, true);
	},

	/**
	 * Return absolute path to given file
	 * @param  {String} file File path to transform
	 * @return {String}
	 */
	absPath: function(file) {
		return path.resolve(file);
	},

	/**
	 * Returns file path suitable for storing in catalog
	 * @param  {String} file   File path
	 * @param  {Object} options Options for transforming path
	 * @return {String}
	 */
	catalogPath: function(file, options) {
		file = this.absPath(file);
		var cwd = (options && options.cwd) || '';
		if (file.substring(0, cwd.length) == cwd) {
			file = file.substring(cwd.length);
			if (file.charAt(0) != '/') {
				file = '/' + file;
			}
		}

		return file;
	},

	/**
	 * Returns object with files‘ meta info 
	 * @param  {String} file
	 * @param  {Object} 
	 * @return {FileInfo}
	 */
	fileInfo: function(file, options) {
		return new FileInfo(file, options);
	},

	/**
	 * Returns config for currently running grunt task
	 * @param  {Object} grunt
	 * @param  {Object} task
	 * @return {Object}
	 */
	config: function(grunt, task) {
		var config = task.options(grunt.config.getRaw('frontend') || {});
		if (!config.webroot) {
			return grunt.fail.fatal('You should specify "webroot" property in frontend config', 100);
		}

		var cwd = this.absPath(config.cwd || config.webroot);
		var force = false;
		if ('force' in config) {
			force = !!config.force;
		}

		return grunt.util._.extend(config, {
			force: force,
			cwd: this.absPath(config.cwd || config.webroot),
			webroot: this.absPath(config.webroot),
			srcWebroot: this.absPath(config.srcWebroot || config.webroot)
		});
	},

	/**
	 * Creates versioned URL from original one
	 * @param  {String} url     Original URL
	 * @param  {String} version Cache-busting token
	 * @param  {Object} config  
	 * @return {String}
	 */
	versionedUrl: function(url, version, config) {
		if (!config.rewriteScheme) {
			return url;
		}

		var basename = path.basename(url);
		var ext = path.extname(url).substr(1);
		var filename = basename.replace(new RegExp('\\.' + ext + '$'), '');

		var data = {
			url: url,
			dirname: path.dirname(url),
			basename: basename,
			ext: ext,
			filename: filename,
			version: version
		};

		if (typeof config.rewriteScheme == 'string') {
			return _.template(config.rewriteScheme, data);
		}

		return config.rewriteScheme(data);
	}
};