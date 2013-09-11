A [Grunt.js](http://gruntjs.com) task that compiles CSS and JS files with respect of _file modification_ date. For JS, it uses built-in [UglifyJS](https://github.com/mishoo/UglifyJS) minifier, for CSS — Yandex’s [CSSO](https://github.com/css/csso) with automatic `@import` inlining and `url()` rewriting.

Unlike basic minifiers, this task generates a hidden catalog file (`.build-catalog.json`) that stores state, last compilation date and checksum of minified files. Every time you call `frontend-*` task, it will look into this catalog and check if the state of files being minified was changed. If not, the file _will not_ be re-minified which saves CPU time and _modification date_. This date (or checksum hash) can be used to modify URLs to minified files for effective caching.

## Usage ##

This plugin provides `frontend-js`, `frontend-css` and `frontend-index` multi-tasks. Global config can be defined in `frontend` key. All tasks are [file-based](http://gruntjs.com/configuring-tasks#files). Here’s example `Gruntfile.js`:

```js
module.exports = function(grunt) {
    grunt.initConfig({
    	// Global config for each frontend-* task. These values can
    	// be overridden in `options` key of each task
    	frontent: {
    		// Force file minification even if they were not modified
           force: false,
        
           // Path to project sources root folder.
           // It is used to resolve absolute paths in CSS imports,
           // for example: @import "/css/file.css" will be resolved 
           // to './src/files/css/file.css'
           srcWebroot: './src/files',

           // Destination root folder.
           // Used to update minified files paths in catalog,
           // e.g. instead of storing '/Users/foo/project/out/css/minified.css' path, 
           // task will cut-out path to webroot and store '/css/minified.css' instead
           webroot: './out',
           
           // A scheme for creating versioned URLs. Versioned URLs
           // can are stored in catalog and used to rewrite paths 
           // for `url()` values of CSS.
           // Can be a string or a function.
           // A string is a template with the following placeholders:
           // * version: version tag (in most cases it’s CRC32 of file)
           // * url: absolute URL, e.g. `/path/to/file.css`
           // * dirname: absolute path to file’s directory, e.g. `/path/to/`
           // * basename: file’s full name, e.g. `file.css`
           // * filename: name of file, e.g. `file`
           // * ext: file’s extension, e.g. `css`
           rewriteScheme: '/-/<%= version %><%= url %>',
           
           // function to post-process file’s content before it will be
           // saved to disk
           postProcess: function(content, fileInfo) {}
    	},
    	
    	// Task for concatenating and minifying JS files
        'frontend-js': {
            main: {
                // task options
                options: {
                    // Minify JS
                    minify: true,
                    
                    // config for UglifyJS
                    uglify: {}
                },
                
                files: {
					'out/js/f.js': [
						'test/js/file1.js',
						'test/js/file2.js'
					]
				}
            }
        },
        
        // Task for concatenating and minifying CSS files
        'frontend-css': {
        	main: {
	        	options: {
	        		// inline @imports
	        		inline: true,
	        		
	        		// rewrite all url() to versioned ones.
	        		// the `rewriteScheme` is used to create versioned URL
	        		rewriteUrl: true,
	        		
	        		// minify CSS
	        		minify: true
	        	},
	        	files: [
					{src: 'test/css/*.css', dest: 'out/css'}
				]
        	}
        },
        
        // Task fo indexing files and storing its’ version hash
        // and verioned URL in catalog. Useful for fast lookups of 
        // versioned files
        'frontend-index': {
        	main: {
				files: [{src: 'test/css/**/*.{css,jpg,png}'}]
			}
        }
    });
};
```

This task can be used together with [docpad-plugin-frontend](https://github.com/sergeche/docpad-plugin-frontend) to automatically generate cache-effective URLs to assets for [DocPad](https://github.com/bevry/docpad)-generated web-site.
